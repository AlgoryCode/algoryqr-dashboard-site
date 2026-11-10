"use client";

import { type MouseEvent } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import type { BranchItem } from "@/lib/branch";
import {
  kitchenOrderToReceipt,
  marketplaceOrderToReceipt,
  printReceiptInBrowser,
  receiptTemplateFromBranch,
  withReceiptTemplate,
  type KitchenLikeOrder,
  type MarketplaceLikeOrder,
} from "@/lib/receipt-ticket";

type PrintOrderButtonProps = (
  | {
      kind: "marketplace";
      source: "YEMEK_SEPETI" | "UBER_EATS";
      order: MarketplaceLikeOrder;
    }
  | {
      kind: "kitchen";
      order: KitchenLikeOrder;
    }
) & {
  /** Branch whose receipt template is used; a merchant with one branch does not need it. */
  branchId?: number | null;
};

function receiptBranch(branches: BranchItem[], branchId?: number | null): BranchItem | null {
  if (branchId != null) return branches.find((branch) => branch.id === branchId) ?? null;
  return branches.length === 1 ? branches[0] : null;
}

/**
 * Prints one order receipt through the browser's print dialog, where the printer is picked.
 * The branch template (heading, paragraph, footer) wraps the order details on every print.
 */
export function PrintOrderButton(props: PrintOrderButtonProps) {
  const branchesQuery = useBranches();

  function onPrint(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const payload =
      props.kind === "marketplace"
        ? marketplaceOrderToReceipt(props.order, props.source)
        : kitchenOrderToReceipt(props.order);
    const branch = receiptBranch(branchesQuery.data?.content ?? [], props.branchId);
    printReceiptInBrowser(withReceiptTemplate(payload, receiptTemplateFromBranch(branch)));
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={onPrint}>
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Fiş bas
    </Button>
  );
}
