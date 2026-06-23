import Link from 'next/link';

export const metadata = {
  title: 'About Vouch',
  description: 'Learn how Vouch helps private communities share trusted local recommendations.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link href="/" className="text-base font-semibold text-navy-600">
        ← Back to Vouch
      </Link>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <p className="text-4xl" aria-hidden="true">🤝</p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">About Vouch</h1>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          Vouch helps private communities remember and share the local pros they
          already trust: plumbers, electricians, babysitters, cleaners,
          mechanics, handymen, and more.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          A neighborhood, family, church group, school circle, building, or group
          of friends can start a community, invite members with a code, and build
          a shared directory from real recommendations.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-navy-50 p-6">
        <h2 className="text-xl font-bold text-navy-800">What makes it different</h2>
        <ul className="mt-3 space-y-3 text-base leading-relaxed text-ink">
          <li>Vouch is built around private groups, not public reviews.</li>
          <li>Recommendations come from people in your own community.</li>
          <li>Vendors cannot buy placement or pay to look trusted.</li>
          <li>The goal is less noise, fewer ads, and more useful word of mouth.</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Who runs each community</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Each Vouch community is started and managed by a community organizer.
          Organizers can invite members, review suggested edits, and choose how
          people join. Vouch provides the tool; each community decides who they
          trust and recommend.
        </p>
      </section>
    </main>
  );
}
