"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/apiError";
import {
  useGetFactoryDeletionPreviewQuery,
  useGetFactoryDeletionStatusQuery,
  usePermanentlyDeleteFactoryMutation,
  useRetryFactoryDeletionAssetsMutation,
} from "../api/saasAdminApi";
import {
  PERMANENT_DELETION_CONFIRMATION,
  type FactoryDeletionJob,
  type FactoryDeletionPreview,
  type FactoryDeletionStatus,
  type SaasFactory,
} from "../types/saasAdmin.types";

export const DELETION_POLL_INTERVAL_MS = 3000;

export function isDeletionInProgress(status?: FactoryDeletionStatus | null) {
  return status === "ASSET_CLEANUP_PENDING";
}

const CODE_MESSAGES: Record<string, string> = {
  PROTECTED_ORGANIZATION: "This is a protected platform organization.",
  PAID_SUBSCRIPTION_REQUIRES_POLICY:
    "The factory has a paid subscription; deletion needs a retention policy decision.",
  SHARED_USER_MEMBERSHIP:
    "Some user accounts also belong to other factories and cannot be removed.",
  UNMANAGED_ASSET_KEY:
    "Some stored files are outside managed storage and cannot be verified for cleanup.",
  REAL_DATA_RETENTION_POLICY_REQUIRED:
    "Deleting factories with real business data is not enabled until the data retention policy is finalized.",
};

export function describeDeletionCode(code: string) {
  if (code.startsWith("SHARED_REFERENCE:")) {
    const table = code.slice("SHARED_REFERENCE:".length);
    return `Shared platform records reference this factory (${table}).`;
  }
  return CODE_MESSAGES[code] ?? code;
}

function formatLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type DataScope = "dummy" | "real";

type Props = {
  factory: SaasFactory | null;
  onClose: () => void;
  onCompleted: (organizationId: string) => void;
};

/**
 * Platform-admin-only permanent deletion of an onboarded factory and all of
 * its tenant data. Rendered only from SaaS admin screens that are already
 * gated on `user.platformAdmin`; the backend enforces ROLE_PLATFORM_ADMIN.
 */
export function PermanentDeleteFactoryDialog({
  factory,
  onClose,
  onCompleted,
}: Props) {
  return (
    <AlertDialog
      open={factory !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {factory ? (
        <DeleteFactoryDialogBody
          key={factory.organizationId}
          factory={factory}
          onCompleted={onCompleted}
        />
      ) : null}
    </AlertDialog>
  );
}

function DeleteFactoryDialogBody({
  factory,
  onCompleted,
}: {
  factory: SaasFactory;
  onCompleted: (organizationId: string) => void;
}) {
  const nameInputId = useId();
  const phraseInputId = useId();
  const scopeName = useId();
  const [typedName, setTypedName] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");
  const [dataScope, setDataScope] = useState<DataScope | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [job, setJob] = useState<FactoryDeletionJob | null>(null);
  const [submittedScope, setSubmittedScope] = useState<DataScope | null>(null);
  const submittingRef = useRef(false);
  const completedRef = useRef(false);

  // A factory with a recorded deletion has already had its tenant rows purged,
  // so only its deletion status is meaningful.
  const alreadyDeleting = Boolean(factory.deletionStatus);

  const preview = useGetFactoryDeletionPreviewQuery(factory.organizationId, {
    skip: alreadyDeleting,
    refetchOnMountOrArgChange: true,
  });
  const [deleteFactory, deleteState] = usePermanentlyDeleteFactoryMutation();
  const [retryAssets, retryState] = useRetryFactoryDeletionAssetsMutation();

  const currentStatus = job?.status ?? factory.deletionStatus ?? null;
  const polling = isDeletionInProgress(currentStatus);
  const statusQuery = useGetFactoryDeletionStatusQuery(factory.organizationId, {
    skip: !alreadyDeleting && !polling,
    pollingInterval: polling ? DELETION_POLL_INTERVAL_MS : 0,
    skipPollingIfUnfocused: false,
    refetchOnMountOrArgChange: true,
  });

  const polledJob = statusQuery.data?.data;
  const polledAt = statusQuery.fulfilledTimeStamp;
  useEffect(() => {
    if (polledJob && polledJob.organizationId === factory.organizationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server status updates
      setJob(polledJob);
    }
  }, [factory.organizationId, polledAt, polledJob]);

  const currentJob = job;

  useEffect(() => {
    if (currentJob?.status !== "COMPLETED" || completedRef.current) return;
    completedRef.current = true;
    toast.success(
      submittedScope === "real"
        ? `${factory.name}'s live data was deleted; required records remain in the restricted retention archive`
        : `${factory.name} and all its data were permanently deleted`
    );
    onCompleted(factory.organizationId);
  }, [
    currentJob?.status,
    factory.name,
    factory.organizationId,
    onCompleted,
    submittedScope,
  ]);

  const previewData = preview.data?.data;
  const blockers = previewData?.blockers ?? [];
  const expectedName = previewData?.factoryName ?? factory.name;
  const expectedPhrase =
    previewData?.confirmationText || PERMANENT_DELETION_CONFIRMATION;
  const nameMatches = typedName === expectedName;
  const phraseMatches = typedPhrase === expectedPhrase;
  const isSubmitting = deleteState.isLoading || retryState.isLoading;
  const failed = currentStatus === "ASSET_CLEANUP_FAILED";
  const showConfirmation = !alreadyDeleting && currentStatus === null;

  const canDelete =
    showConfirmation &&
    preview.isSuccess &&
    !!previewData &&
    blockers.length === 0 &&
    nameMatches &&
    phraseMatches &&
    dataScope !== null &&
    !isSubmitting;

  async function runRequest(request: () => Promise<{ data: FactoryDeletionJob }>) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);
    try {
      const response = await request();
      setJob(response.data);
    } catch (error) {
      setSubmitError(
        describeDeletionCode(
          getErrorMessage(
            error,
            "The server did not confirm the deletion. Nothing is reported as deleted."
          )
        )
      );
    } finally {
      submittingRef.current = false;
    }
  }

  function submitDeletion() {
    if (!canDelete) return;
    setSubmittedScope(dataScope);
    void runRequest(() =>
      deleteFactory({
        organizationId: factory.organizationId,
        body: {
          factoryName: typedName,
          confirmation: typedPhrase,
          dummyDataOnly: dataScope === "dummy",
        },
      }).unwrap()
    );
  }

  function submitRetry() {
    if (!failed || isSubmitting) return;
    void runRequest(() => retryAssets(factory.organizationId).unwrap());
  }

  const blockEnter = (event: React.KeyboardEvent) => {
    // Destructive actions require an explicit button click.
    if (event.key === "Enter") event.preventDefault();
  };

  return (
    <AlertDialogContent
      className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg"
      onOpenAutoFocus={(event) => {
        // Never land focus on a destructive control when the dialog opens.
        event.preventDefault();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={18} />
          Permanently delete factory
        </AlertDialogTitle>
        <AlertDialogDescription>
          This is irreversible. Unlike Terminate, which only blocks login and
          keeps data, this erases the factory completely.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-4 text-sm">
        <section
          className="rounded-lg border bg-slate-50 p-3"
          aria-label="Factory to delete"
        >
          <p className="font-semibold">{factory.name}</p>
          <p className="text-xs text-slate-600">
            Owner: {factory.owner?.name ?? "No owner"}
            {factory.owner?.email ? ` (${factory.owner.email})` : ""}
          </p>
          <p className="text-xs text-slate-600">
            Factory email: {factory.email ?? "No email"} • Status:{" "}
            {factory.status ?? "ACTIVE"} • Plan: {factory.plan}
          </p>
        </section>

        {showConfirmation ? <DeletionScopeWarning scope={dataScope} /> : null}

        {showConfirmation ? (
          <DeletionPreviewSection
            isLoading={preview.isLoading || preview.isFetching}
            isError={preview.isError}
            error={preview.error}
            preview={previewData}
            onRetry={() => preview.refetch()}
          />
        ) : null}

        {currentJob || alreadyDeleting ? (
          <DeletionStatusPanel
            status={currentStatus}
            job={currentJob}
            loading={!currentJob && statusQuery.isFetching}
            pollError={statusQuery.isError}
          />
        ) : null}

        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-white p-3 text-xs text-red-700"
          >
            {submitError}
          </div>
        ) : null}

        {showConfirmation ? (
          <div className="space-y-3">
            <fieldset className="space-y-1" disabled={isSubmitting}>
              <legend className="text-xs font-medium text-slate-700">
                What data does this factory contain?
              </legend>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name={scopeName}
                  checked={dataScope === "dummy"}
                  onChange={() => setDataScope("dummy")}
                  onKeyDown={blockEnter}
                />
                Only dummy / test data
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name={scopeName}
                  checked={dataScope === "real"}
                  onChange={() => setDataScope("real")}
                  onKeyDown={blockEnter}
                />
                Real business data (subject to the data retention policy)
              </label>
            </fieldset>

            <label htmlFor={nameInputId} className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">
                Type the factory name{" "}
                <strong className="select-all">{expectedName}</strong> to
                confirm
              </span>
              <Input
                id={nameInputId}
                autoComplete="off"
                spellCheck={false}
                value={typedName}
                disabled={isSubmitting}
                aria-invalid={typedName.length > 0 && !nameMatches}
                onChange={(event) => setTypedName(event.target.value)}
                onKeyDown={blockEnter}
              />
            </label>

            <label htmlFor={phraseInputId} className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">
                Type <strong className="select-all">{expectedPhrase}</strong>{" "}
                to confirm permanent deletion
              </span>
              <Input
                id={phraseInputId}
                autoComplete="off"
                spellCheck={false}
                value={typedPhrase}
                disabled={isSubmitting}
                aria-invalid={typedPhrase.length > 0 && !phraseMatches}
                onChange={(event) => setTypedPhrase(event.target.value)}
                onKeyDown={blockEnter}
              />
            </label>
          </div>
        ) : null}
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSubmitting}>
          {currentStatus === null ? "Cancel" : "Close"}
        </AlertDialogCancel>
        {showConfirmation ? (
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete}
            aria-busy={isSubmitting}
            onClick={submitDeletion}
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {isSubmitting ? "Deleting..." : "Permanently delete"}
          </Button>
        ) : null}
        {failed ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={submitRetry}
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isSubmitting ? "Retrying..." : "Retry file cleanup"}
          </Button>
        ) : null}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

function DeletionScopeWarning({ scope }: { scope: DataScope | null }) {
  if (scope === "real") {
    return (
      <div
        role="note"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
      >
        <p className="font-semibold">Real factory: live data deletion with retained archive</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Live operational data in every module, user accounts and files are removed.</li>
          <li>
            Financial and statutory records required by law are not erased
            now. They move to a restricted retention archive and are purged
            only after the reviewed retention period, and only if no legal
            hold applies.
          </li>
          <li>
            This path stays blocked until an approved retention policy exists.
          </li>
        </ul>
        <p className="mt-1">
          Other factories and platform-wide records are not affected. The live
          deletion cannot be undone.
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
    >
      <p className="font-semibold">
        {scope === "dummy"
          ? "Dummy / test factory: complete purge"
          : "Choose below whether this factory holds only dummy data."}
      </p>
      {scope === "dummy" ? (
        <>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Data in every module (HR, attendance, payroll, inventory, production, sales, billing and more)</li>
            <li>The owner, employee and user accounts that belong only to this factory</li>
            <li>All uploaded files, documents and generated exports</li>
          </ul>
          <p className="mt-1">
            Everything above is permanently erased. Other factories and
            platform-wide records are not affected. This cannot be undone.
          </p>
        </>
      ) : (
        <p className="mt-1">
          Deletion is irreversible. Dummy factories are purged completely;
          real factories keep legally required records in a restricted
          archive.
        </p>
      )}
    </div>
  );
}

function DeletionPreviewSection({
  isLoading,
  isError,
  error,
  preview,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  preview: FactoryDeletionPreview | undefined;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <p>
          Could not load the deletion preview:{" "}
          {getErrorMessage(error, "unknown error")}. Deletion stays disabled
          until the server confirms what will be removed.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={onRetry}
        >
          <RefreshCw size={14} />
          Retry preview
        </Button>
      </div>
    );
  }

  if (isLoading && !preview) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Loading deletion preview...
      </p>
    );
  }

  if (!preview) return null;

  const modules = Object.entries(preview.countsByModule ?? {});
  const totalRecords = Object.values(preview.countsByTable ?? {}).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <section className="space-y-2" aria-label="Deletion preview">
      <p className="text-xs font-semibold text-slate-700">
        Server preview: {totalRecords} records across{" "}
        {Object.keys(preview.countsByTable ?? {}).length} tables will be
        deleted
      </p>
      {modules.length > 0 ? (
        <ul className="grid grid-cols-2 gap-1 text-xs">
          {modules.map(([module, count]) => (
            <li
              key={module}
              className="flex justify-between rounded border bg-white px-2 py-1"
            >
              <span>{formatLabel(module)}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {preview.blockers.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <p className="font-semibold">Deletion is blocked:</p>
          <ul className="mt-1 list-disc pl-4">
            {preview.blockers.map((code) => (
              <li key={code}>{describeDeletionCode(code)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function DeletionStatusPanel({
  status,
  job,
  loading,
  pollError,
}: {
  status: FactoryDeletionStatus | null;
  job: FactoryDeletionJob | null;
  loading: boolean;
  pollError: boolean;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Loading deletion status...
      </p>
    );
  }

  if (status === "COMPLETED") {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
      >
        Deletion completed. The factory, its data and its files were removed.
      </div>
    );
  }

  const attempts = job ? ` Attempts: ${job.attempts}.` : "";

  if (status === "ASSET_CLEANUP_FAILED") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800"
      >
        <p className="font-semibold">Deletion is not complete.</p>
        <p>
          Factory data was deleted, but stored-file cleanup failed and could
          not be verified.{attempts}
        </p>
        {job?.errorCode ? (
          <p>Error: {describeDeletionCode(job.errorCode)}</p>
        ) : null}
        <p>The factory cannot be used. Retry the file cleanup.</p>
        {pollError ? <p>Could not refresh deletion status.</p> : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Loader2 size={14} className="animate-spin" />
        Deletion in progress
      </p>
      <p>
        Factory data was deleted and the factory cannot be used. Stored-file
        cleanup is still running, so it is not fully deleted yet.{attempts}
      </p>
      {pollError ? (
        <p className="mt-1">Could not refresh status; retrying automatically.</p>
      ) : null}
    </div>
  );
}
