"use client";

import { DigitalMenuDirectoryPanel } from "@/components/dashboard/digital-menu/DigitalMenuDirectoryPanel";
import { DigitalMenuHubGate } from "@/components/dashboard/digital-menu/DigitalMenuHubGate";

export default function MyBranchesView() {
  return (
    <DigitalMenuHubGate>
      <DigitalMenuDirectoryPanel title="Şubelerim" />
    </DigitalMenuHubGate>
  );
}
