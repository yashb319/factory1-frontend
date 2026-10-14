import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/apiError";

export function FoundationError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
    <p>{getErrorMessage(error, "This request could not be completed. Refresh before trying again.")}</p>
    {onRetry ? <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>Retry</Button> : null}
  </div>;
}

export function PageControls({ offset, limit, total, busy, onChange, label }: {
  offset: number; limit: number; total: number; busy: boolean; onChange: (offset: number) => void; label: string;
}) {
  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center gap-3 text-sm">
    <Button type="button" variant="outline" disabled={busy || offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>Previous {label}</Button>
    <span aria-live="polite">{total ? `${offset + 1}-${Math.min(offset + limit, total)} of ${total}` : "No results"}</span>
    <Button type="button" variant="outline" disabled={busy || offset + limit >= total} onClick={() => onChange(offset + limit)}>Next {label}</Button>
  </nav>;
}
