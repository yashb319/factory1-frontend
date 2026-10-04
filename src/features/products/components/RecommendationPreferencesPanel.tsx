"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  RecommendationPreferences,
  RecommendationSeverity,
} from "../types/profitRecommendations.types";

type Props = {
  preferences?: RecommendationPreferences;
  loading: boolean;
  saving: boolean;
  error?: string | null;
  saveError?: string | null;
  onRetry: () => void;
  onSave: (preferences: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    minimumSeverity: RecommendationSeverity;
  }) => void;
};

export function RecommendationPreferencesPanel({
  preferences,
  loading,
  saving,
  error,
  saveError,
  onRetry,
  onSave,
}: Props) {
  if (loading) {
    return <p role="status">Loading notification preferences...</p>;
  }

  if (error || !preferences) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3">
        <p className="text-red-900">
          {error ?? "Notification preferences are unavailable."}
        </p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PreferencesForm
      key={`${preferences.inAppEnabled}:${preferences.emailEnabled}:${preferences.minimumSeverity}`}
      preferences={preferences}
      saving={saving}
      saveError={saveError}
      onSave={onSave}
    />
  );
}

function PreferencesForm({
  preferences,
  saving,
  saveError,
  onSave,
}: {
  preferences: RecommendationPreferences;
  saving: boolean;
  saveError?: string | null;
  onSave: Props["onSave"];
}) {
  const [draft, setDraft] = useState(preferences);
  const dirty =
    draft.inAppEnabled !== preferences.inAppEnabled ||
    draft.emailEnabled !== preferences.emailEnabled ||
    draft.minimumSeverity !== preferences.minimumSeverity;

  return (
    <section className="space-y-4" aria-labelledby="notification-preferences-title">
      <div>
        <h2 id="notification-preferences-title" className="text-lg font-semibold">
          Recommendation notifications
        </h2>
        <p className="text-sm text-muted-foreground">
          Changes are saved only after explicit confirmation. Disabling a
          channel does not delete recommendation history.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-4 rounded-md border p-3">
          <span>
            <span className="block font-medium">In-app notifications</span>
            <span className="block text-xs text-muted-foreground">
              Show supported recommendation alerts inside Factory1.
            </span>
          </span>
          <Switch
            checked={draft.inAppEnabled}
            onCheckedChange={(inAppEnabled) =>
              setDraft({ ...draft, inAppEnabled })
            }
            aria-label="In-app notifications"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-md border p-3">
          <span>
            <span className="block font-medium">Email notifications</span>
            <span className="block text-xs text-muted-foreground">
              Send recommendation alerts to the account email.
            </span>
          </span>
          <Switch
            checked={draft.emailEnabled}
            onCheckedChange={(emailEnabled) =>
              setDraft({ ...draft, emailEnabled })
            }
            aria-label="Email notifications"
          />
        </label>
      </div>

      <label className="block max-w-sm space-y-1">
        <span className="text-xs font-medium">Minimum severity</span>
        <Select
          value={draft.minimumSeverity}
          onValueChange={(minimumSeverity) =>
            setDraft({
              ...draft,
              minimumSeverity:
                minimumSeverity as RecommendationSeverity,
            })
          }
        >
          <SelectTrigger className="w-full" aria-label="Minimum severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INFO">Info and above</SelectItem>
            <SelectItem value="WARNING">Warning and above</SelectItem>
            <SelectItem value="HIGH">High only</SelectItem>
          </SelectContent>
        </Select>
      </label>

      {saveError ? (
        <p role="alert" className="text-sm text-red-700">
          {saveError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          disabled={!dirty || saving}
          onClick={() =>
            onSave({
              inAppEnabled: draft.inAppEnabled,
              emailEnabled: draft.emailEnabled,
              minimumSeverity: draft.minimumSeverity,
            })
          }
        >
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </section>
  );
}
