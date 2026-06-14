import Image from "next/image";
import Link from "next/link";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
    title: "Explore crags",
    description:
      "Browse a growing database of crags and routes — from local boulders to alpine walls — with grades, styles, and beta.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
    title: "Log your ascents",
    description:
      "Keep a tick list of everything you climb. Onsights, flashes, redpoints — your whole climbing history in one place.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: "Track your progress",
    description:
      "See your grade pyramid grow over time and find out what to try next to push your limit.",
  },
];

export default async function LandingPage() {
  const [routeCount, cragCount, ascentCount] = await Promise.all([
    db.selectFrom("routes").select((eb) => eb.fn.countAll<number>().as("count")).where("deleted", "=", false).executeTakeFirstOrThrow().then((r) => r.count),
    db.selectFrom("crags").select((eb) => eb.fn.countAll<number>().as("count")).where("deleted", "=", false).executeTakeFirstOrThrow().then((r) => r.count),
    db.selectFrom("ascents").select((eb) => eb.fn.countAll<number>().as("count")).executeTakeFirstOrThrow().then((r) => r.count),
  ]);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Image
          src="/jerry-zhang-hkhCV41gOpA-unsplash.jpg"
          alt="Rock climber on a wall"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-5xl px-6 pb-44 pt-24 sm:pb-60 sm:pt-32">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            Route database &amp; logbook
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Every route.
            <br />
            Every ascent.
          </h1>
          <p className="mt-6 max-w-md text-base text-white/60">
            A route database and personal logbook for climbers — built to grow
            with every session at the crag.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/crags"
              className="rounded bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Explore crags
            </Link>
            <Link
              href="/crags"
              className="rounded border border-white/30 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
            >
              Add a route
            </Link>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-zinc-200 px-6 py-8 text-center dark:divide-zinc-800">
          <div>
            <div className="text-3xl font-bold">{routeCount}</div>
            <div className="mt-1 text-sm text-zinc-500">routes</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{cragCount}</div>
            <div className="mt-1 text-sm text-zinc-500">crags</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{ascentCount}</div>
            <div className="mt-1 text-sm text-zinc-500">ascents logged</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight">
          Built for the crag
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-t border-zinc-200 pt-6 dark:border-zinc-800"
            >
              <div className="text-zinc-500 dark:text-zinc-400">{feature.icon}</div>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="border border-zinc-200 bg-zinc-50 px-8 py-14 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold tracking-tight">
            Start building your logbook
          </h2>
          <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Add the routes you know and build a record of your climbing,
            session by session.
          </p>
          <Link
            href="/crags"
            className="mt-8 inline-block rounded bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open the route book
          </Link>
        </div>
      </section>
    </main>
  );
}