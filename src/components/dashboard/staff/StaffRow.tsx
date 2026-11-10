"use client";

import Link from "next/link";
import { Building2, MoreHorizontal, UserRoundCog } from "lucide-react";

import { LIST_ROW, LIST_ROW_LINK, ListHead } from "@/components/dashboard/ListLayout";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { TONES } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAFF_ROLE_LABEL, parseStaffRole, type MenuWaiterMember } from "@/lib/personnel-management-api";
import { ACTIVE_TONE, STAFF_ROLE_TONE } from "@/lib/badge-tones";
import { staffInitials } from "@/lib/staff-list";
import { cn } from "@/lib/utils";

/** Name, role, branch, status, actions. Shared by the header row so the columns line up. */
export const STAFF_COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1.6fr)_5.5rem_minmax(0,1.8fr)_5.5rem_9.5rem] lg:items-center lg:gap-4";

export function StaffListHead() {
  return <ListHead columns={STAFF_COLUMNS} labels={["Personel", "Rol", "Şube", "Durum", { srOnly: "İşlemler" }]} />;
}

export function StaffStatus({ active, className }: { active: boolean; className?: string }) {
  return (
    <ToneBadge tone={active ? ACTIVE_TONE.active : ACTIVE_TONE.inactive} dot className={className}>
      {active ? "Aktif" : "Pasif"}
    </ToneBadge>
  );
}

export function StaffRow({
  member,
  href,
  branchName,
  onAssign,
}: {
  member: MenuWaiterMember;
  href: string;
  /** null when the member has no branch. */
  branchName: string | null;
  onAssign: () => void;
}) {
  const role = parseStaffRole(member.staffRole);
  const roleTone = STAFF_ROLE_TONE[role];
  const assignLabel = branchName == null ? "Şubeye ata" : "Şubeyi değiştir";

  return (
    <li
      className={cn(LIST_ROW, STAFF_COLUMNS, !member.active && "text-muted-foreground")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold lg:size-9 lg:text-xs",
            member.active ? TONES[roleTone] : "bg-muted text-muted-foreground",
          )}
        >
          {staffInitials(member.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className={cn("block truncate text-sm font-medium text-foreground", LIST_ROW_LINK)}
          >
            {member.displayName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs lg:hidden">
            <ToneBadge tone={roleTone}>{STAFF_ROLE_LABEL[role]}</ToneBadge>
            <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
              <Building2 className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{branchName ?? "Şubesiz"}</span>
            </span>
            {!member.active ? <StaffStatus active={false} className="ml-auto shrink-0" /> : null}
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <ToneBadge tone={roleTone}>{STAFF_ROLE_LABEL[role]}</ToneBadge>
      </div>

      <p title={branchName ?? undefined} className={cn("hidden min-w-0 truncate text-sm lg:block", branchName == null && "text-muted-foreground")}>
        {branchName ?? "Şubesiz"}
      </p>

      <div className="hidden lg:block">
        <StaffStatus active={member.active} />
      </div>

      <div className="relative z-10 hidden justify-end lg:flex">
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAssign}>
          <Building2 className="size-3.5" aria-hidden />
          {assignLabel}
        </Button>
      </div>

      <div className="relative z-10 lg:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`${member.displayName} işlemleri`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem asChild className="gap-2">
              <Link href={href}>
                <UserRoundCog className="size-3.5" />
                Hesabı aç
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAssign} className="gap-2">
              <Building2 className="size-3.5" />
              {assignLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
