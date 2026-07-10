"use client";

import { MapPin } from "lucide-react";
import type { LocationSuggestion } from "@/lib/locationSuggestions";

type Props = {
  suggestions: LocationSuggestion[];
  onApply: (suggestion: LocationSuggestion) => void;
};

export function LocationSuggestionHint({ suggestions, onApply }: Props) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {suggestions.map((suggestion) => (
        <button
          key={`${suggestion.city}-${suggestion.pincode}`}
          type="button"
          onClick={() => onApply(suggestion)}
          className="flex w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs text-blue-900 transition hover:border-blue-200 hover:bg-blue-100"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Use {suggestion.city}, {suggestion.state}, {suggestion.country} - {suggestion.pincode}
          </span>
        </button>
      ))}
    </div>
  );
}
