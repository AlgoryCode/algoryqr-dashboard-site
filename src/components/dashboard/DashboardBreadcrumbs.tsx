"use client";

import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildDashboardBreadcrumbs } from "@/lib/dashboard-routes";

type DashboardBreadcrumbsProps = {
  pathname: string;
  currentLabel?: string;
};

export function DashboardBreadcrumbs({ pathname, currentLabel }: DashboardBreadcrumbsProps) {
  const items = buildDashboardBreadcrumbs(pathname, currentLabel);
  if (items.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4 flex">
      <BreadcrumbList className="rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs sm:text-[13px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className={isLast ? "font-medium text-[#F03245] dark:text-[#FB7185]" : undefined}>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
