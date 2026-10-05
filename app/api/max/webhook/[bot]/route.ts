// app/api/max/webhook/[bot]/route.ts
// Остальные боты: адрес /api/max/webhook/<slug>, токен в MAX_BOT_TOKEN_<SLUG>
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { handleMaxWebhook, tokenForSlug } from "../../../../../lib/max-bot";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bot: string }> }
) {
  const { bot } = await ctx.params;
  return handleMaxWebhook(req, bot, tokenForSlug(bot));
}