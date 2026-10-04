"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

/** Sends a fresh account to onboarding once the profile is known. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { profile } = useStore();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (profile && !profile.onboarded && path !== "/onboarding") router.replace("/onboarding");
  }, [profile, path, router]);
  return <>{children}</>;
}
