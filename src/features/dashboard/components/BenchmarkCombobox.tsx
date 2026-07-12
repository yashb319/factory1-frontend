"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useLazyGetListedBenchmarkQuery,
  useLazySearchListedCompaniesQuery,
} from "@/features/ai/api/aiApi";
import type {
  BenchmarkProfile,
  ListedCompanyRef,
} from "@/features/ai/types/ai.types";

type Props = {
  profiles: BenchmarkProfile[];
  selected?: BenchmarkProfile;
  onSelect: (profile: BenchmarkProfile) => void;
};

const searchCache = new Map<string, ListedCompanyRef[]>();

function cachedSearch(
  trigger: (arg: { provider: string; query: string }) => unknown,
  provider: string,
  term: string
): Promise<ListedCompanyRef[]> {
  const key = provider + ":" + term;
  const cached = searchCache.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  const result = (
    trigger({ provider, query: term }) as {
      unwrap: () => Promise<ListedCompanyRef[]>;
    }
  ).unwrap();
  return result.then((res) => {
    searchCache.set(key, res);
    return res;
  });
}

const optionClass =
  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground";

export function BenchmarkCombobox({ profiles, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ListedCompanyRef[]>([]);
  const [searchListed, { isFetching: searching }] =
    useLazySearchListedCompaniesQuery();
  const [loadBenchmark, { isFetching: loadingProfile }] =
    useLazyGetListedBenchmarkQuery();
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        boxRef.current &&
        !boxRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounce.current) {
      clearTimeout(debounce.current);
    }
    debounce.current = setTimeout(async () => {
      const term = query.trim();
      try {
        const indian = await cachedSearch(searchListed, "indian", term);
        if (indian.length > 0) {
          setSuggestions(indian);
          return;
        }
      } catch {
        // fall through to a single Roic lookup below
      }

      // Indian returned nothing (or failed): make exactly one Roic call.
      try {
        const roic = await cachedSearch(searchListed, "roic", term);
        setSuggestions(roic);
      } catch {
        setSuggestions([]);
      }
    }, 500);

    return () => {
      if (debounce.current) {
        clearTimeout(debounce.current);
      }
    };
  }, [query, open, searchListed]);

  const filteredStatic =
    query.trim().length === 0
      ? profiles
      : profiles.filter((p) =>
          p.label.toLowerCase().includes(query.trim().toLowerCase())
        );

  const handlePick = async (ref: ListedCompanyRef) => {
    try {
      const profile = await loadBenchmark({
        provider: ref.provider,
        symbol: ref.symbol,
      }).unwrap();
      onSelect(profile);
      setOpen(false);
      setQuery("");
      setSuggestions([]);
    } catch {
      // surfaced by loading state; ignore here
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 justify-between gap-1"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="max-w-[180px] truncate">
          {selected?.label ?? "Select benchmark"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-lg border bg-popover p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="h-8 pl-7 text-xs"
              placeholder="Search a public company…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredStatic.map((profile) => (
              <button
                key={profile.key}
                type="button"
                className={optionClass}
                onClick={() => {
                  onSelect(profile);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="truncate">{profile.label}</span>
                {selected?.key === profile.key && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                )}
              </button>
            ))}

            {searching && (
              <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Searching public companies…
              </div>
            )}

            {suggestions.map((ref) => (
              <button
                key={ref.provider + ":" + ref.symbol}
                type="button"
                disabled={loadingProfile}
                className={optionClass}
                onClick={() => handlePick(ref)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {ref.name}
                  </span>
                  <span className="block truncate text-[10px] text-slate-400">
                    {ref.symbol}
                    {ref.exchange ? " · " + ref.exchange : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  public
                </span>
              </button>
            ))}
          </div>

          <p className="mt-1 text-[10px] text-slate-400">
            Pick a standard, or search a listed company — its public margins
            become the benchmark. Auto Indian→Roic.
          </p>
        </div>
      )}
    </div>
  );
}
