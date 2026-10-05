// app/api/max/webhook/route.ts
// Первый бот (токен в переменной MAX_BOT_TOKEN)
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { handleMaxWebhook } from "../../../../lib/max-bot";

export async function POST(req: NextRequest) {
  return handleMaxWebhook(req, "sergienko", process.env.MAX_BOT_TOKEN);
}