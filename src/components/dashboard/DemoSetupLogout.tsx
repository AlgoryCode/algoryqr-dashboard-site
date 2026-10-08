"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearPackageAccess } from "@/lib/load-package-access";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export function DemoSetupLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    try {
      localStorage.removeItem("algory_user");
      clearPackageAccess();
      await getSiteSameOriginAxios().post("/auth/logout", {}).catch(() => undefined);
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void logout()} disabled={pending}>
      <LogOut />
      Çıkış
    </Button>
  );
}
