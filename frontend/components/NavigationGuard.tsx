
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { onboardingComplete, userEmail } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If logged in but onboarding not complete, and not already on onboarding page or home
    if (userEmail && !onboardingComplete && pathname !== "/onboarding" && pathname !== "/") {
      router.push("/onboarding");
    }
  }, [onboardingComplete, userEmail, pathname, router]);

  return <>{children}</>;
}
