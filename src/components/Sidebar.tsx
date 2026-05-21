"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: "◇" },
  { href: "/chat", label: "Ask the assistant", icon: "✦" },
  { href: "/profile", label: "Candidate profile", icon: "◎" },
  { href: "/jobs", label: "Jobs", icon: "▤" },
  { href: "/messages", label: "Messages", icon: "✉" },
  { href: "/pipeline", label: "Pipeline", icon: "⧉" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-ink-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <span className="text-sm font-bold">R</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-900">RAUG Assistant</div>
          <div className="text-xs text-ink-500">Resume + outreach</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <span className="w-4 text-center text-ink-400">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 px-4 py-4 text-xs text-ink-500">
        <p className="leading-relaxed">
          Every bullet and message is grounded in retrieved profile facts — no
          invented experience.
        </p>
      </div>
    </aside>
  );
}
