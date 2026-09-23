"use client";

import type { ReactNode } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import Providers from "@/components/providers";

import { setApiFixtureMode, type ApiFixtureMode } from "./fixtures";

const PREVIEW_USER = {
  email: "ayse@ornek.com",
  first_name: "Ayşe",
  last_name: "Yılmaz",
};

export function DashboardStory({
  mode,
  children,
}: {
  mode: ApiFixtureMode;
  children: ReactNode;
}) {
  setApiFixtureMode(mode);
  return (
    <Providers key={mode}>
      <DashboardShell initialUser={PREVIEW_USER}>{children}</DashboardShell>
    </Providers>
  );
}
