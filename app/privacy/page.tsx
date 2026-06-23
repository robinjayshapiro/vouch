import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Vouch',
  description: 'How Vouch handles community recommendation data and member information.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link href="/" className="text-base font-semibold text-navy-600">
        ← Back to Vouch
      </Link>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm font-semibold text-soft">Last updated: June 23, 2026</p>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          Vouch is designed for private community recommendations. We collect the
          information needed to create communities, help members sign in, and keep
          each directory useful.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Information we collect</h2>
        <ul className="mt-3 space-y-3 text-base leading-relaxed text-soft">
          <li>Your name when you create or join a community.</li>
          <li>Your phone number or email address when a community requires it for sign-in or approval.</li>
          <li>Vendor recommendations you add, including names, categories, phone numbers, websites, tags, and comments.</li>
          <li>Community settings chosen by organizers, such as invite code, join policy, and sign-in method.</li>
          <li>A private member token stored in your browser so Vouch can remember you on that device.</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">How we use it</h2>
        <ul className="mt-3 space-y-3 text-base leading-relaxed text-soft">
          <li>To show recommendations inside the communities you join.</li>
          <li>To let members add vouches, requests, and suggested edits.</li>
          <li>To send sign-in or approval links when a community uses phone or email sign-on.</li>
          <li>To help organizers manage pending members and keep directory information accurate.</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Who can see it</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          People with access to a community invite code can view that community's
          directory. Approved members can add or update their own vouches.
          Organizers can review pending members and suggested edits.
        </p>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Vouch does not sell vendor placement, does not run ads, and does not
          sell member information to vendors.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Your choices</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          If you need help updating or removing information from a Vouch
          community, contact the organizer of that community or email{' '}
          <a href="mailto:hello@vouch.business" className="font-semibold text-navy-600 underline">
            hello@vouch.business
          </a>.
        </p>
      </section>
    </main>
  );
}
