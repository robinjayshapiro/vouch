import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-5xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-3xl font-extrabold text-ink">
        Hmm, we can&apos;t find that page
      </h1>
      <p className="mt-2 text-lg text-soft">
        The community code may be mistyped, or the link is old.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-pine-600 px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-pine-700"
      >
        Go to the home page
      </Link>
    </main>
  );
}
