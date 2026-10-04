"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, MessageSquareText, Plus, Sun, Wallet } from "lucide-react";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/expenses", label: "Money", icon: Wallet },
  null,
  { href: "/steps", label: "Steps", icon: Footprints },
  { href: "/coach", label: "Coach", icon: MessageSquareText },
] as const;

export function BottomBar() {
  const path = usePathname();
  const { open } = useUi();
  const { profile } = useStore();
  if (profile && !profile.onboarded) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2">
        {TABS.map((t) =>
          t ? (
            <Link
              key={t.href}
              href={t.href}
              aria-current={path === t.href ? "page" : undefined}
              className={`flex min-w-14 flex-col items-center justify-center gap-1 text-[11px] ${path === t.href ? "text-ink" : "text-muted"}`}
            >
              <t.icon size={20} strokeWidth={1.75} />
              {t.label}
            </Link>
          ) : (
            <button
              key="add"
              onClick={() => open({ kind: "quick" })}
              aria-label="Add"
              className="flex h-12 w-14 items-center justify-center self-center rounded-full bg-accent text-accent-ink transition-transform duration-150 active:scale-95"
            >
              <Plus size={24} strokeWidth={2} />
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
