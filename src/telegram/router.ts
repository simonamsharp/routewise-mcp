/**
 * Inbound message router: handles freeform text messages to the bot.
 *
 * Supported formats:
 *   "@Forge what is the status of the deploy?"
 *   "Forge: deploy the migration"
 *   (reply to a bot message) → adds a comment on the same Paperclip issue
 */

import type { Context } from 'grammy';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findAgentByName, createIssueForAgent, addCommentToIssue, type PaperclipEnv } from './paperclip.js';

// ── Parse agent name from message text ────────────────────────────────────

function parseAgentMessage(text: string): { agentName: string; message: string } | null {
  // "@AgentName message..."
  const atMatch = text.match(/^@(\w+)\s+([\s\S]+)$/i);
  if (atMatch) return { agentName: atMatch[1], message: atMatch[2].trim() };

  // "AgentName: message..." or "AgentName, message..."
  const colonMatch = text.match(/^(\w+)[,:]\s+([\s\S]+)$/i);
  if (colonMatch) return { agentName: colonMatch[1], message: colonMatch[2].trim() };

  return null;
}

// ── Thread lookup ─────────────────────────────────────────────────────────

async function getThreadIssueId(
  supabase: SupabaseClient,
  chatId: number,
  replyToMessageId: number,
): Promise<{ issueId: string; issueIdentifier: string } | null> {
  const { data } = await supabase
    .from('telegram_threads')
    .select('paperclip_issue_id, paperclip_issue_identifier')
    .eq('telegram_chat_id', chatId)
    .eq('telegram_message_id', replyToMessageId)
    .single();
  if (!data) return null;
  return { issueId: data.paperclip_issue_id, issueIdentifier: data.paperclip_issue_identifier };
}

async function saveThread(
  supabase: SupabaseClient,
  chatId: number,
  botMessageId: number,
  issueId: string,
  issueIdentifier: string,
  agentName: string,
): Promise<void> {
  await supabase
    .from('telegram_threads')
    .upsert(
      { telegram_chat_id: chatId, telegram_message_id: botMessageId, paperclip_issue_id: issueId, paperclip_issue_identifier: issueIdentifier, agent_name: agentName },
      { onConflict: 'telegram_chat_id,telegram_message_id' },
    );
}

async function getUserPaperclipId(
  supabase: SupabaseClient,
  chatId: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('telegram_users')
    .select('paperclip_user_id')
    .eq('telegram_chat_id', chatId)
    .single();
  return data?.paperclip_user_id ?? null;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function handleInboundMessage(
  ctx: Context,
  supabase: SupabaseClient,
  paperclipEnv: PaperclipEnv,
): Promise<void> {
  const text = ctx.message?.text;
  const chatId = ctx.chat?.id;
  if (!text || !chatId) return;

  // ── 1. Reply to an existing thread ───────────────────────────────────────
  const replyToId = ctx.message?.reply_to_message?.message_id;
  if (replyToId) {
    const thread = await getThreadIssueId(supabase, chatId, replyToId);
    if (thread) {
      const comment = await addCommentToIssue(paperclipEnv, thread.issueId, text);
      if (comment) {
        await ctx.reply(
          `↩️ Added to [${thread.issueIdentifier}](${paperclipEnv.PAPERCLIP_API_URL.replace('/api', '')}/${thread.issueIdentifier.split('-')[0]}/issues/${thread.issueIdentifier})`,
          { parse_mode: 'Markdown', reply_parameters: { message_id: ctx.message!.message_id } },
        );
      } else {
        await ctx.reply('Failed to add comment — issue may have been closed.');
      }
      return;
    }
  }

  // ── 2. "@AgentName message" or "AgentName: message" ─────────────────────
  const parsed = parseAgentMessage(text);
  if (!parsed) {
    await ctx.reply(
      'To message an agent: `@Forge what is the deploy status?`\n\nOr reply to a bot message to continue that thread.',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const { agentName, message } = parsed;
  const agent = await findAgentByName(paperclipEnv, agentName);
  if (!agent) {
    await ctx.reply(`Agent *${agentName}* not found. Check the agent name and try again.`, { parse_mode: 'Markdown' });
    return;
  }

  // Get the Paperclip user ID so the issue is attributed to Simon
  const paperclipUserId = await getUserPaperclipId(supabase, chatId);

  const title = message.length > 80 ? message.slice(0, 77) + '...' : message;
  const description = `*From Telegram (${ctx.from?.username ?? ctx.from?.first_name ?? 'board'}):*\n\n${message}`;

  const issue = await createIssueForAgent(
    paperclipEnv,
    agent.id,
    title,
    description,
    paperclipUserId ?? '',
  );

  if (!issue) {
    await ctx.reply('Failed to create task — Paperclip API error.');
    return;
  }

  const prefix = issue.identifier.split('-')[0];
  const issueUrl = `${paperclipEnv.PAPERCLIP_API_URL.replace('/api', '')}/${prefix}/issues/${issue.identifier}`;

  const sent = await ctx.reply(
    `✅ *${issue.identifier}* assigned to *${agent.name}*\n[View task](${issueUrl})\n\nReply to this message to add follow-up comments.`,
    { parse_mode: 'Markdown' },
  );

  // Store thread mapping so replies go to the same issue
  if (sent.message_id) {
    await saveThread(supabase, chatId, sent.message_id, issue.id, issue.identifier, agent.name);
  }
}
