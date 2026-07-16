"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TallyAccountMasters } from "@/components/layout/TallyAccountMasters";
import { TallyVoucherList } from "@/components/layout/TallyVoucherList";
import { AccountingVoucherEntryView } from "./AccountingVoucherEntryView";
import {
  useGetAccountMastersQuery,
  useCreateAccountGroupMutation,
  useUpdateAccountGroupMutation,
  useDeleteAccountGroupMutation,
  useGetAccountingVouchersQuery,
} from "@/features/accounting/api/accountingApi";
import type { AccountingVoucher, VoucherType } from "@/features/accounting/types/accounting.types";

export function TallyAccountingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const screenParam = searchParams.get("screen");
  const voucherParam = searchParams.get("voucher") as VoucherType | null;

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

  const filteredVouchers = useMemo(() => {
    if (!vouchers) return [];
    if (!activeVoucher) return vouchers;
    return vouchers.filter((v) => v.voucherType === activeVoucher);
  }, [vouchers, activeVoucher]);

  const onBack = () => router.push("/gateway?menu=accounting");

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
      onSelectVoucher={(voucher) => setEntry({ mode: "alter", voucher })}
      onCreateNew={() => setEntry({ mode: "create" })}
      onBack={onBack}
    />
  );
}
