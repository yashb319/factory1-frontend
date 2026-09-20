"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TallyAccountMasters } from "@/components/layout/TallyAccountMasters";
import { TallyVoucherList } from "@/components/layout/TallyVoucherList";
import { AccountingVoucherEntryView } from "../components/AccountingVoucherEntryView";
import {
  useGetAccountMastersQuery,
  useCreateAccountGroupMutation,
  useUpdateAccountGroupMutation,
  useDeleteAccountGroupMutation,
  useGetAccountingVouchersQuery,
} from "@/features/accounting/api/accountingApi";
import type { AccountingVoucher, VoucherType } from "@/features/accounting/types/accounting.types";
import { voucherStatus } from "@/features/accounting/components/VoucherLifecycle";

export function TallyAccountingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const screenParam = searchParams.get("screen");
  const requestedVoucher = searchParams.get("voucher");
  const billingVoucher =
    requestedVoucher === "SALES" || requestedVoucher === "PURCHASE"
      ? requestedVoucher
      : null;
  const voucherParam = isManualVoucherType(requestedVoucher)
    ? requestedVoucher
    : null;

  useEffect(() => {
    if (billingVoucher) {
      router.replace(`/billing?type=${billingVoucher}`);
    }
  }, [billingVoucher, router]);

  const showMasters = screenParam === "masters" || !voucherParam;
  const activeVoucher: VoucherType | null = voucherParam ?? null;

  const [entry, setEntry] = useState<{
    mode: "create" | "alter";
    voucher?: AccountingVoucher;
  } | null>(null);

  const { data: masters, isFetching: mastersFetching } =
    useGetAccountMastersQuery();
  const { data: vouchers, isFetching: vouchersFetching } =
    useGetAccountingVouchersQuery();

  const [createGroup, createGroupState] = useCreateAccountGroupMutation();
  const [updateGroup, updateGroupState] = useUpdateAccountGroupMutation();
  const [deleteGroup] = useDeleteAccountGroupMutation();

  const filteredVouchers = (() => {
    if (!vouchers) return [];
    if (!activeVoucher) return vouchers;
    return vouchers.filter((v) => v.voucherType === activeVoucher);
  })();

  const onBack = () => router.push("/gateway?menu=accounting");

  if (billingVoucher) {
    return null;
  }

  if (entry) {
    return (
      <AccountingVoucherEntryView
        voucherType={activeVoucher as VoucherType}
        mode={entry.mode}
        voucher={entry.voucher}
        onBack={() => setEntry(null)}
      />
    );
  }

  function isManualVoucherType(value: string | null): value is VoucherType {
    return [
      "PAYMENT",
      "RECEIPT",
      "CONTRA",
      "JOURNAL",
      "DEBIT_NOTE",
      "CREDIT_NOTE",
    ].includes(value ?? "");
  }

  if (showMasters) {
    return (
      <TallyAccountMasters
        masters={masters}
        onBack={onBack}
        onCreateGroup={(request) => createGroup(request).unwrap()}
        onUpdateGroup={(request) => updateGroup(request).unwrap()}
        onDeleteGroup={(id) => deleteGroup(id).unwrap()}
        isCreating={createGroupState.isLoading}
        isUpdating={updateGroupState.isLoading}
      />
    );
  }

  return (
    <TallyVoucherList
      voucherType={activeVoucher as VoucherType}
      vouchers={filteredVouchers}
      isFetching={mastersFetching || vouchersFetching}
      onSelectVoucher={(voucher) => {
        if (voucher.sourceType) {
          toast.info("Source-generated vouchers are corrected from Billing");
          return;
        }
        if (voucherStatus(voucher) !== "DRAFT") {
          toast.info("Only draft vouchers can be altered. Posted vouchers are immutable.");
          return;
        }
        setEntry({ mode: "alter", voucher });
      }}
      onCreateNew={() => setEntry({ mode: "create" })}
      onBack={onBack}
    />
  );
}
