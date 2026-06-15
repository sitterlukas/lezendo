import Link from "next/link";

const tabs = [
  { href: "/profile/statistics", label: "Statistics", key: "statistics" },
  { href: "/profile/gear", label: "Gear", key: "gear" },
  { href: "/profile/settings", label: "Settings", key: "settings" },
] as const;

export default function ProfileTabs({
  active,
}: {
  active: (typeof tabs)[number]["key"];
}) {
  return (
    <nav className="mt-6 flex gap-6 text-sm font-medium">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`-mb-px border-b-2 pb-3 transition ${
            active === tab.key
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
