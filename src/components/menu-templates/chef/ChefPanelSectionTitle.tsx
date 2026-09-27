import { cn } from "@/lib/utils";

export function ChefPanelSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-2 px-0.5 text-[12px] font-bold leading-none tracking-[-0.01em] text-[#1c2824]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function ChefPanelGroupTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-1.5 px-0.5 text-[11px] font-bold leading-snug tracking-[-0.01em] text-[#3d4a45]",
        className,
      )}
    >
      {children}
    </p>
  );
}
