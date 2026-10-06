"use client";

import { create } from "zustand";

import type { AccessProfile } from "@/lib/auth-user";

export type PackageAccessStatus = "idle" | "loading" | "ready" | "guest";

type PackageAccessState = {
  profile: AccessProfile | null;
  status: PackageAccessStatus;
  setProfile: (profile: AccessProfile) => void;
  setStatus: (status: PackageAccessStatus) => void;
  clear: () => void;
};

export const usePackageStore = create<PackageAccessState>((set) => ({
  profile: null,
  status: "idle",
  setProfile: (profile) => set({ profile, status: "ready" }),
  setStatus: (status) => set({ status }),
  clear: () => set({ profile: null, status: "idle" }),
}));
