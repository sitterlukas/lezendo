import type { Metadata } from "next";

const GITHUB_URL = "https://github.com/sitterlukas/lezendo";
const CONTACT_EMAIL = "info@whipperbook.com";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Whipperbook — a free, non-commercial, open-source climbing logbook.",
};

const linkClass = "font-medium text-zinc-900 underline dark:text-zinc-100";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Questions, bug reports, or route corrections — we&apos;d love to hear
        from you.
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Email
          </h2>
          <p className="mt-1">
            Reach us any time at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Not a product
          </h2>
          <p className="mt-1">
            Whipperbook is a passion project, not a business. It&apos;s free to
            use — there are no ads, no subscriptions, and we don&apos;t sell
            your data or monetize the site in any way. It exists because we
            wanted a better place to catalogue routes and log ascents.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Open source
          </h2>
          <p className="mt-1">
            The whole thing is open source. Browse the code, file an issue, or
            open a pull request on{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              GitHub
            </a>
            . Contributions — from new crags to bug fixes — are always welcome.
          </p>
        </div>
      </section>
    </main>
  );
}
