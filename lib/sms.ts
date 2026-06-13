// SMS delivery for magic sign-in links. Uses Twilio's REST API directly via
// fetch so we add no dependency. If Twilio isn't configured (e.g. local dev),
// we log the message to the server console instead of sending — the whole
// claim flow stays testable without an account.

interface SmsResult {
  delivered: boolean;
  // The link is surfaced in dev so tests can read it from the server log.
  devLogged: boolean;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !auth || !from) {
    // Dev fallback — no Twilio creds. Surface the message so we can follow it.
    console.log(`\n[sms:dev] would text ${to}:\n  ${body}\n`);
    return { delivered: false, devLogged: true };
  }

  const params = new URLSearchParams();
  params.set('To', to);
  params.set('Body', body);
  // TWILIO_FROM may be a phone number or a Messaging Service SID (starts MG).
  if (from.startsWith('MG')) params.set('MessagingServiceSid', from);
  else params.set('From', from);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${detail}`);
  }
  return { delivered: true, devLogged: false };
}

/** Build the sign-in SMS body for a community + claim link. */
export function signInMessage(communityName: string, link: string): string {
  return `Tap to sign in to ${communityName} on Vouch: ${link}`;
}

/** Where claim links point. APP_URL should be the deployed origin in prod. */
export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}
