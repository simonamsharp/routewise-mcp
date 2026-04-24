/**
 * Stripe billing endpoints.
 *
 *  POST /billing/create-checkout
 *    Requires: Authorization: Bearer <api_key>
 *    Body: { "plan": "developer" | "team", "success_url": "...", "cancel_url": "..." }
 *    Creates a Stripe Checkout session and returns { checkout_url }.
 *
 *  POST /billing/webhook
 *    Stripe webhook receiver.  Verifies the Stripe-Signature header and handles:
 *      - customer.subscription.created         → upgrade plan + limit
 *      - customer.subscription.updated         → update plan + limit (upgrades/downgrades/SCA activation)
 *      - customer.subscription.deleted         → downgrade to free
 *      - invoice.paid                          → log successful payment (future: send receipt)
 *      - invoice.payment_failed                → log (no immediate action; Stripe retries)
 *      - invoice.payment_action_required       → log 3DS/SCA required action (future: email customer)
 *
 *  GET /billing/portal
 *    Requires: Authorization: Bearer <api_key>
 *    Creates a Stripe Customer Portal session and redirects (302).
 */

import { createClient } from '@supabase/supabase-js';

export interface BillingEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_DEVELOPER_PRICE_ID: string;  // $9/mo price ID from Stripe dashboard
  STRIPE_TEAM_PRICE_ID: string;       // $29/mo price ID from Stripe dashboard
  APP_BASE_URL?: string;
}

// Plan metadata
const PLAN_CONFIG: Record<string, { monthly_limit: number; stripe_price_id_key: keyof BillingEnv }> = {
  developer: { monthly_limit: 50_000, stripe_price_id_key: 'STRIPE_DEVELOPER_PRICE_ID' },
  team:      { monthly_limit: 250_000, stripe_price_id_key: 'STRIPE_TEAM_PRICE_ID' },
};

// ── Stripe helpers ────────────────────────────────────────────────────────────

async function stripePost(secretKey: string, path: string, params: Record<string, string>): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
}

async function stripeGet(secretKey: string, path: string): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
}

async function getOrCreateStripeCustomer(
  secretKey: string,
  email: string,
  existingCustomerId: string | null,
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }
  const res = await stripePost(secretKey, '/customers', { email });
  if (!res.ok) {
    throw new Error(`Stripe customer create failed: ${res.status}`);
  }
  const customer = await res.json() as { id: string };
  return customer.id;
}

// ── SHA-256 helper (same as auth.ts) ─────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Stripe webhook signature verification ────────────────────────────────────

/**
 * Verifies the Stripe-Signature header using HMAC-SHA256.
 * Returns true if the signature is valid and the timestamp is within tolerance.
 */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(',').map(s => s.split('=')).filter(p => p.length === 2).map(([k, v]) => [k, v]),
  );
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Replay protection
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > toleranceSeconds) return false;

  const signed = `${timestamp}.${payload}`;
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(signed);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const expected = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}

// ── Key lookup helper ─────────────────────────────────────────────────────────

async function lookupKeyByBearer(request: Request, env: BillingEnv) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const keyHash = await sha256Hex(rawKey);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase
    .from('api_keys')
    .select('id, email, plan, monthly_limit, revoked_at, stripe_customer_id, stripe_subscription_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();
  return data ?? null;
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function handleCreateCheckout(request: Request, env: BillingEnv): Promise<Response> {
  const keyData = await lookupKeyByBearer(request, env);
  if (!keyData) {
    return Response.json({ error: 'Valid API key required.' }, { status: 401 });
  }

  let body: { plan?: string; success_url?: string; cancel_url?: string };
  try {
    body = await request.json() as { plan?: string; success_url?: string; cancel_url?: string };
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const plan = (body.plan ?? '').toLowerCase();
  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) {
    return Response.json({ error: `Invalid plan. Choose: ${Object.keys(PLAN_CONFIG).join(', ')}.` }, { status: 400 });
  }

  const priceId = env[planConfig.stripe_price_id_key] as string;
  const baseUrl = env.APP_BASE_URL ?? 'https://mcp.whichmodel.dev';
  const successUrl = body.success_url ?? `${baseUrl}/?upgraded=true`;
  const cancelUrl = body.cancel_url ?? `${baseUrl}/`;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Get or create Stripe customer
  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(
      env.STRIPE_SECRET_KEY,
      keyData.email ?? '',
      keyData.stripe_customer_id ?? null,
    );
  } catch (err) {
    console.error('[billing] customer create error:', err);
    return Response.json({ error: 'Failed to create billing customer.' }, { status: 500 });
  }

  // Persist customer ID if freshly created
  if (!keyData.stripe_customer_id) {
    await supabase
      .from('api_keys')
      .update({ stripe_customer_id: customerId })
      .eq('id', keyData.id);
  }

  // Create Checkout session
  const sessionParams: Record<string, string> = {
    'customer': customerId,
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
    'metadata[api_key_id]': keyData.id,
    'subscription_data[metadata][api_key_id]': keyData.id,
  };

  const sessionRes = await stripePost(env.STRIPE_SECRET_KEY, '/checkout/sessions', sessionParams);
  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    console.error('[billing] checkout session error:', err);
    return Response.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }

  const session = await sessionRes.json() as { url: string };
  return Response.json({ checkout_url: session.url }, { status: 200 });
}

export async function handleWebhook(request: Request, env: BillingEnv): Promise<Response> {
  const sigHeader = request.headers.get('Stripe-Signature') ?? '';
  const payload = await request.text();

  const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.warn('[webhook] invalid Stripe signature');
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string;
        status: string;
        customer: string;
        items: { data: Array<{ price: { id: string } }> };
        metadata: { api_key_id?: string };
      };

      if (sub.status !== 'active') break;

      const priceId = sub.items?.data?.[0]?.price?.id;
      const apiKeyId = sub.metadata?.api_key_id;

      if (!apiKeyId || !priceId) {
        console.warn('[webhook] subscription missing api_key_id metadata or price id');
        break;
      }

      // Determine plan from price ID
      let newPlan: string | null = null;
      let newLimit = 1_000;
      if (priceId === env.STRIPE_DEVELOPER_PRICE_ID) {
        newPlan = 'developer';
        newLimit = 50_000;
      } else if (priceId === env.STRIPE_TEAM_PRICE_ID) {
        newPlan = 'team';
        newLimit = 250_000;
      }

      if (!newPlan) {
        console.warn('[webhook] unrecognised price ID:', priceId);
        break;
      }

      await supabase.from('api_keys').update({
        plan: newPlan,
        monthly_limit: newLimit,
        stripe_subscription_id: sub.id,
      }).eq('id', apiKeyId);

      // Invalidate KV cache: we don't have the raw key hash here, but the 5-min
      // TTL will flush naturally. For faster propagation, delete by key_id lookup.
      console.log(`[webhook] upgraded key ${apiKeyId} to ${newPlan}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as {
        id: string;
        metadata: { api_key_id?: string };
      };
      const apiKeyId = sub.metadata?.api_key_id;
      if (!apiKeyId) {
        console.warn('[webhook] subscription.deleted missing api_key_id');
        break;
      }

      await supabase.from('api_keys').update({
        plan: 'free',
        monthly_limit: 1_000,
        stripe_subscription_id: null,
      }).eq('id', apiKeyId);

      console.log(`[webhook] downgraded key ${apiKeyId} to free`);
      break;
    }

    case 'invoice.paid': {
      // Fires on every successful payment (initial subscription + all renewals).
      // Currently used for audit logging. TODO: send receipt email via Resend.
      const invoice = event.data.object as {
        customer: string;
        subscription: string;
        customer_email: string | null;
        amount_paid: number;
        currency: string;
      };
      console.log(
        '[webhook] invoice paid — customer:', invoice.customer,
        'sub:', invoice.subscription,
        'amount:', invoice.amount_paid, invoice.currency,
      );
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as {
        customer: string;
        subscription: string;
        customer_email: string | null;
        attempt_count: number;
      };
      console.warn(
        '[webhook] payment failed — customer:', invoice.customer,
        'sub:', invoice.subscription,
        'attempt:', invoice.attempt_count,
      );
      // Stripe retries automatically per the subscription's retry schedule.
      // TODO: send payment-failed email via Resend when attempt_count >= 2.
      break;
    }

    case 'invoice.payment_action_required': {
      // Fires when a payment requires 3D Secure / SCA authentication.
      // The subscription will be in 'incomplete' status until the customer completes auth.
      // The subscription.updated event will fire and activate the plan once auth succeeds.
      const invoice = event.data.object as {
        customer: string;
        subscription: string;
        customer_email: string | null;
        hosted_invoice_url: string | null;
      };
      console.warn(
        '[webhook] payment action required (3DS) — customer:', invoice.customer,
        'sub:', invoice.subscription,
        'invoice_url:', invoice.hosted_invoice_url,
      );
      // TODO: email customer via Resend with invoice.hosted_invoice_url so they can
      // complete 3DS authentication. Without this, European SCA payments silently fail.
      break;
    }

    default:
      // Acknowledge but ignore unhandled event types
      break;
  }

  return Response.json({ received: true });
}

export async function handleBillingPortal(request: Request, env: BillingEnv): Promise<Response> {
  const keyData = await lookupKeyByBearer(request, env);
  if (!keyData) {
    return Response.json({ error: 'Valid API key required.' }, { status: 401 });
  }

  if (!keyData.stripe_customer_id) {
    return Response.json({ error: 'No billing account found. Subscribe first via /billing/create-checkout.' }, { status: 404 });
  }

  const baseUrl = env.APP_BASE_URL ?? 'https://mcp.whichmodel.dev';
  const returnUrl = new URL(request.url).searchParams.get('return_url') ?? baseUrl;

  const res = await stripePost(env.STRIPE_SECRET_KEY, '/billing_portal/sessions', {
    customer: keyData.stripe_customer_id,
    return_url: returnUrl,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[billing] portal session error:', err);
    return Response.json({ error: 'Failed to create billing portal session.' }, { status: 500 });
  }

  const session = await res.json() as { url: string };
  return Response.redirect(session.url, 302);
}
