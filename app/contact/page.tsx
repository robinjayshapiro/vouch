import Link from 'next/link';

export const metadata = {
  title: 'Contact Vouch',
  description: 'How to contact Vouch about support, privacy, security, or community questions.',
};

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link href="/" className="text-base font-semibold text-navy-600">
        ← Back to Vouch
      </Link>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <p className="text-4xl" aria-hidden="true">✉️</p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">Contact Vouch</h1>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          Need help with a community, a recommendation, a privacy request, or a
          security concern? Send a note and include the community invite code if
          it is relevant.
        </p>
        <a
          href="mailto:hello@vouch.business"
          className="mt-5 block rounded-2xl bg-navy-600 p-4 text-center text-lg font-bold text-white transition-colors hover:bg-navy-700"
        >
          Email hello@vouch.business
        </a>
      </section>

      <section className="mt-5 rounded-3xl bg-navy-50 p-6">
        <h2 className="text-xl font-bold text-navy-800">For community members</h2>
        <p className="mt-3 text-base leading-relaxed text-ink">
          If your question is about joining, approval, or a recommendation inside
          a specific community, the fastest path is often the organizer who
          invited you. They control membership and review suggested edits.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">For safety or privacy requests</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Email the address above with enough detail to understand the issue. Do
          not include passwords or sensitive financial information. Vouch does
          not ask for payment card details inside the app.
        </p>
      </section>
    </main>
  );
}
