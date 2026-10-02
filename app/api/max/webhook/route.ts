// app/api/max/webhook/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import https from "node:https";

const MAX_TOKEN = process.env.MAX_BOT_TOKEN!;
const MAX_API = "https://platform-api.max.ru";

// Сервер MAX использует сертификат, подписанный Минцифры России — он не входит
// в стандартный список доверенных сертификатов на серверах Vercel (которые
// физически находятся не в России). Поэтому для запросов именно к MAX API
// отключаем строгую проверку цепочки сертификата. Это НЕ затрагивает остальные
// соединения (Supabase и т.д.) — они по-прежнему проверяются как обычно.
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
    text: "Подскажите, пожалуйста, примерную сумму Вашей задолженности?",
    options: [
      ["До 300 000 ₽", "q1_300k"],
      ["300 000–500 000 ₽", "q1_500k"],
      ["500 000–1 000 000 ₽", "q1_1m"],
      ["Более 1 000 000 ₽", "q1_more"],
    ],
  },
  q2: {
    text: "Перед кем числится долг?",
    options: [
      ["Банки", "q2_banks"],
      ["МФО", "q2_mfo"],
      ["Налоговая / ЖКХ", "q2_tax"],
      ["Несколько вариантов", "q2_mixed"],
    ],
  },
  q3: {
    text: "Есть ли сейчас просрочки, суды или исполнительные производства?",
    options: [
      ["Да, уже есть суды/приставы", "q3_court"],
      ["Просрочки есть, судов пока нет", "q3_overdue"],
      ["Плачу, но тяжело", "q3_paying"],
      ["Хочу узнать заранее, до просрочек", "q3_early"],
    ],
  },
  q4: {
    text: "Есть ли у Вас официальный доход и имущество (квартира, машина) в собственности?",
    options: [
      ["Да", "q4_yes"],
      ["Нет", "q4_no"],
      ["Частично", "q4_partial"],
    ],
  },
} as const;

const STEP_ORDER = ["q1", "q2", "q3", "q4", "phone", "done"] as const;

// ---------- Вспомогательные функции отправки ----------

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

async function askQuestion(chatId: number, step: keyof typeof QUESTIONS) {
  const q = QUESTIONS[step];
  await sendMessage(
    chatId,
    q.text,
    q.options.map(([text, payload]) => [{ text, payload }])
  );
}

async function askPhone(chatId: number) {
  await sendMessage(chatId, "Спасибо! Чтобы специалист мог связаться с Вами для бесплатной консультации, поделитесь, пожалуйста, номером телефона.", [
    [{ text: "📱 Отправить номер", payload: "request_contact" }],
  ]);
  // Примечание: для реальной кнопки "поделиться контактом" в MAX используется
  // отдельный тип кнопки request_contact (не callback) — см. документацию
  // dev.max.ru/docs-api/use-cases/sending-messages/keyboard. Уточни точный
  // формат перед продакшеном, здесь оставлен поясняющий вариант.
}

function nextStep(step: string): string {
  const idx = STEP_ORDER.indexOf(step as any);
  return STEP_ORDER[idx + 1] ?? "done";
}

// ---------- Уведомление менеджеру ----------

async function notifyManager(chatId: number, answers: Record<string, string>, phone: string) {
  const MANAGER_CHAT_ID = process.env.MAX_MANAGER_CHAT_ID!; // служебный чат/группа менеджеров

  const summary = `
🆕 Новая заявка (chat_id: ${chatId})
Сумма долга: ${answers.q1 ?? "-"}
Кредиторы: ${answers.q2 ?? "-"}
Ситуация: ${answers.q3 ?? "-"}
Имущество/доход: ${answers.q4 ?? "-"}
Телефон: ${phone}
`.trim();

  await sendMessage(Number(MANAGER_CHAT_ID), summary);
}

// ---------- Основной обработчик ----------

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("MAX webhook body:", JSON.stringify(body));

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
  // --- Событие: пользователь запустил бота ---
  // MAX присылает это событие только один раз за всю историю чата (при первом
  // запуске). При повторном обращении того же пользователя это событие не
  // приходит повторно — см. fallback в message_created ниже.
  if (body.update_type === "bot_started") {
    const chatId = body.chat_id;
    await startConversation(chatId, body.user?.user_id);
    return NextResponse.json({ ok: true });
  }

  // --- Событие: нажатие кнопки ---
  if (body.update_type === "message_callback") {
    // "message" — соседнее поле с "callback" в объекте Update, а не вложено в него.
    // Иногда message может отсутствовать — тогда берём user_id из callback
    // (в диалоге один на один с ботом chat_id обычно совпадает с user_id).
    const chatId =
      body.message?.recipient?.chat_id ?? body.callback?.user?.user_id;
    const payload: string = body.callback.payload;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const { data: conv } = await supabase
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!conv || conv.status !== "bot") {
      // диалог уже передан менеджеру — бот больше не реагирует на кнопки
      return NextResponse.json({ ok: true });
    }

    const step = conv.current_step; // q1 | q2 | q3 | q4
    const updatedAnswers = { ...conv.answers, [step]: payload };
    const next = nextStep(step);

    await supabase
      .from("max_conversations")
      .update({ current_step: next, answers: updatedAnswers })
      .eq("chat_id", chatId);

    if (next === "phone") {
      await askPhone(chatId);
    } else if (next in QUESTIONS) {
      await askQuestion(chatId, next as keyof typeof QUESTIONS);
    }

    return NextResponse.json({ ok: true });
  }

  // --- Событие: обычное сообщение (в т.ч. отправка контакта) ---
  if (body.update_type === "message_created") {
    const chatId = body.message?.recipient?.chat_id;
    if (!chatId) {
      return NextResponse.json({ ok: true });
    }
    const contact = body.message?.body?.attachments?.find(
      (a: any) => a.type === "contact"
    );

    const { data: conv } = await supabase
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!conv) {
      // Записи ещё нет — либо правда первое сообщение, либо bot_started не
      // пришёл повторно для уже знакомого пользователя. Запускаем сценарий
      // с начала, если это не отправка контакта (той у нас в принципе не
      // может быть без активного диалога, но на всякий случай проверяем).
      if (!contact) {
        await startConversation(chatId, body.message?.sender?.user_id);
      }
      return NextResponse.json({ ok: true });
    }

    // Если ждём телефон и пришёл контакт
    if (conv.current_step === "phone" && contact) {
      const phone = contact.payload?.phone ?? contact.payload?.vcf_info;

      await supabase
        .from("max_conversations")
        .update({ phone, current_step: "done", status: "waiting_manager" })
        .eq("chat_id", chatId);

      await sendMessage(
        chatId,
        "Спасибо! Ваша заявка принята ✅ В ближайшее время с Вами свяжется наш специалист прямо здесь, в этом чате."
      );

      await notifyManager(chatId, conv.answers, phone);
    }

    // Если диалог уже у менеджера — бот молчит, просто логируем
    // (менеджер отвечает вручную через кабинет MAX для бизнеса или отдельную админку)

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}