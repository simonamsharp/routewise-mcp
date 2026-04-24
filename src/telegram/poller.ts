/**
 * Paperclip → Telegram poller.
 *
 * Runs on a 1-minute Cloudflare cron trigger. For each Telegram user
 * with a Paperclip binding, fetches new agent comments since their
 * last cursor and pushes them as Telegram messages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getCommentsForUser, type PaperclipEnv } from './paperclip.js';

const TELEGRAM_API = 'https://api.telegram.org';

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<number | null> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
  return data.result?.message_id ?? null;
}

function formatComment(comment: {
  body: string;
  createdAt: string;
  authorAgentId: string | null;
  issueIdentifier: string;
  issueTitle: string;
}): string {
  const agentLabel = comment.authorAgentId ? `*Agent*` : '*System*';
  const time = new Date(comment.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const preview = comment.body.length > 400 ? comment.body.slice(0, 397) + '...' : comment.body;

  return `📬 ${agentLabel} · [${comment.issueIdentifier}](placeholder) · ${time}\n\n${preview}`;
}

interface WatchedUser {
  id: number;
  telegram_chat_id: number;
  paperclip_user_id: string | null;
  paperclip_last_comment_id: string | null;
}

export async function pollAndPush(
  supabase: SupabaseClient,
  botToken: string,
  paperclipEnv: PaperclipEnv,
): Promise<void> {
  // Get all Telegram users with a Paperclip binding
  const { data: users, error } = await supabase
    .from('telegram_users')
    .select('id, telegram_chat_id, paperclip_user_id, paperclip_last_comment_id')
    .not('paperclip_user_id', 'is', null);

  if (error || !users?.length) return;

  for (const user of users as WatchedUser[]) {
    if (!user.paperclip_user_id) continue;

    try {
      const comments = await getCommentsForUser(
        paperclipEnv,
        user.paperclip_user_id,
        user.paperclip_last_comment_id,
      );

      if (!comments.length) continue;

      let lastCommentId = user.paperclip_last_comment_id;

      for (const comment of comments) {
        const text = formatComment(comment);
        await sendTelegramMessage(botToken, user.telegram_chat_id, text);
        lastCommentId = comment.id;
      }

      // Update cursor
      if (lastCommentId !== user.paperclip_last_comment_id) {
        await supabase
          .from('telegram_users')
          .update({ paperclip_last_comment_id: lastCommentId })
          .eq('id', user.id);
      }
    } catch {
      // Non-fatal: skip this user, try again next poll
      console.error(`Telegram poller: failed for chat ${user.telegram_chat_id}`);
    }
  }
}
