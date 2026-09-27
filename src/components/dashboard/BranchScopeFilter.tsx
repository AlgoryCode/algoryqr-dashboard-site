"use client";

import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { formatBranchCode, type BranchItem } from "@/lib/branch";
import { parseBranchScope, type BranchScope } from "@/lib/branch-scope";

type BranchOption = Pick<BranchItem, "id" | "name">;

export function BranchScopeFilter({
  branches,
  value,
  onChange,
  tone = "dashboard",
  className,
  label = "Şube",
}: {
  branches: BranchOption[];
  value: BranchScope;
  onChange: (next: BranchScope) => void;
  tone?: "dashboard" | "canvas";
  className?: string;
  label?: string;
}) {
  const options = [
    { value: "all", label: "Tüm şubeler" },
    ...branches.map((branch) => ({
      value: String(branch.id),
      label: `${formatBranchCode(branch.id)} · ${branch.name}`,
    })),
  ];
  const current = value === "all" ? "all" : String(value);

  if (tone === "canvas") {
    return (
      <label className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[#1c1c18]">
        <span className="shrink-0 text-[#615e57]">{label}</span>
        <select
          aria-label="Şube filtresi"
          className="min-w-0 max-w-[12rem] truncate bg-transparent font-medium text-[#1c1c18] outline-none"
          value={current}
          onChange={(event) => onChange(parseBranchScope(event.target.value))}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <FilterSelect
      label={label}
      className={className}
      value={current}
      onValueChange={(next) => onChange(parseBranchScope(next))}
      options={options}
    />
  );
}
