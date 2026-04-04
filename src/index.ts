import { randomUUID } from 'node:crypto';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { getSupabaseClient } from './db/client.js';
import { getDataFreshness } from './db/models.js';
import { createRouteWiseServer } from './server.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import type { Request, Response } from 'express';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

// ── Supabase client (shared across all sessions) ──
const supabase = getSupabaseClient();

// ── Express app ──
const app = createMcpExpressApp({ host: HOST });

// ── Rate limiting: 100 requests per minute per IP ──
const rateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});
app.use('/mcp', rateLimiter);

// ── Health endpoint ──
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const freshness = await getDataFreshness(supabase);
    res.json({
      status: 'ok',
      version: '0.1.0',
      data_freshness: freshness,
      uptime_seconds: Math.floor(process.uptime()),
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      error: 'Database connection issue',
    });
  }
});

// ── Session management ──
const transports: Record<string, StreamableHTTPServerTransport> = {};

// ── POST /mcp — Main MCP endpoint ──
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };

      // Create a fresh server for this session and connect
      const server = createRouteWiseServer(supabase);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// ── GET /mcp — SSE stream for existing sessions ──
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

// ── DELETE /mcp — Session termination ──
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  const transport = transports[sessionId];
  await transport.close();
  delete transports[sessionId];
  res.status(200).send('Session terminated');
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`RouteWise MCP server listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
});

// ── Graceful shutdown ──
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  for (const [sid, transport] of Object.entries(transports)) {
    await transport.close();
    delete transports[sid];
  }
  process.exit(0);
});
