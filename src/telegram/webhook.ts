import { Bot, webhookCallback } from 'grammy';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  handleStart,
  handleHelp,
  handleStatus,
  handlePricing,
  handleRecommend,
  handleAlerts,
  handleChanges,
  handleCallbackQuery,
} from './commands.js';
import { handleInboundMessage } from './router.js';
import type { PaperclipEnv } from './paperclip.js';

export interface TelegramEnv {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

export type { PaperclipEnv };

/**
 * Create and configure the grammY Bot instance with all command handlers.
 */
export function createBot(token: string, supabase: SupabaseClient, paperclipEnv?: PaperclipEnv): Bot {
  const bot = new Bot(token);

  bot.command('start', (ctx) => handleStart(ctx, supabase));
  bot.command('help', (ctx) => handleHelp(ctx));
  bot.command('status', (ctx) => handleStatus(ctx, supabase));
  bot.command('pricing', (ctx) => handlePricing(ctx, supabase));
  bot.command('recommend', (ctx) => handleRecommend(ctx, supabase));
  bot.command('alerts', (ctx) => handleAlerts(ctx, supabase));
  bot.command('changes', (ctx) => handleChanges(ctx, supabase));

  bot.on('callback_query:data', (ctx) => handleCallbackQuery(ctx, supabase));

  // Freeform messages: route to agent via Paperclip if configured, else help hint
  bot.on('message:text', async (ctx) => {
    if (paperclipEnv?.PAPERCLIP_API_URL && paperclipEnv?.PAPERCLIP_API_KEY) {
      await handleInboundMessage(ctx, supabase, paperclipEnv);
    } else {
      await ctx.reply(
        'To message an agent use: `@Forge what is the deploy status?`\n\n' +
        'Bidirectional mode is not yet configured — ask the board to set Paperclip secrets.',
        { parse_mode: 'Markdown' },
      );
    }
  });

  return bot;
}

/**
 * Handle an incoming Telegram webhook request.
 * Validates the secret_token header before processing.
 */
export async function handleTelegramWebhook(
  request: Request,
  supabase: SupabaseClient,
  env: TelegramEnv,
  paperclipEnv?: PaperclipEnv,
): Promise<Response> {
  // Validate webhook secret via X-Telegram-Bot-Api-Secret-Token header
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const bot = createBot(env.TELEGRAM_BOT_TOKEN, supabase, paperclipEnv);
  const handler = webhookCallback(bot, 'cloudflare-mod');
  return handler(request);
}
