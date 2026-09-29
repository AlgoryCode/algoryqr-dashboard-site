"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { DemoProvisioningOverlay } from "@/components/dashboard/DemoProvisioningOverlay";
import { DemoSetupWizardOverlay } from "@/components/dashboard/DemoSetupWizardOverlay";

type DemoOnboardingFlowProps = {
  userId: number;
  onComplete: () => void;
};

type Phase = "provisioning" | "wizard";

export function DemoOnboardingFlow({ userId, onComplete }: DemoOnboardingFlowProps) {
  const [phase, setPhase] = useState<Phase>("provisioning");

  return (
    <AnimatePresence mode="wait">
      {phase === "provisioning" ? (
        <motion.div
          key="demo-provisioning"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <DemoProvisioningOverlay onReady={() => setPhase("wizard")} />
        </motion.div>
      ) : (
        <motion.div
          key="demo-wizard"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <DemoSetupWizardOverlay userId={userId} onComplete={onComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
