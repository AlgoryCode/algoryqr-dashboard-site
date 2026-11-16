"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { CirclePlus } from "lucide-react";

import { cn } from "@/lib/utils";

/** The minimal red "+ …" text action used for every create button ("Ürün oluştur", "Kategori ekle", …). */
export const ADD_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[#F03245] transition-colors hover:bg-[#FFF0F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-[#FFF0F3] dark:text-[#FB7185] dark:hover:bg-[#F03245]/15 dark:data-[state=open]:bg-[#F03245]/15";

type AddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>(function AddButton(
  { children, className, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(ADD_BUTTON_CLASS, className)} {...props}>
      <CirclePlus className="size-4" aria-hidden />
      {children}
    </button>
  );
});

export function AddLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(ADD_BUTTON_CLASS, className)}>
      <CirclePlus className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
