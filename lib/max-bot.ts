// lib/max-bot.ts
// Общая логика бота MAX. Используется всеми ботами; у каждого свой токен и slug.
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import https from "node:https";
import { CITIES } from "./cities";
import type { City } from "./cities";

const MAX_API = "https://platform-api.max.ru";

type Bot = { slug: string; token: string };

// Токен бота по его slug: atamanyuk -> MAX_BOT_TOKEN_ATAMANYUK
export function tokenForSlug(slug: string): string | undefined {
  const key = "MAX_BOT_TOKEN_" + slug.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return process.env[key];
}

let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — пишем из серверного кода
    );
  }
  return _db;
}

// Сервер MAX использует сертификат, подписанный Минцифры России — он не входит
// в стандартный список доверенных сертификатов на серверах Vercel. Поэтому для
// запросов именно к MAX API отключаем строгую проверку цепочки сертификата.
// Остальные соединения (Supabase, amoCRM) проверяются как обычно.
function maxApiRequest(
  bot: Bot,
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
          Authorization: bot.token,
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

// ---------- Город и воронки amoCRM ----------

const CITY_QUESTION = "В каком городе Вы находитесь?";
const CITY_OTHER_PAYLOAD = "city_other";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim()
    .replace(/^(г|город)\s+/, "");
}

// ключ встречается в начале слова (так подходят «Казани», «в Казани»)
function hasKey(text: string, key: string): boolean {
  return (" " + text).includes(" " + key);
}

// Ключи для поиска: название, псевдонимы и основа без последней буквы («Самар» ловит «в Самаре»)
function cityKeys(c: City): string[] {
  const keys: string[] = [];
  for (const name of [c.label, ...(c.aliases ?? [])]) {
    const k = norm(name);
    if (k.length < 2) continue;
    keys.push(k);
    if (!k.includes(" ") && k.length >= 5) keys.push(k.slice(0, -1));
  }
  return keys;
}

// Ищем город из списка по тому, что написал клиент
function matchCity(typed: string): City | undefined {
  const t = norm(typed);
  if (!t) return undefined;
  const exact = CITIES.find((c) => cityKeys(c).includes(t));
  if (exact) return exact;
  return CITIES.find((c) => cityKeys(c).some((k) => hasKey(t, k)));
}

type Pipeline = { id: number; name: string };
let pipelineCache: { at: number; list: Pipeline[] } | null = null;

async function amoPipelines(
  domain: string,
  headers: Record<string, string>
): Promise<Pipeline[]> {
  if (pipelineCache && Date.now() - pipelineCache.at < 10 * 60 * 1000) {
    return pipelineCache.list;
  }
  const res = await fetch(`https://${domain}/api/v4/leads/pipelines`, { headers });
  const data: any = await res.json().catch(() => null);
  const list: Pipeline[] = (data?._embedded?.pipelines ?? []).map((p: any) => ({
    id: Number(p.id),
    name: String(p.name),
  }));
  if (res.ok && list.length) pipelineCache = { at: Date.now(), list };
  return list;
}

async function pipelineForCity(
  city: City,
  domain: string,
  headers: Record<string, string>
): Promise<{ pipelineId?: number; statusId?: number }> {
  if (city.pipelineId) {
    return { pipelineId: city.pipelineId, statusId: city.statusId };
  }
  const list = await amoPipelines(domain, headers);
  const keys = cityKeys(city);
  const found = list.find((p) => {
    const n = norm(p.name);
    return keys.some((k) => hasKey(n, k));
  });
  return found ? { pipelineId: found.id, statusId: city.statusId } : {};
}

// ---------- Отправка сообщений в MAX ----------

async function sendMessage(
  bot: Bot,
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

  await maxApiRequest(bot, `/messages?chat_id=${chatId}`, { text, attachments });
}

async function askQuestion(bot: Bot, chatId: number, step: QuestionKey) {
  const q = QUESTIONS[step];
  await sendMessage(
    bot,
    chatId,
    q.text,
    q.options.map(([text, payload]) => [{ text, payload }])
  );
}

async function askPhone(bot: Bot, chatId: number) {
  await sendMessage(
    bot,
    chatId,
    "Спасибо! Напишите, пожалуйста, Ваш номер телефона сообщением в чате — например, +7 900 123-45-67."
  );
}

async function askCity(bot: Bot, chatId: number) {
  await sendMessage(bot, chatId, CITY_QUESTION, [
    ...CITIES.map((c) => [{ text: c.label, payload: `city_${c.label}` }]),
    [{ text: "Другой город", payload: CITY_OTHER_PAYLOAD }],
  ]);
}

async function askCityText(bot: Bot, chatId: number) {
  await sendMessage(bot, chatId, "Напишите, пожалуйста, название Вашего города.");
}

// Заменяет сообщение с вопросом: оставляет только выбранный ответ, кнопки убирает
async function showChosenAnswer(
  bot: Bot,
  callbackId: string,
  questionText: string,
  label: string
) {
  const res = await maxApiRequest(
    bot,
    `/answers?callback_id=${encodeURIComponent(callbackId)}`,
    {
      callback_id: callbackId,
      message: {
        text: `${questionText}\n\n✅ ${label}`,
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
  if (answers.city) lines.push(`Город: ${answers.city}`);
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

async function createAmoLead(
  bot: Bot,
  opts: {
    name: string;
    phone: string;
    chatId: number;
    userId?: number;
    answers: Record<string, string>;
  }
) {
  // Прямое создание сделок отключено: заявки в amoCRM передаёт интеграция.
  // Чтобы включить обратно, добавьте в Vercel переменную AMO_DIRECT_LEADS = on
  if (process.env.AMO_DIRECT_LEADS !== "on") {
    console.log("amoCRM: прямое создание сделок отключено, заявка сохранена только в базе");
    return;
  }

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

  // Город из списка (для него настроена воронка)
  const cityCfg = opts.answers.city
    ? CITIES.find((c) => c.label === opts.answers.city)
    : undefined;

  const envPipeline = process.env.AMO_PIPELINE_ID
    ? Number(process.env.AMO_PIPELINE_ID)
    : undefined;
  const envStatus = process.env.AMO_STATUS_ID
    ? Number(process.env.AMO_STATUS_ID)
    : undefined;

  const buildLead = (pipelineId?: number, statusId?: number) => {
    const tags = [{ name: "MAX-бот" }, { name: `MAX: ${bot.slug}` }];
    if (cityCfg) tags.push({ name: cityCfg.label });
    const lead: Record<string, unknown> = {
      name: `Заявка из MAX-бота (${bot.slug})`,
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
        tags,
      },
    };
    if (pipelineId) lead.pipeline_id = pipelineId;
    if (statusId) lead.status_id = statusId;
    return lead;
  };

  const postLead = async (lead: Record<string, unknown>) => {
    const res = await fetch(`https://${domain}/api/v4/leads/complex`, {
      method: "POST",
      headers,
      body: JSON.stringify([lead]),
    });
    const data: any = await res.json().catch(() => null);
    const leadId: number | undefined = Array.isArray(data) ? data[0]?.id : undefined;
    return { ok: res.ok && !!leadId, status: res.status, data, leadId };
  };

  // Воронка по городу
  let routing: { pipelineId?: number; statusId?: number } = {};
  if (cityCfg) {
    try {
      routing = await pipelineForCity(cityCfg, domain, headers);
    } catch (e: any) {
      console.error("amoCRM: не удалось получить воронки", e?.message);
    }
    if (!routing.pipelineId) {
      console.error(
        `amoCRM: для города "${cityCfg.label}" воронка не найдена — используем воронку по умолчанию`
      );
    }
  }

  let result = await postLead(
    buildLead(
      routing.pipelineId ?? envPipeline,
      routing.pipelineId ? routing.statusId : envStatus
    )
  );
  let routingNote = "";

  // Если сделка в воронку города не создалась, не теряем заявку: кладём в воронку по умолчанию
  if (!result.ok && routing.pipelineId) {
    console.error(
      "amoCRM: сделка в воронку города не создалась, пробуем воронку по умолчанию",
      result.status,
      JSON.stringify(result.data)
    );
    result = await postLead(buildLead(envPipeline, envStatus));
    routingNote = `\n⚠️ Воронка города «${cityCfg?.label}» не применилась, сделка создана в воронке по умолчанию.`;
  }

  if (!result.ok || !result.leadId) {
    console.error("amoCRM: сделка не создана", result.status, JSON.stringify(result.data));
    return;
  }
  const leadId = result.leadId;

  const noteText =
    [
      `Заявка из MAX-бота (${bot.slug})`,
      "",
      formatAnswers(opts.answers),
      "",
      `Телефон: ${opts.phone}`,
      `MAX: chat_id ${opts.chatId}${opts.userId ? `, user_id ${opts.userId}` : ""}`,
    ].join("\n") + routingNote;

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
  bot: Bot,
  chatId: number,
  answers: Record<string, string>,
  phone: string
) {
  const managerChatId = process.env.MAX_MANAGER_CHAT_ID;
  if (!managerChatId) return;

  const summary = [
    `🆕 Новая заявка (${bot.slug}, chat_id: ${chatId})`,
    formatAnswers(answers),
    `Телефон: ${phone}`,
  ].join("\n");

  await sendMessage(bot, Number(managerChatId), summary);
}

// ---------- Основной обработчик ----------

export async function handleMaxWebhook(
  req: NextRequest,
  slug: string,
  token: string | undefined
) {
  if (!token) {
    console.error(`MAX: токен для бота "${slug}" не задан в переменных окружения`);
    return NextResponse.json({ ok: true });
  }
  const bot: Bot = { slug, token };

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  console.log("MAX update:", slug, body?.update_type);

  try {
    return await handleUpdate(bot, body);
  } catch (e: any) {
    console.error("MAX webhook error:", e?.message, e?.stack);
    return NextResponse.json({ ok: true }); // всегда 200, чтобы MAX не ретраил бесконечно
  }
}

async function startConversation(bot: Bot, chatId: number, userId?: number) {
  const { error: upsertError } = await db()
    .from("max_conversations")
    .upsert(
      {
        chat_id: chatId,
        user_id: userId,
        current_step: CITIES.length ? "city" : "q1",
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
    bot,
    chatId,
    "Здравствуйте! 👋 Я бот-помощник по вопросам списания долгов и банкротства. Задам несколько вопросов, чтобы разобраться в Вашей ситуации, и передам диалог специалисту для бесплатной консультации."
  );
  if (CITIES.length) {
    await askCity(bot, chatId);
  } else {
    await askQuestion(bot, chatId, "q1");
  }
}

async function handleUpdate(bot: Bot, body: any) {
  // --- Пользователь запустил бота (MAX шлёт это только при самом первом запуске) ---
  if (body.update_type === "bot_started") {
    await startConversation(bot, body.chat_id, body.user?.user_id);
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

    const { data: conv } = await db()
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!conv || conv.status !== "bot") {
      return NextResponse.json({ ok: true });
    }

    const step: string = conv.current_step;

    // Шаг «город»: выбрана кнопка с городом или «Другой город»
    if (step === "city") {
      if (!payload.startsWith("city_")) {
        return NextResponse.json({ ok: true });
      }

      if (payload === CITY_OTHER_PAYLOAD) {
        const { data: moved } = await db()
          .from("max_conversations")
          .update({ current_step: "city_text" })
          .eq("chat_id", chatId)
          .eq("current_step", "city")
          .select();
        if (!moved || moved.length === 0) return NextResponse.json({ ok: true });

        await showChosenAnswer(bot, callbackId, CITY_QUESTION, "Другой город");
        await askCityText(bot, chatId);
        return NextResponse.json({ ok: true });
      }

      const city = CITIES.find((c) => c.label === payload.slice("city_".length));
      if (!city) return NextResponse.json({ ok: true });

      const { data: moved } = await db()
        .from("max_conversations")
        .update({
          current_step: "q1",
          answers: { ...conv.answers, city: city.label },
        })
        .eq("chat_id", chatId)
        .eq("current_step", "city")
        .select();
      if (!moved || moved.length === 0) return NextResponse.json({ ok: true });

      await showChosenAnswer(bot, callbackId, CITY_QUESTION, city.label);
      await askQuestion(bot, chatId, "q1");
      return NextResponse.json({ ok: true });
    }

    // Кнопка от старого вопроса или повторное нажатие — игнорируем
    if (!(step in QUESTIONS) || !payload.startsWith(`${step}_`)) {
      return NextResponse.json({ ok: true });
    }

    const updatedAnswers = { ...conv.answers, [step]: payload };
    const next = nextStep(step);

    // Обновляем только если шаг ещё не сменился — защита от двойной обработки
    const { data: updated } = await db()
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
      bot,
      callbackId,
      QUESTIONS[step as QuestionKey].text,
      LABELS[payload] ?? payload
    );

    if (next === "phone") {
      await askPhone(bot, chatId);
    } else if (next in QUESTIONS) {
      await askQuestion(bot, chatId, next as QuestionKey);
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

    const { data: conv } = await db()
      .from("max_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    // Записи нет — запускаем сценарий с начала
    if (!conv) {
      await startConversation(bot, chatId, body.message?.sender?.user_id);
      return NextResponse.json({ ok: true });
    }

    // Ждём название города текстом (или клиент написал город вместо нажатия кнопки)
    if (
      conv.status === "bot" &&
      (conv.current_step === "city_text" || conv.current_step === "city")
    ) {
      const typed = text.slice(0, 80);
      if (norm(typed).length < 2) {
        await askCityText(bot, chatId);
        return NextResponse.json({ ok: true });
      }

      const matched = matchCity(typed);
      const { data: moved } = await db()
        .from("max_conversations")
        .update({
          current_step: "q1",
          answers: { ...conv.answers, city: matched ? matched.label : typed },
        })
        .eq("chat_id", chatId)
        .eq("current_step", conv.current_step)
        .select();
      if (!moved || moved.length === 0) return NextResponse.json({ ok: true });

      await askQuestion(bot, chatId, "q1");
      return NextResponse.json({ ok: true });
    }

    // Ждём телефон — человек пишет его сам
    if (conv.status === "bot" && conv.current_step === "phone") {
      const phone = normalizePhone(text);

      if (!phone) {
        await sendMessage(
          bot,
          chatId,
          "Не получилось распознать номер. Напишите, пожалуйста, в формате +7 900 123-45-67."
        );
        return NextResponse.json({ ok: true });
      }

      const { data: updated } = await db()
        .from("max_conversations")
        .update({ phone, current_step: "done", status: "waiting_manager" })
        .eq("chat_id", chatId)
        .eq("current_step", "phone")
        .select();

      if (!updated || updated.length === 0) {
        return NextResponse.json({ ok: true });
      }

      await sendMessage(
        bot,
        chatId,
        "Спасибо! Ваша заявка принята ✅ В ближайшее время с Вами свяжется наш специалист прямо здесь, в этом чате."
      );

      try {
        await createAmoLead(bot, {
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
        await notifyManager(bot, chatId, conv.answers, phone);
      } catch (e: any) {
        console.error("notifyManager error:", e?.message);
      }
    }

    // Если диалог уже у менеджера — бот молчит
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}