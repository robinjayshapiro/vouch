import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic — reports whether env vars are visible to the running
// deployment, without exposing any secret values. Hit GET /api/debug/env on the
// deployed site to confirm setup, then remove this route.
export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    // Booleans only — never the key itself.
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    hasResendFrom: !!process.env.RESEND_FROM,
    // Not secret; shown so you can catch a typo in the from address.
    resendFrom: process.env.RESEND_FROM ?? null,
    // The smoking gun: if this is null, NO env vars are reaching the runtime.
    appUrl: process.env.APP_URL ?? null,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
  });
}
