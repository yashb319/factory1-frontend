import { Button } from "@/components/ui/button";

export function CatalogPagination({
  page, totalPages, loading, onChange,
}: {
  page: number;
  totalPages: number;
  loading?: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1 && page === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Button type="button" size="sm" variant="outline" disabled={loading || page === 0} onClick={() => onChange(page - 1)}>Previous</Button>
      <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
      <Button type="button" size="sm" variant="outline" disabled={loading || page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}
