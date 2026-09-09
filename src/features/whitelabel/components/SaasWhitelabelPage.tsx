"use client";

import { useMemo, useState } from "react";
import { Building2, Palette, RefreshCw, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  useCreateSaasWhitelabelPartnerMutation,
  useGetSaasWhitelabelOrganizationsQuery,
  useGetSaasWhitelabelPartnersQuery,
  useUpdateSaasWhitelabelOrganizationMutation,
  useUpdateSaasWhitelabelPartnerMutation,
} from "../api/whitelabelApi";
import type {
  WhitelabelDomainType,
  WhitelabelOrganization,
  WhitelabelOrganizationAdminUpdateRequest,
  WhitelabelPartner,
  WhitelabelPartnerRequest,
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
  domainVerified: boolean;
  active: boolean;
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
    domainVerified: Boolean(org.domainVerified),
    active: Boolean(org.active),
  };
}

const emptyPartnerForm = { name: "", code: "", userId: "", active: true };

export function SaasWhitelabelPage() {
  const user = useAppSelector((state) => state.auth.user);
  const platformAdmin = Boolean(user?.platformAdmin);

  const {
    data: orgsData,
    isFetching: isFetchingOrgs,
    isError: isOrgsError,
    refetch: refetchOrgs,
  } = useGetSaasWhitelabelOrganizationsQuery(undefined, { skip: !platformAdmin });
  const {
    data: partnersData,
    isFetching: isFetchingPartners,
    isError: isPartnersError,
    refetch: refetchPartners,
  } = useGetSaasWhitelabelPartnersQuery(undefined, { skip: !platformAdmin });

  const [updateOrganization, updateOrgState] =
    useUpdateSaasWhitelabelOrganizationMutation();
  const [createPartner, createPartnerState] =
    useCreateSaasWhitelabelPartnerMutation();
  const [updatePartner, updatePartnerState] =
    useUpdateSaasWhitelabelPartnerMutation();

  const [selectedOrg, setSelectedOrg] = useState<WhitelabelOrganization | null>(
    null
  );
  const [draft, setDraft] = useState<OrgDraft | null>(null);
  const [editingPartner, setEditingPartner] = useState<WhitelabelPartner | null>(
    null
  );
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [partnerForm, setPartnerForm] =
    useState<WhitelabelPartnerRequest>(emptyPartnerForm);

  const organizations = useMemo(() => orgsData?.data ?? [], [orgsData]);
  const partners = useMemo(() => partnersData?.data ?? [], [partnersData]);

  function openOrgEditor(org: WhitelabelOrganization) {
    setSelectedOrg(org);
    setDraft(draftFromOrganization(org));
  }

  function closeOrgEditor() {
    setSelectedOrg(null);
    setDraft(null);
  }

  if (!platformAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">White Label</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is only available for Factory1 platform administrators.
        </p>
      </div>
    );
  }

  function openPartnerDialog(partner: WhitelabelPartner | null) {
    setEditingPartner(partner);
    setPartnerForm(
      partner
        ? {
            name: partner.name,
            code: partner.code,
            userId: partner.userId,
            active: partner.active,
          }
        : emptyPartnerForm
    );
    setPartnerDialogOpen(true);
  }

  async function saveOrganization() {
    if (!selectedOrg || !draft) return;

    if (!isValidHexColor(draft.primaryColorHex) || !isValidHexColor(draft.accentColorHex)) {
      toast.error("Colors must be a valid hex value like #2563EB");
      return;
    }

    if (!isValidUrl(draft.logoUrl) || !isValidUrl(draft.faviconUrl)) {
      toast.error("Logo and favicon must be valid http(s) URLs");
      return;
    }

    if (draft.domainType !== "SHARED" && !draft.domainValue.trim()) {
      toast.error("Enter a domain value for a subdomain or custom domain");
      return;
    }

    if (!isValidDomainValue(draft.domainValue)) {
      toast.error("Enter a valid domain, e.g. acme.factory1.app");
      return;
    }

    const body: WhitelabelOrganizationAdminUpdateRequest = {
      displayName: draft.displayName.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      faviconUrl: draft.faviconUrl.trim() || null,
      primaryColorHex: draft.primaryColorHex.trim() || null,
      accentColorHex: draft.accentColorHex.trim() || null,
      domainType: draft.domainType,
      domainValue: draft.domainValue.trim() || null,
      domainVerified: draft.domainVerified,
      active: draft.active,
    };

    try {
      await updateOrganization({
        organizationId: selectedOrg.organizationId,
        body,
      }).unwrap();
      toast.success(`Branding saved for ${selectedOrg.organizationName}`);
      closeOrgEditor();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save branding"));
    }
  }

  async function savePartner() {
    if (!partnerForm.name.trim() || !partnerForm.code.trim() || !partnerForm.userId.trim()) {
      toast.error("Partner name, code and linked user ID are required");
      return;
    }

    const body: WhitelabelPartnerRequest = {
      name: partnerForm.name.trim(),
      code: partnerForm.code.trim(),
      userId: partnerForm.userId.trim(),
      active: partnerForm.active,
    };

    try {
      if (editingPartner) {
        await updatePartner({ id: editingPartner.id, body }).unwrap();
        toast.success("Partner updated");
      } else {
        await createPartner(body).unwrap();
        toast.success("Partner created");
      }

      setPartnerDialogOpen(false);
      setPartnerForm(emptyPartnerForm);
      setEditingPartner(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save partner"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">White Label</h1>
          <p className="text-sm text-slate-500">
            Configure organization branding, custom domains and reseller partners.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            refetchOrgs();
            refetchPartners();
          }}
          disabled={isFetchingOrgs || isFetchingPartners}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={18} />
            Organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Partner</TableHead>
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
                  <TableCell data-label="Partner">
                    {org.partnerName || (
                      <span className="text-xs text-muted-foreground">
                        Direct
                      </span>
                    )}
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
                      onClick={() => openOrgEditor(org)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!organizations.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-slate-500">
                    {isFetchingOrgs
                      ? "Loading organizations..."
                      : isOrgsError
                      ? "Could not load organizations. Try refreshing."
                      : "No organizations found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users size={18} />
            Partners
          </CardTitle>
          <Button type="button" size="sm" onClick={() => openPartnerDialog(null)}>
            Add partner
          </Button>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Linked user</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell data-label="Partner">{partner.name}</TableCell>
                  <TableCell data-label="Code">{partner.code}</TableCell>
                  <TableCell data-label="Linked user">
                    <p className="text-sm">{partner.userName || partner.userId}</p>
                    <p className="text-xs text-muted-foreground">
                      {partner.userEmail || partner.userId}
                    </p>
                  </TableCell>
                  <TableCell data-label="Status">
                    <StatusBadge tone={partner.active ? "success" : "error"}>
                      {partner.active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right" data-label="Action">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openPartnerDialog(partner)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!partners.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-slate-500">
                    {isFetchingPartners
                      ? "Loading partners..."
                      : isPartnersError
                      ? "Could not load partners. Try refreshing."
                      : "No partners configured yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedOrg)}
        onOpenChange={(open) => {
          if (!open) closeOrgEditor();
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette size={16} />
              {selectedOrg?.organizationName}
            </SheetTitle>
            <SheetDescription>
              Update the branding customers see for this organization.
            </SheetDescription>
          </SheetHeader>

          {draft && selectedOrg && (
            <div className="space-y-4 px-4 pb-4">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input
                  value={draft.displayName}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, displayName: event.target.value })
                  }
                  placeholder={selectedOrg.organizationName}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={draft.logoUrl}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, logoUrl: event.target.value })
                  }
                  placeholder="https://cdn.example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input
                  value={draft.faviconUrl}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, faviconUrl: event.target.value })
                  }
                  placeholder="https://cdn.example.com/favicon.ico"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Primary color</Label>
                  <Input
                    value={draft.primaryColorHex}
                    onChange={(event) =>
                      setDraft((current) => current && { ...current, primaryColorHex: event.target.value })
                    }
                    placeholder="#2563EB"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accent color</Label>
                  <Input
                    value={draft.accentColorHex}
                    onChange={(event) =>
                      setDraft((current) => current && { ...current, accentColorHex: event.target.value })
                    }
                    placeholder="#0EA5E9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Domain type</Label>
                <Select
                  value={draft.domainType}
                  onValueChange={(value) =>
                    setDraft(
                      (current) =>
                        current && { ...current, domainType: value as WhitelabelDomainType }
                    )
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
                    setDraft((current) => current && { ...current, domainValue: event.target.value })
                  }
                  placeholder="acme.factory1.app"
                  disabled={draft.domainType === "SHARED"}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.domainVerified}
                  onCheckedChange={(checked) =>
                    setDraft((current) => current && { ...current, domainVerified: checked === true })
                  }
                />
                Domain verified
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.active}
                  onCheckedChange={(checked) =>
                    setDraft((current) => current && { ...current, active: checked === true })
                  }
                />
                Branding active
              </label>
            </div>
          )}

          <SheetFooter>
            <Button
              type="button"
              onClick={saveOrganization}
              disabled={updateOrgState.isLoading || !draft}
            >
              <Save size={16} />
              {updateOrgState.isLoading ? "Saving..." : "Save branding"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Edit partner" : "Add partner"}</DialogTitle>
            <DialogDescription>
              The linked user must already have the PARTNER_ADMIN role. The
              backend validates this and will reject the save otherwise.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partner name</Label>
              <Input
                value={partnerForm.name}
                onChange={(event) =>
                  setPartnerForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Regional Partner"
              />
            </div>

            <div className="space-y-2">
              <Label>Partner code</Label>
              <Input
                value={partnerForm.code}
                onChange={(event) =>
                  setPartnerForm((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="REGION-01"
              />
            </div>

            <div className="space-y-2">
              <Label>Linked user ID (PARTNER_ADMIN)</Label>
              <Input
                value={partnerForm.userId}
                onChange={(event) =>
                  setPartnerForm((current) => ({ ...current, userId: event.target.value }))
                }
                placeholder="UUID of the partner admin user"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(partnerForm.active)}
                onCheckedChange={(checked) =>
                  setPartnerForm((current) => ({ ...current, active: checked === true }))
                }
              />
              Active partner
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={savePartner}
              disabled={createPartnerState.isLoading || updatePartnerState.isLoading}
            >
              <Save size={16} />
              {createPartnerState.isLoading || updatePartnerState.isLoading
                ? "Saving..."
                : "Save partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
}
