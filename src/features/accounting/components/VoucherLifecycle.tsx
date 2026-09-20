"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetAccountingVoucherHistoryQuery,
} from "@/features/accounting/api/accountingApi";
import type {
  AccountingVoucher,
  VoucherLifecycleStatus,
} from "@/features/accounting/types/accounting.types";
import { labelCase } from "@/features/accounting/utils/accountingFormat";

const statusClasses: Record<VoucherLifecycleStatus, string> = {
  DRAFT: "border-amber-300 bg-amber-50 text-amber-800",
  POSTED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  REVERSED: "border-slate-300 bg-slate-100 text-slate-700",
  CANCELLED: "border-rose-300 bg-rose-50 text-rose-800",
};

export function voucherStatus(voucher: AccountingVoucher): VoucherLifecycleStatus {
  return voucher.lifecycleStatus ?? (voucher.posted ? "POSTED" : "DRAFT");
}

export function VoucherLifecycleBadge({
  voucher,
}: {
  voucher: AccountingVoucher;
}) {
  const status = voucherStatus(voucher);

  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {labelCase(status)}
    </Badge>
  );
}

export function VoucherHistoryDialog({
  voucher,
  onOpenChange,
}: {
  voucher: AccountingVoucher | null;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    data: history = [],
    isFetching,
    isError,
    refetch,
  } = useGetAccountingVoucherHistoryQuery(voucher?.id ?? "", {
    skip: !voucher,
  });

  return (
    <Dialog open={Boolean(voucher)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Voucher history</DialogTitle>
          <DialogDescription>
            Immutable lifecycle events for {voucher?.voucherNumber ?? "this voucher"}.
          </DialogDescription>
        </DialogHeader>

        {voucher ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <VoucherLifecycleBadge voucher={voucher} />
              {voucher.sourceType ? <Badge variant="secondary">{voucher.sourceType} source</Badge> : null}
              {voucher.reversalOfVoucherId ? (
                <Badge variant="outline">Reversal of {voucher.reversalOfVoucherId}</Badge>
              ) : null}
            </div>
            {voucher.reversalReason ? (
              <p className="mt-2 text-muted-foreground">
                Reversal reason: {voucher.reversalReason}
              </p>
            ) : null}
          </div>
        ) : null}

        {isFetching ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading voucher history...
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p>Could not load voucher history.</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : history.length ? (
          <ol className="space-y-3">
            {history.map((event) => (
              <li key={event.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{labelCase(event.action)}</span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </div>
                {event.reason ? (
                  <p className="mt-2 text-sm text-muted-foreground">{event.reason}</p>
                ) : null}
                {event.actorId ? (
                  <p className="mt-1 text-xs text-muted-foreground">Actor: {event.actorId}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No lifecycle events have been recorded.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
