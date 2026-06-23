import Link from 'next/link';

export const metadata = {
  title: 'Security | Vouch',
  description: 'How Vouch protects private community recommendation directories.',
};

export default function SecurityPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link href="/" className="text-base font-semibold text-navy-600">
        ← Back to Vouch
      </Link>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <p className="text-4xl" aria-hidden="true">🔒</p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">Security</h1>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          Vouch is built for small trust circles. The app keeps communities
          separate, validates write actions on the server, and avoids public paid
          ranking or vendor advertising.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Community access</h2>
        <ul className="mt-3 space-y-3 text-base leading-relaxed text-soft">
          <li>Each community has its own invite code.</li>
          <li>Organizers can choose open join, admin approval, or an approved phone list.</li>
          <li>Approved members can add recommendations, vouches, and requests.</li>
          <li>Admin actions require a valid organizer member token.</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Sign-in links</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Some communities use text or email sign-in links so members can return
          on another device. These links are single-use and expire after a short
          time. Vouch stores a private member token in your browser so you do not
          need a password on that device.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Report an issue</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          To report a security concern, email{' '}
          <a href="mailto:hello@vouch.business" className="font-semibold text-navy-600 underline">
            hello@vouch.business
          </a>{' '}
          with a clear description and steps to reproduce if possible.
        </p>
      </section>
    </main>
  );
}
