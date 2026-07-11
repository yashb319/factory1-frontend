import type { AiRelevantRecord } from "../types/ai.types";

type Props = {
  records?: AiRelevantRecord[];
};

export function AiRecordsView({ records }: Props) {
  if (!records || records.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {records.map((record, index) => (
        <div
          key={`${record.module}-${index}`}
          className="rounded-md border bg-muted/20 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
              {record.module}
            </span>
            <span className="text-sm font-medium">{record.title}</span>
          </div>
          {record.fields && Object.keys(record.fields).length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {Object.entries(record.fields).map(([key, value]) => (
                <div key={key} className="flex gap-1">
                  <span className="text-muted-foreground">{humanize(key)}:</span>
                  <span className="font-medium">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
