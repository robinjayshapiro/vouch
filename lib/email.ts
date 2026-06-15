// Email delivery for magic sign-in links — the email-sign-on alternative to
// SMS. Uses Resend's REST API via fetch (no dependency). When RESEND_API_KEY or
// RESEND_FROM is absent we log instead of send, mirroring lib/sms.ts so the link
// is followable in dev. Channel selection (SMS vs email) lives in lib/signin.ts.
//
// In production, set RESEND_API_KEY and RESEND_FROM (a verified sender) in env.

interface EmailResult {
  delivered: boolean;
  devLogged: boolean;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!key || !from) {
    console.log(`\n[email:dev] would email ${to} — ${subject}:\n  ${text}\n`);
    return { delivered: false, devLogged: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
  return { delivered: true, devLogged: false };
}

/** Subject + body for a sign-in email, paralleling signInMessage() in lib/sms.ts. */
export function signInEmail(
  communityName: string,
  link: string
): { subject: string; text: string } {
  return {
    subject: `Sign in to ${communityName} on Vouch`,
    text: `Tap to sign in to ${communityName} on Vouch:\n\n${link}\n\nThis link works once and expires shortly.`,
  };
}
