"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CourierDisplayBoard } from "@/components/courier/CourierDisplayBoard";
import { isBranchCourierEnabled } from "@/lib/branch";
import { ordersForStaffBranch } from "@/lib/branch-scope";
import { advanceStoreCourierOrder, listStoreCourierQueue } from "@/lib/store-courier";

import { OwnerScreenFrame, OwnerScreenNotice, useOwnerScreenBranch } from "./OwnerScreenFrame";

const OWNER_COURIER_QUEUE_KEY = "owner-courier-queue";

export default function OwnerCourierView({ initialBranchId }: { initialBranchId: number | null }) {
  const queryClient = useQueryClient();
  const screen = useOwnerScreenBranch("courier", initialBranchId, isBranchCourierEnabled);
  const branch = screen.branch;
  const courierEnabled = isBranchCourierEnabled(branch);

  const queueQuery = useQuery({
    queryKey: [OWNER_COURIER_QUEUE_KEY, branch?.id],
    enabled: branch != null && courierEnabled,
    queryFn: async () => ordersForStaffBranch(await listStoreCourierQueue(), branch!.id),
    refetchInterval: 6_000,
  });

  const action = useMutation({
    mutationFn: (payload: { orderId: number; kind: "dispatch" | "deliver" }) =>
      advanceStoreCourierOrder(payload.orderId, payload.kind),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [OWNER_COURIER_QUEUE_KEY] });
    },
  });

  return (
    <OwnerScreenFrame
      title="Kurye"
      branches={screen.branches}
      branch={branch}
      onBranchChange={screen.selectBranch}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Kurye</h1>
          <p className="text-sm text-muted-foreground">
            {branch ? `${branch.name} teslimleri` : "Teslimler"}
          </p>
        </div>
        {screen.loading ? (
          <p className="text-sm text-muted-foreground">Şubeler yükleniyor…</p>
        ) : screen.error ? (
          <OwnerScreenNotice branch={null} message={screen.error} />
        ) : !branch ? (
          <OwnerScreenNotice branch={null} message="Henüz şube bulunmuyor." />
        ) : !courierEnabled ? (
          <OwnerScreenNotice branch={branch} message="Bu şubede kurye kapalı. Şube ayarlarından açabilirsiniz." />
        ) : (
          <CourierDisplayBoard
            orders={queueQuery.data ?? []}
            loading={queueQuery.isLoading}
            error={
              queueQuery.error instanceof Error
                ? queueQuery.error.message
                : action.error instanceof Error
                  ? action.error.message
                  : null
            }
            busyOrderId={action.isPending ? action.variables?.orderId : null}
            onDispatch={(orderId) => action.mutate({ orderId, kind: "dispatch" })}
            onDeliver={(orderId) => action.mutate({ orderId, kind: "deliver" })}
          />
        )}
      </div>
    </OwnerScreenFrame>
  );
}
