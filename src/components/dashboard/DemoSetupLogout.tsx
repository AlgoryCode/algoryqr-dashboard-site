"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout as logoutSession } from "@/lib/site-session";

export function DemoSetupLogout() {
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    try {
      await logoutSession();
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
