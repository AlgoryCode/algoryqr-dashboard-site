"use client";

import * as React from "react";
import { toast as sonnerToast } from "sonner";

import type { ToastActionElement } from "@/components/ui/toast";

type ToastVariant = "default" | "info" | "success" | "warning" | "destructive" | "error";

type Toast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  action?: ToastActionElement;
  duration?: number;
};

function readAction(action: React.ReactNode) {
  if (!React.isValidElement<{ children?: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; altText?: string }>(action)) {
    return undefined;
  }
  const { children, onClick, altText } = action.props;
  const label = typeof children === "string" || typeof children === "number" ? children : altText;
  if (label == null || onClick == null) {
    return undefined;
  }
  return { label, onClick };
}

function toast({ title, description, variant, action, duration }: Toast) {
  const options = {
    description,
    duration,
    action: readAction(action),
  };

  const id =
    variant === "destructive" || variant === "error"
      ? sonnerToast.error(title, options)
      : variant === "success"
        ? sonnerToast.success(title, options)
        : variant === "warning"
          ? sonnerToast.warning(title, options)
          : sonnerToast.info(title, options);

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: () => undefined,
  };
}

function useToast() {
  return {
    toasts: [] as const,
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
