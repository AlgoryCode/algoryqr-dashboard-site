"use client";

import { Suspense } from "react";

import DemoLogin from "@/views/DemoLogin";

export default function DemoLoginPage() {
  return (
    <Suspense fallback={null}>
      <DemoLogin />
    </Suspense>
  );
}
