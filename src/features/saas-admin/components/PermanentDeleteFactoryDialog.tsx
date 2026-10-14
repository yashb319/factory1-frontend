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
  type FactoryDeletionRetention,
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
    "The factory has a paid subscription. It can only be deleted as real data under a reviewed retention policy (financial records are archived).",
  SHARED_USER_MEMBERSHIP:
    "Some user accounts also belong to other factories and cannot be removed.",
  UNMANAGED_ASSET_KEY:
    "Some stored files are outside managed storage and cannot be verified for cleanup.",
  STORAGE_NAMESPACE_CHANGED:
    "File cleanup failed because the S3 endpoint, region, or bucket no longer matches this deletion's original storage binding. Deletion is not complete; restore the original storage configuration before retrying.",
  REAL_DATA_RETENTION_POLICY_REQUIRED:
    "Deleting factories with real business data is not enabled until the data retention policy is finalized.",
};

export const REAL_ARCHIVE_CLEARABLE_BLOCKERS = new Set([
  "PAID_SUBSCRIPTION_REQUIRES_POLICY",
]);

/**
 * Blockers that still apply for the chosen scope. A paid subscription can only
 * be cleared by a real-data deletion under a reviewed retention policy; it is
 * never cleared by claiming the factory holds only dummy data.
 */
export function activeDeletionBlockers(
  blockers: string[],
  scope: "dummy" | "real" | null,
  realAllowed: boolean
) {
  if (scope === "real" && realAllowed) {
    return blockers.filter((code) => !REAL_ARCHIVE_CLEARABLE_BLOCKERS.has(code));
  }
  return blockers;
}

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
  /** keepOpen is true when a retained archive summary must stay visible. */
  onCompleted: (organizationId: string, options: { keepOpen: boolean }) => void;
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
  onCompleted: Props["onCompleted"];
}) {
  const nameInputId = useId();
  const phraseInputId = useId();
  const scopeName = useId();
  const [typedName, setTypedName] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");
  const [dataScope, setDataScope] = useState<DataScope | null>(null);
  const [retentionPolicyId, setRetentionPolicyId] = useState("");
  const policyInputId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [job, setJob] = useState<FactoryDeletionJob | null>(null);
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
      currentJob.retention
        ? `${factory.name}'s live data was deleted; required records remain in the restricted retention archive`
        : `${factory.name} and all its data were permanently deleted`
    );
    onCompleted(factory.organizationId, {
      keepOpen: Boolean(currentJob.retention),
    });
  }, [currentJob, factory.name, factory.organizationId, onCompleted]);

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
  const realAllowed = previewData?.realDeletionPolicyConfigured === true;
  const policyOk =
    dataScope === "dummy" ||
    (dataScope === "real" && realAllowed && retentionPolicyId.trim() !== "");

  const activeBlockers = activeDeletionBlockers(blockers, dataScope, realAllowed);

  const canDelete =
    showConfirmation &&
    preview.isSuccess &&
    !!previewData &&
    activeBlockers.length === 0 &&
    nameMatches &&
    phraseMatches &&
    dataScope !== null &&
    policyOk &&
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
    void runRequest(() =>
      deleteFactory({
        organizationId: factory.organizationId,
        body: {
          factoryName: typedName,
          confirmation: typedPhrase,
          dummyDataOnly: dataScope === "dummy",
          ...(dataScope === "real"
            ? { retentionPolicyId: retentionPolicyId.trim() }
            : {}),
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

        {showConfirmation ? (
          <DeletionScopeWarning scope={dataScope} realAllowed={realAllowed} />
        ) : null}

        {showConfirmation ? (
          <DeletionPreviewSection
            isLoading={preview.isLoading || preview.isFetching}
            isError={preview.isError}
            error={preview.error}
            preview={previewData}
            activeBlockers={activeBlockers}
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
                  disabled={!realAllowed}
                  onChange={() => setDataScope("real")}
                  onKeyDown={blockEnter}
                />
                Real business data (restricted retention archive)
              </label>
              {previewData && !realAllowed ? (
                <p className="text-xs text-slate-500">
                  Real-data deletion is unavailable: no reviewed retention
                  policy is configured for this factory.
                </p>
              ) : null}
            </fieldset>

            {dataScope === "real" ? (
              <label htmlFor={policyInputId} className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">
                  Reviewed retention policy ID
                </span>
                <Input
                  id={policyInputId}
                  autoComplete="off"
                  spellCheck={false}
                  value={retentionPolicyId}
                  disabled={isSubmitting}
                  onChange={(event) => setRetentionPolicyId(event.target.value)}
                  onKeyDown={blockEnter}
                />
              </label>
            ) : null}

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

function DeletionScopeWarning({
  scope,
  realAllowed,
}: {
  scope: DataScope | null;
  realAllowed: boolean;
}) {
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
            The reviewed retention policy bound to this factory decides the
            jurisdiction and retention date.
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
          archive{realAllowed ? "" : " and need a reviewed retention policy"}.
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
  activeBlockers,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  preview: FactoryDeletionPreview | undefined;
  activeBlockers: string[];
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
      {activeBlockers.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <p className="font-semibold">Deletion is blocked:</p>
          <ul className="mt-1 list-disc pl-4">
            {activeBlockers.map((code) => (
              <li key={code}>{describeDeletionCode(code)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.blockers.length > activeBlockers.length ? (
        <p className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700">
          Paid subscription records will be kept in the restricted retention
          archive under the reviewed policy.
        </p>
      ) : null}
    </section>
  );
}

export function DeletionStatusPanel({
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

  const retention = job?.retention ?? null;
  const retentionPanel = retention ? (
    <RetentionSummary retention={retention} />
  ) : null;

  if (status === "COMPLETED") {
    return (
      <>
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {retention
            ? "Live deletion completed. Live data, accounts and files were removed; required records remain in the restricted retention archive."
            : "Deletion completed. The factory, its data and its files were removed."}
        </div>
        {retentionPanel}
      </>
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
        {retentionPanel}
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
      {retentionPanel}
    </div>
  );
}

function RetentionSummary({
  retention,
}: {
  retention: FactoryDeletionRetention;
}) {
  const categories = Object.entries(retention.categories ?? {});
  return (
    <section
      aria-label="Retained archive"
      className="mt-2 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700"
    >
      <p className="font-semibold">Restricted retention archive (not erased)</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
        <dt>Retained until</dt>
        <dd className="font-medium">{retention.retainUntil}</dd>
        <dt>Jurisdiction</dt>
        <dd className="font-medium">{retention.jurisdiction}</dd>
        <dt>Legal hold</dt>
        <dd className="font-medium">
          {retention.legalHold ? "Active - purge blocked" : "None"}
        </dd>
        <dt>Policy</dt>
        <dd className="font-medium break-all">{retention.policyId}</dd>
        <dt>Archive</dt>
        <dd className="font-medium break-all">{retention.archiveId}</dd>
      </dl>
      {categories.length > 0 ? (
        <ul className="mt-2 grid grid-cols-2 gap-1">
          {categories.map(([table, count]) => (
            <li
              key={table}
              className="flex justify-between rounded border bg-slate-50 px-2 py-1"
            >
              <span>{formatLabel(table)}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2">
        Purged only after the retention date and only when no legal hold
        applies.
      </p>
    </section>
  );
}

/**
 * Reopens a recorded deletion (e.g. after a reload, when the factory is no
 * longer in the dashboard) to watch pending cleanup or retry a failed one.
 */
export function FactoryDeletionJobDialog({
  job,
  onClose,
}: {
  job: FactoryDeletionJob | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={job !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {job ? <DeletionJobBody key={job.organizationId} initialJob={job} /> : null}
    </AlertDialog>
  );
}

function DeletionJobBody({ initialJob }: { initialJob: FactoryDeletionJob }) {
  const organizationId = initialJob.organizationId;
  const [job, setJob] = useState<FactoryDeletionJob>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [retryAssets, retryState] = useRetryFactoryDeletionAssetsMutation();
  const polling = isDeletionInProgress(job.status);
  const statusQuery = useGetFactoryDeletionStatusQuery(organizationId, {
    pollingInterval: polling ? DELETION_POLL_INTERVAL_MS : 0,
    skipPollingIfUnfocused: false,
    refetchOnMountOrArgChange: true,
  });
  const polledJob = statusQuery.data?.data;
  const polledAt = statusQuery.fulfilledTimeStamp;
  useEffect(() => {
    if (polledJob && polledJob.organizationId === organizationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server status updates
      setJob(polledJob);
    }
  }, [organizationId, polledAt, polledJob]);

  async function retry() {
    if (submittingRef.current || job.status !== "ASSET_CLEANUP_FAILED") return;
    submittingRef.current = true;
    setError(null);
    try {
      const response = await retryAssets(organizationId).unwrap();
      setJob(response.data);
    } catch (err) {
      setError(
        describeDeletionCode(getErrorMessage(err, "Retry was not accepted."))
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <AlertDialogContent
      className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>Factory deletion status</AlertDialogTitle>
        <AlertDialogDescription className="break-all">
          Organization ID {organizationId}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-3 text-sm">
        <DeletionStatusPanel
          status={job.status}
          job={job}
          loading={false}
          pollError={statusQuery.isError}
        />
        {error ? (
          <div role="alert" className="rounded-lg border border-red-300 bg-white p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={retryState.isLoading}>Close</AlertDialogCancel>
        {job.status === "ASSET_CLEANUP_FAILED" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={retryState.isLoading}
            aria-busy={retryState.isLoading}
            onClick={retry}
          >
            {retryState.isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {retryState.isLoading ? "Retrying..." : "Retry file cleanup"}
          </Button>
        ) : null}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
