/**
 * Paperclip API client for the Telegram bidirectional bot.
 *
 * Handles creating issues/comments (Simon → agent) and polling
 * for new comments to push back to Simon.
 */

export interface PaperclipEnv {
  PAPERCLIP_API_URL: string;
  PAPERCLIP_API_KEY: string;
  PAPERCLIP_COMPANY_ID: string;
}

interface PaperclipIssue {
  id: string;
  identifier: string;
  title: string;
  status: string;
  assigneeAgentId: string | null;
}

interface PaperclipAgent {
  id: string;
  name: string;
  urlKey: string;
}

interface PaperclipComment {
  id: string;
  body: string;
  createdAt: string;
  authorAgentId: string | null;
  authorUserId: string | null;
}

// ── Agent lookup ────────────────────────────────────────────────────────────

export async function findAgentByName(
  env: PaperclipEnv,
  name: string,
): Promise<PaperclipAgent | null> {
  const res = await fetch(`${env.PAPERCLIP_API_URL}/api/companies/${env.PAPERCLIP_COMPANY_ID}/agents`, {
    headers: { Authorization: `Bearer ${env.PAPERCLIP_API_KEY}` },
  });
  if (!res.ok) return null;
  const agents = (await res.json()) as PaperclipAgent[];
  const needle = name.toLowerCase();
  return agents.find(
    (a) => a.name.toLowerCase() === needle || a.urlKey.toLowerCase() === needle,
  ) ?? null;
}

// ── Issue creation (Simon → agent) ─────────────────────────────────────────

export async function createIssueForAgent(
  env: PaperclipEnv,
  agentId: string,
  title: string,
  description: string,
  createdByUserId: string,
): Promise<PaperclipIssue | null> {
  const res = await fetch(`${env.PAPERCLIP_API_URL}/api/companies/${env.PAPERCLIP_COMPANY_ID}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAPERCLIP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description,
      status: 'todo',
      assigneeAgentId: agentId,
      createdByUserId,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as PaperclipIssue;
}

export async function addCommentToIssue(
  env: PaperclipEnv,
  issueId: string,
  body: string,
): Promise<PaperclipComment | null> {
  const res = await fetch(`${env.PAPERCLIP_API_URL}/api/issues/${issueId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAPERCLIP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) return null;
  return (await res.json()) as PaperclipComment;
}

// ── Polling (agent → Simon) ────────────────────────────────────────────────

/**
 * Fetch the most recent comment ID from across the company's issues,
 * scoped to issues that involve `userId` (assigned to them or mentioned).
 */
export async function getCommentsForUser(
  env: PaperclipEnv,
  userId: string,
  afterCommentId: string | null,
): Promise<Array<PaperclipComment & { issueId: string; issueIdentifier: string; issueTitle: string }>> {
  // Get issues the user is involved in
  const inboxRes = await fetch(
    `${env.PAPERCLIP_API_URL}/api/agents/me/inbox/mine?userId=${userId}`,
    { headers: { Authorization: `Bearer ${env.PAPERCLIP_API_KEY}` } },
  );
  if (!inboxRes.ok) return [];

  const inbox = (await inboxRes.json()) as Array<{
    id: string;
    identifier: string;
    title: string;
    latestCommentId?: string;
  }>;

  // Gather new comments from each issue
  const results: Array<PaperclipComment & { issueId: string; issueIdentifier: string; issueTitle: string }> = [];

  for (const issue of inbox.slice(0, 20)) {
    // Limit to 20 issues to stay within CPU budget
    const url = afterCommentId
      ? `${env.PAPERCLIP_API_URL}/api/issues/${issue.id}/comments?after=${afterCommentId}&order=asc`
      : `${env.PAPERCLIP_API_URL}/api/issues/${issue.id}/comments?order=desc&limit=3`;

    const commentsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${env.PAPERCLIP_API_KEY}` },
    });
    if (!commentsRes.ok) continue;

    const raw = await commentsRes.json() as PaperclipComment[] | { comments?: PaperclipComment[]; data?: PaperclipComment[] };
    const comments = Array.isArray(raw) ? raw : ((raw as { comments?: PaperclipComment[]; data?: PaperclipComment[] }).comments ?? (raw as { data?: PaperclipComment[] }).data ?? []);

    for (const c of comments as PaperclipComment[]) {
      // Only push agent comments (not Simon's own messages)
      if (c.authorAgentId) {
        results.push({ ...c, issueId: issue.id, issueIdentifier: issue.identifier, issueTitle: issue.title });
      }
    }
  }

  // Sort by creation time
  results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return results;
}

// ── Issue lookup (for thread continuity) ───────────────────────────────────

export async function getIssue(
  env: PaperclipEnv,
  issueId: string,
): Promise<PaperclipIssue | null> {
  const res = await fetch(`${env.PAPERCLIP_API_URL}/api/issues/${issueId}`, {
    headers: { Authorization: `Bearer ${env.PAPERCLIP_API_KEY}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as PaperclipIssue;
}
