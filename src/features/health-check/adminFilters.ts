import type {
  HealthCheckArea,
  HealthCheckLeadFilters,
  HealthCheckLeadStatus,
  HealthCheckPriority,
} from "./types";

type FilterValue<T extends string> = T | "ALL";

export function buildHealthCheckLeadFilters(input: {
  page: number;
  query?: string;
  priority: FilterValue<HealthCheckPriority>;
  primaryArea: FilterValue<HealthCheckArea>;
  status: FilterValue<HealthCheckLeadStatus>;
  createdFrom: string;
  createdTo: string;
  consent: "ALL" | "YES" | "NO";
}): HealthCheckLeadFilters {
  return {
    page: input.page,
    size: 20,
    sortBy: "createdAt",
    sortDirection: "DESC",
    query: input.query || undefined,
    priority: input.priority === "ALL" ? undefined : input.priority,
    primaryArea: input.primaryArea === "ALL" ? undefined : input.primaryArea,
    status: input.status === "ALL" ? undefined : input.status,
    createdFrom: input.createdFrom ? `${input.createdFrom}T00:00:00` : undefined,
    createdTo: input.createdTo ? `${input.createdTo}T23:59:59` : undefined,
    consent: input.consent === "ALL" ? undefined : input.consent === "YES",
  };
}
