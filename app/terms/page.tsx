import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use | Vouch',
  description: 'Terms for using Vouch community recommendation directories.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link href="/" className="text-base font-semibold text-navy-600">
        ← Back to Vouch
      </Link>

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h1 className="text-3xl font-extrabold text-ink">Terms of Use</h1>
        <p className="mt-2 text-sm font-semibold text-soft">Last updated: June 23, 2026</p>
        <p className="mt-4 text-lg leading-relaxed text-soft">
          Vouch is a tool for private communities to share local recommendations.
          By using Vouch, you agree to use it respectfully and responsibly.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Community recommendations</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Recommendations, comments, vendor details, and requests are submitted by
          community members. Vouch does not verify every vendor, guarantee the
          quality of any service, or endorse a provider simply because they appear
          in a community directory.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Your responsibility</h2>
        <ul className="mt-3 space-y-3 text-base leading-relaxed text-soft">
          <li>Use your own judgment before hiring anyone.</li>
          <li>Check licenses, insurance, references, pricing, and availability where appropriate.</li>
          <li>Share accurate information and avoid posting anything misleading, harmful, or unlawful.</li>
          <li>Respect the privacy of your community and the people recommended there.</li>
        </ul>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Organizer controls</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Community organizers may choose join settings, approve members, review
          suggested edits, and manage their community's shared directory. Vouch
          may remove content or restrict access if the service is misused.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">No paid ranking</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Vendors cannot pay Vouch to appear higher in a community directory. The
          value of Vouch comes from real recommendations by people in the group.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-ink">Contact</h2>
        <p className="mt-3 text-base leading-relaxed text-soft">
          Questions about these terms can be sent to{' '}
          <a href="mailto:hello@vouch.business" className="font-semibold text-navy-600 underline">
            hello@vouch.business
          </a>.
        </p>
      </section>
    </main>
  );
}
