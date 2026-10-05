// app/api/max/webhook/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import https from "node:https";

const MAX_TOKEN = process.env.MAX_BOT_TOKEN!;
const MAX_API = "https://platform-api.max.ru";

// Сервер MAX использует сертификат, подписанный Минцифры России — он не входит
// в стандартный список доверенных сертификатов на серверах Vercel. Поэтому для
// запросов именно к MAX API отключаем строгую проверку цепочки сертификата.
// Остальные соединения (Supabase, amoCRM) проверяются как обычно.
function maxApiRequest(
  path: string,
  body: Record<string, unknown>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${MAX_API}${path}`);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Authorization: MAX_TOKEN,
          "Content-Type": "application/json",
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — пишем из серверного кода
);

// ---------- Вопросы и варианты ответов ----------

const QUESTIONS = {
  q1: {
    title: "Сумма долга",
    text: "Подскажите, пожалуйста, примерную сумму Вашей задолженности?",
    options: [
      ["До 300 000 ₽", "q1_300k"],
      ["300 000–500 000 ₽", "q1_500k"],
      ["500 000–1 000 000 ₽", "q1_1m"],
      ["Более 1 000 000 ₽", "q1_more"],
    ],
  },
  q2: {
    title: "Кредиторы",
    text: "Перед кем числится долг?",
    options: [
      ["Банки", "q2_banks"],
      ["МФО", "q2_mfo"],
      ["Налоговая / ЖКХ", "q2_tax"],
      ["Несколько вариантов", "q2_mixed"],
    ],
  },
  q3: {
    title: "Ситуация с долгом",
    text: "Есть ли сейчас просрочки, суды или исполнительные производства?",
    options: [
      ["Да, уже есть суды/приставы", "q3_court"],
      ["Просрочки есть, судов пока нет", "q3_overdue"],
      ["Плачу, но тяжело", "q3_paying"],
      ["Хочу узнать заранее, до просрочек", "q3_early"],
    ],
  },
  q4: {
    title: "Доход и имущество",
    text: "Есть ли у Вас официальный доход и имущество (квартира, машина) в собственности?",
    options: [
      ["Да", "q4_yes"],
      ["Нет", "q4_no"],
      ["Частично", "q4_partial"],
    ],
  },
} as const;

type QuestionKey = keyof typeof QUESTIONS;

// payload кнопки -> читаемый текст ответа
const LABELS: Record<string, string> = {};
for (const q of Object.values(QUESTIONS)) {
  for (const [label, payload] of q.options) {
    LABELS[payload] = label;
  }
}

const STEP_ORDER = ["q1", "q2", "q3", "q4", "phone", "done"] as const;

function nextStep(step: string): string {
  const idx = STEP_ORDER.indexOf(step as any);
  return STEP_ORDER[idx + 1] ?? "done";
}

// ---------- Отправка сообщений в MAX ----------

async function sendMessage(
  chatId: number,
  text: string,
  keyboard?: { text: string; payload: string }[][]
) {
  const attachments = keyboard
    ? [
        {
          type: "inline_keyboard",
          payload: {
            buttons: keyboard.map((row) =>
              row.map((btn) => ({
                type: "callback",
                text: btn.text,
                payload: btn.payload,
              }))
            ),
          },
        },
      ]
    : undefined;

  await maxApiRequest(`/messages?chat_id=${chatId}`, { text, attachments });
}

async function askQuestion(chatId: number, step: QuestionKey) {
  const q = QUESTIONS[step];
  await sendMessage(
    chatId,
    q.text,
    q.options.map(([text, payload]) => [{ text, payload }])
  );
}

async function askPhone(chatId: number) {
  await sendMessage(
    chatId,
    "Спасибо! Напишите, пожалуйста, Ваш номер телефона сообщением в чате — например, +7 900 123-45-67."
  );
}

// Заменяет сообщение с вопросом: оставляет только выбранный ответ, кнопки убирает
async function showChosenAnswer(
  callbackId: string,
  step: QuestionKey,
  label: string
) {
  const res = await maxApiRequest(
    `/answers?callback_id=${encodeURIComponent(callbackId)}`,
    {
      callback_id: callbackId,
      message: {
        text: `${QUESTIONS[step].text}\n\n✅ ${label}`,
        attachments: [],
      },
    }
  );
  if (res && typeof res === "object" && (res.code || res.success === false)) {
    console.error("MAX /answers error:", JSON.stringify(res));
  }
}

// ---------- Телефон ----------

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    return "+7" + digits.slice(1);
  }
  if (digits.length === 10) {
    return "+7" + digits;
  }
  return null;
}

// ---------- amoCRM ----------

function formatAnswers(answers: Record<string, string>): string {
  const lines: string[] = [];
  (Object.keys(QUESTIONS) as QuestionKey[]).forEach((key, i) => {
    const payload = answers[key];
    lines.push(
      `${i + 1}. ${QUESTIONS[key].title}: ${
        payload ? LABELS[payload] ?? payload : "—"
      }`
    );
  });
  return lines.join("\n");
}

async function createAmoLead(opts: {
  name: string;
  phone: string;
  chatId: number;
  userId?: number;
  answers: Record<string, string>;
}) {
  const rawDomain = process.env.AMO_DOMAIN;
  const token = process.env.AMO_TOKEN;
  if (!rawDomain || !token) {
    console.error("AMO_DOMAIN / AMO_TOKEN не заданы — заявка в amoCRM не создана");
    return;
  }
  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const lead: Record<string, unknown> = {
    name: "Заявка из MAX-бота",
    _embedded: {
      contacts: [
        {
          first_name: opts.name || "Клиент из MAX",
          custom_fields_values: [
            {
              field_code: "PHONE",
              values: [{ value: opts.phone, enum_code: "WORK" }],
            },
          ],
        },
      ],
      tags: [{ name: "MAX-бот" }],
    },
  };
  if (process.env.AMO_PIPELINE_ID) {
    lead.pipeline_id = Number(process.env.AMO_PIPELINE_ID);
  }
  if (process.env.AMO_STATUS_ID) {
    lead.status_id = Number(process.env.AMO_STATUS_ID);
  }

  const res = await fetch(`https://${domain}/api/v4/leads/complex`, {
    method: "POST",
    headers,
    body: JSON.stringify([lead]),
  });
  const data: any = await res.json().catch(() => null);
  const leadId = Array.isArray(data) ? data[0]?.id : undefined;

  if (!res.ok || !leadId) {
    console.error("amoCRM: сделка не создана", res.status, JSON.stringify(data));
    return;
  }

  const noteText = [
    "Заявка из MAX-бота",
    "",
    formatAnswers(opts.answers),
    "",
    `Телефон: ${opts.phone}`,
    `MAX: chat_id ${opts.chatId}${opts.userId ? `, user_id ${opts.userId}` : ""}`,
  ].join("\n");

  const noteRes = await fetch(`https://${domain}/api/v4/leads/${leadId}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify([{ note_type: "common", params: { text: noteText } }]),
  });
  if (!noteRes.ok) {
    console.error("amoCRM: примечание не добавлено", noteRes.status);
  }
}

// ---------- Уведомление менеджеру (необязательно) ----------

async function notifyManager(
  chatId: number,
  answers: Record<string, string>,
  phone: string
) {
  const managerChatId = process.env.MAX_MANAGER_CHAT_ID;
  if (!managerChatId) return;

  const summary = [
    `🆕 Новая заявка (chat_id: ${chatId})`,
    formatAnswers(answers),
    `Телефон: ${phone}`,
  ].join("\n");

  await sendMessage(Number(managerChatId), summary);
}

// ---------- Основной обработчик ----------

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("MAX update:", body?.update_type);

  try {
    return await handleUpdate(body);
  } catch (e: any) {
    console.error("MAX webhook error:", e?.message, e?.stack);
    return NextResponse.json({ ok: true }); // всегда 200, чтобы MAX не ретраил бесконечно
  }
}

async function startConversation(chatId: number, userId?: number) {
  const { error: upsertError } = await supabase
    .from("max_conversations")
    .upsert(
      {
        chat_id: chatId,
        user_id: userId,
        current_step: "q1",
        status: "bot",
        answers: {},
        phone: null,
      },
      { onConflict: "chat_id" }
    );

  if (upsertError) {
    console.error("Supabase upsert error (startConversation):", upsertError);
  }

  await sendMessage(
    chatId,
    "Здравствуйте! 👋 Я бот-помощник по вопросам списания долгов и банкротства. Задам несколько вопросов, чтобы разобраться в Вашей ситуации, и передам диалог специалисту для бесплатной консультации."
  );
  await askQuestion(chatId, "q1");
}

async function handleUpdate(body: any) {
  // --- Пользователь запустил бота (MAX шлёт это только при самом первом запуске) ---
  if (body.update_type === "bot_started") {
    await startConversation(body.chat_id, body.user?.user_id);
    return NextResponse.json({ ok: true });
  }

  // --- Нажатие кнопки ---
  if (body.update_type === "message_callback") {
    const chatId =
      body.message?.recipient?.chat_id ?? body.callback?.user?.user_id;
    const payload: string | undefined = body.callback?.payload;
    const callbackId: string | undefined = body.callback?.callback_id;

    if (!chatId || !payload || !callbackId) {
      return NextResponse.json({ ok: true });
    }

    const { data: conv } = await supabase
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!conv || conv.status !== "bot") {
      return NextResponse.json({ ok: true });
    }

    const step: string = conv.current_step;

    // Кнопка от старого вопроса или повторное нажатие — игнорируем
    if (!(step in QUESTIONS) || !payload.startsWith(`${step}_`)) {
      return NextResponse.json({ ok: true });
    }

    const updatedAnswers = { ...conv.answers, [step]: payload };
    const next = nextStep(step);

    // Обновляем только если шаг ещё не сменился — защита от двойной обработки
    const { data: updated } = await supabase
      .from("max_conversations")
      .update({ current_step: next, answers: updatedAnswers })
      .eq("chat_id", chatId)
      .eq("current_step", step)
      .select();

    if (!updated || updated.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // В сообщении с вопросом оставляем только выбранный ответ
    await showChosenAnswer(
      callbackId,
      step as QuestionKey,
      LABELS[payload] ?? payload
    );

    if (next === "phone") {
      await askPhone(chatId);
    } else if (next in QUESTIONS) {
      await askQuestion(chatId, next as QuestionKey);
    }

    return NextResponse.json({ ok: true });
  }

  // --- Обычное сообщение (в том числе номер телефона текстом) ---
  if (body.update_type === "message_created") {
    const chatId = body.message?.recipient?.chat_id;
    if (!chatId || body.message?.sender?.is_bot) {
      return NextResponse.json({ ok: true });
    }
    const text: string = (body.message?.body?.text ?? "").trim();

    const { data: conv } = await supabase
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    // Записи нет — запускаем сценарий с начала
    if (!conv) {
      await startConversation(chatId, body.message?.sender?.user_id);
      return NextResponse.json({ ok: true });
    }

    // Ждём телефон — человек пишет его сам
    if (conv.status === "bot" && conv.current_step === "phone") {
      const phone = normalizePhone(text);

      if (!phone) {
        await sendMessage(
          chatId,
          "Не получилось распознать номер. Напишите, пожалуйста, в формате +7 900 123-45-67."
        );
        return NextResponse.json({ ok: true });
      }

      const { data: updated } = await supabase
        .from("max_conversations")
        .update({ phone, current_step: "done", status: "waiting_manager" })
        .eq("chat_id", chatId)
        .eq("current_step", "phone")
        .select();

      if (!updated || updated.length === 0) {
        return NextResponse.json({ ok: true });
      }

      await sendMessage(
        chatId,
        "Спасибо! Ваша заявка принята ✅ В ближайшее время с Вами свяжется наш специалист прямо здесь, в этом чате."
      );

      try {
        await createAmoLead({
          name: body.message?.sender?.name ?? "",
          phone,
          chatId,
          userId: body.message?.sender?.user_id,
          answers: conv.answers,
        });
      } catch (e: any) {
        console.error("amoCRM error:", e?.message);
      }

      try {
        await notifyManager(chatId, conv.answers, phone);
      } catch (e: any) {
        console.error("notifyManager error:", e?.message);
      }
    }

    // Если диалог уже у менеджера — бот молчит
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}