"use client";

import { useMemo, useState } from "react";
import { Info, Palette, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppSelector } from "@/lib/hook";
import {
  useGetPartnerWhitelabelOrganizationsQuery,
  useUpdatePartnerWhitelabelOrganizationMutation,
} from "../api/whitelabelApi";
import type {
  WhitelabelDomainType,
  WhitelabelOrganization,
  WhitelabelOrganizationPartnerUpdateRequest,
} from "../types/whitelabel.types";
import {
  isValidDomainValue,
  isValidHexColor,
  isValidUrl,
} from "../utils/validation";

type OrgDraft = {
  displayName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColorHex: string;
  accentColorHex: string;
  domainType: WhitelabelDomainType;
  domainValue: string;
};

function draftFromOrganization(org: WhitelabelOrganization): OrgDraft {
  return {
    displayName: org.displayName ?? "",
    logoUrl: org.logoUrl ?? "",
    faviconUrl: org.faviconUrl ?? "",
    primaryColorHex: org.primaryColorHex ?? "",
    accentColorHex: org.accentColorHex ?? "",
    domainType: org.domainType ?? "SHARED",
    domainValue: org.domainValue ?? "",
  };
}

export function PartnerWhitelabelPage() {
  const user = useAppSelector((state) => state.auth.user);
  const isPartnerAdmin = user?.role === "PARTNER_ADMIN";

  const {
    data,
    isFetching,
    isError,
    refetch,
  } = useGetPartnerWhitelabelOrganizationsQuery(undefined, {
    skip: !isPartnerAdmin,
  });

  const organizations = useMemo(() => data?.data ?? [], [data]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  // Default to the first linked organization until the user picks another one.
  const activeOrgId = selectedOrgId || organizations[0]?.organizationId || "";
  const selectedOrg = organizations.find(
    (org) => org.organizationId === activeOrgId
  );

  if (!isPartnerAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Partner White Label</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is only available for partner administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Partner White Label
          </h1>
          <p className="text-sm text-slate-500">
            Update the visible brand for the organizations linked to your
            partner account.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Domain verification and enabling/disabling an organization&apos;s
          branding are SaaS-owner-only controls. Those toggles aren&apos;t
          shown here, and the server rejects them even if sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linked organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.organizationId}>
                  <TableCell data-label="Organization">
                    <p className="font-medium">
                      {org.displayName || org.organizationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {org.organizationName}
                    </p>
                  </TableCell>
                  <TableCell data-label="Domain">
                    <p className="text-sm">{org.domainType}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.domainValue || "—"}
                    </p>
                  </TableCell>
                  <TableCell data-label="Verified">
                    <StatusBadge tone={org.domainVerified ? "success" : "pending"}>
                      {org.domainVerified ? "Verified" : "Unverified"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell data-label="Status">
                    <StatusBadge tone={org.active ? "success" : "error"}>
                      {org.active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right" data-label="Action">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrgId(org.organizationId)}
                    >
                      {activeOrgId === org.organizationId ? "Selected" : "Select"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!organizations.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-slate-500">
                    {isFetching
                      ? "Loading organizations..."
                      : isError
                      ? "Could not load organizations. Try refreshing."
                      : "No organizations are linked to your partner account."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrg ? (
        <OrganizationBrandingForm key={selectedOrg.organizationId} org={selectedOrg} />
      ) : null}
    </div>
  );
}

function OrganizationBrandingForm({ org }: { org: WhitelabelOrganization }) {
  // Keyed by organizationId in the parent, so this state is naturally reset
  // (via remount) whenever the selected organization changes.
  const [draft, setDraft] = useState<OrgDraft>(() => draftFromOrganization(org));
  const [updateOrganization, updateState] =
    useUpdatePartnerWhitelabelOrganizationMutation();

  async function saveBranding() {
    if (!isValidHexColor(draft.primaryColorHex) || !isValidHexColor(draft.accentColorHex)) {
      toast.error("Colors must be a valid hex value like #2563EB");
      return;
    }

    if (!isValidUrl(draft.logoUrl) || !isValidUrl(draft.faviconUrl)) {
      toast.error("Logo and favicon must be valid http(s) URLs");
      return;
    }

    if (!isValidDomainValue(draft.domainValue)) {
      toast.error("Enter a valid domain, e.g. acme.factory1.app");
      return;
    }

    const body: WhitelabelOrganizationPartnerUpdateRequest = {
      displayName: draft.displayName.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      faviconUrl: draft.faviconUrl.trim() || null,
      primaryColorHex: draft.primaryColorHex.trim() || null,
      accentColorHex: draft.accentColorHex.trim() || null,
      domainType: draft.domainType,
      domainValue: draft.domainValue.trim() || null,
    };

    try {
      await updateOrganization({
        organizationId: org.organizationId,
        body,
      }).unwrap();
      toast.success(`Branding saved for ${org.organizationName}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save branding"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette size={18} />
          Branding — {org.displayName || org.organizationName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Display name</Label>
            <Input
              value={draft.displayName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, displayName: event.target.value }))
              }
              placeholder={org.organizationName}
            />
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={draft.logoUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, logoUrl: event.target.value }))
              }
              placeholder="https://cdn.example.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input
              value={draft.faviconUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, faviconUrl: event.target.value }))
              }
              placeholder="https://cdn.example.com/favicon.ico"
            />
          </div>

          <div className="space-y-2">
            <Label>Primary color</Label>
            <Input
              value={draft.primaryColorHex}
              onChange={(event) =>
                setDraft((current) => ({ ...current, primaryColorHex: event.target.value }))
              }
              placeholder="#2563EB"
            />
          </div>

          <div className="space-y-2">
            <Label>Accent color</Label>
            <Input
              value={draft.accentColorHex}
              onChange={(event) =>
                setDraft((current) => ({ ...current, accentColorHex: event.target.value }))
              }
              placeholder="#0EA5E9"
            />
          </div>

          <div className="space-y-2">
            <Label>Domain type</Label>
            <Select
              value={draft.domainType}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, domainType: value as WhitelabelDomainType }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHARED">Shared</SelectItem>
                <SelectItem value="SUBDOMAIN">Subdomain</SelectItem>
                <SelectItem value="CUSTOM_DOMAIN">Custom domain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Domain value</Label>
            <Input
              value={draft.domainValue}
              onChange={(event) =>
                setDraft((current) => ({ ...current, domainValue: event.target.value }))
              }
              placeholder="acme.factory1.app"
              disabled={draft.domainType === "SHARED"}
            />
          </div>
        </div>

        <Button type="button" onClick={saveBranding} disabled={updateState.isLoading}>
          <Save size={16} />
          {updateState.isLoading ? "Saving..." : "Save branding"}
        </Button>
      </CardContent>
    </Card>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
}
