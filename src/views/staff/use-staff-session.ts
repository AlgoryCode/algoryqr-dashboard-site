"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  parseStaffRole,
  staffHomePath,
  staffRoleMatchesApp,
  waiterMe,
  type StaffRole,
  type WaiterMe,
} from "@/lib/waiter-api";

export function useStaffSession(expected: StaffRole) {
  const router = useRouter();
  const [me, setMe] = useState<WaiterMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    waiterMe()
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          router.replace("/personel");
          return;
        }
        const role = parseStaffRole(profile.staffRole);
        if (!staffRoleMatchesApp(role, expected)) {
          router.replace(staffHomePath(role));
          return;
        }
        setMe(profile);
      })
      .catch(() => {
        if (!cancelled) router.replace("/personel");
      });
    return () => {
      cancelled = true;
    };
  }, [expected, router]);

  return me;
}
