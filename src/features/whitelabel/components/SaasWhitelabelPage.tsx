"use client";

import { useMemo, useState } from "react";
import { Building2, Copy, Palette, RefreshCw, Save, Search, Users } from "lucide-react";
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
  WhitelabelPartnerCreateRequest,
  WhitelabelPartnerUpdateRequest,
} from "../types/whitelabel.types";
import {
  isValidDomainValue,
  isValidHexColor,
  isValidUrl,
} from "../utils/validation";
import {
  WHITELABEL_ACCESS,
  WHITELABEL_DOMAIN_OPTIONS,
  WHITELABEL_FORM_COPY,
  WHITELABEL_PAGE_COPY,
  WHITELABEL_PARTNER_FORM_DEFAULTS,
  getDomainValueDisplay,
  getDomainValuePlaceholder,
  getInvalidDomainMessage,
  getSharedAppDomain,
  getWhitelabelDomainDescription,
  getWhitelabelDomainOption,
} from "../config/whitelabelUiConfig";
import { WhitelabelBrandPreview } from "./WhitelabelBrandPreview";

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

type PartnerForm = {
  name: string;
  contactEmail: string;
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

const emptyPartnerForm = { ...WHITELABEL_PARTNER_FORM_DEFAULTS };

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
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(emptyPartnerForm);
  const [createdPartner, setCreatedPartner] = useState<WhitelabelPartner | null>(
    null
  );
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");

  const organizations = useMemo(() => orgsData?.data ?? [], [orgsData]);
  const partners = useMemo(() => partnersData?.data ?? [], [partnersData]);
  const filteredOrganizations = useMemo(() => {
    const term = organizationSearch.trim().toLowerCase();
    if (!term) return organizations;

    return organizations.filter((org) =>
      [
        org.organizationName,
        org.displayName,
        org.organizationId,
        org.domainType,
        org.domainValue,
        org.partnerName,
        org.partnerCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [organizations, organizationSearch]);
  const filteredPartners = useMemo(() => {
    const term = partnerSearch.trim().toLowerCase();
    if (!term) return partners;

    return partners.filter((partner) =>
      [
        partner.name,
        partner.code,
        partner.contactEmail,
        partner.userId,
        partner.userName,
        partner.userEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [partners, partnerSearch]);

  const organizationStats = useMemo(
    () => ({
      total: organizations.length,
      active: organizations.filter((org) => org.active).length,
      verified: organizations.filter((org) => org.domainVerified).length,
      customDomains: organizations.filter(
        (org) => org.domainType === "CUSTOM_DOMAIN" || org.domainType === "SUBDOMAIN"
      ).length,
    }),
    [organizations]
  );

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
          This area is only available for {WHITELABEL_ACCESS.platformAdminName}.
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
            contactEmail: partner.contactEmail ?? partner.userEmail ?? "",
            active: partner.active,
          }
        : emptyPartnerForm
    );
    setPartnerDialogOpen(true);
  }

  async function saveOrganization() {
    if (!selectedOrg || !draft) return;

    if (!isValidHexColor(draft.primaryColorHex) || !isValidHexColor(draft.accentColorHex)) {
      toast.error(WHITELABEL_FORM_COPY.validation.colors);
      return;
    }

    if (!isValidUrl(draft.logoUrl) || !isValidUrl(draft.faviconUrl)) {
      toast.error(WHITELABEL_FORM_COPY.validation.urls);
      return;
    }

    if (draft.domainType !== "SHARED" && !draft.domainValue.trim()) {
      toast.error(WHITELABEL_FORM_COPY.validation.missingDomain);
      return;
    }

    if (draft.domainType !== "SHARED" && !isValidDomainValue(draft.domainValue)) {
      toast.error(getInvalidDomainMessage(draft.domainType));
      return;
    }

    const body: WhitelabelOrganizationAdminUpdateRequest = {
      displayName: draft.displayName.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      faviconUrl: draft.faviconUrl.trim() || null,
      primaryColorHex: draft.primaryColorHex.trim() || null,
      accentColorHex: draft.accentColorHex.trim() || null,
      domainType: draft.domainType,
      domainValue:
        draft.domainType === "SHARED" ? null : draft.domainValue.trim() || null,
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
    if (!partnerForm.name.trim()) {
      toast.error(WHITELABEL_FORM_COPY.validation.partnerNameRequired);
      return;
    }

    if (!editingPartner && !partnerForm.contactEmail.trim()) {
      toast.error(WHITELABEL_FORM_COPY.validation.partnerRequired);
      return;
    }

    try {
      if (editingPartner) {
        const body: WhitelabelPartnerUpdateRequest = {
          name: partnerForm.name.trim(),
          contactEmail: partnerForm.contactEmail.trim() || null,
          active: partnerForm.active,
        };

        await updatePartner({ id: editingPartner.id, body }).unwrap();
        toast.success("Partner updated");
      } else {
        const body: WhitelabelPartnerCreateRequest = {
          name: partnerForm.name.trim(),
          contactEmail: partnerForm.contactEmail.trim(),
        };
        const response = await createPartner(body).unwrap();
        setCreatedPartner(response.data);
        toast.success(`Partner created. Code: ${response.data.code}`);
      }

      setPartnerDialogOpen(false);
      setPartnerForm(emptyPartnerForm);
      setEditingPartner(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save partner"));
    }
  }

  async function copyPartnerCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success("Partner code copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">White Label</h1>
          <p className="text-sm text-slate-500">
            {WHITELABEL_PAGE_COPY.saasDescription}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Organizations" value={organizationStats.total} />
        <SummaryCard label="Active branding" value={organizationStats.active} />
        <SummaryCard label="Verified domains" value={organizationStats.verified} />
        <SummaryCard label="Branded domains" value={organizationStats.customDomains} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 size={18} />
            Organizations
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              className="pl-8"
              value={organizationSearch}
              onChange={(event) => setOrganizationSearch(event.target.value)}
              placeholder="Search organizations"
            />
          </div>
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
              {filteredOrganizations.map((org) => (
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
                    <p className="text-sm">{getDomainTypeLabel(org.domainType)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDomainValueDisplay(org.domainType, org.domainValue)}
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

              {!filteredOrganizations.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-slate-500">
                    {isFetchingOrgs
                      ? "Loading organizations..."
                      : isOrgsError
                      ? "Could not load organizations. Try refreshing."
                      : organizationSearch
                      ? "No organizations match your search."
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
          <div className="space-y-3 sm:flex sm:flex-1 sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} />
              Partners
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  className="pl-8"
                  value={partnerSearch}
                  onChange={(event) => setPartnerSearch(event.target.value)}
                  placeholder="Search partners"
                />
              </div>
              <Button type="button" size="sm" onClick={() => openPartnerDialog(null)}>
                Add partner
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Partner admin login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell data-label="Partner">
                    <p className="text-sm font-medium">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {partner.contactEmail ?? partner.userEmail ?? "No contact email"}
                    </p>
                  </TableCell>
                  <TableCell data-label="Code">
                    <span className="font-mono text-sm font-semibold">{partner.code}</span>
                  </TableCell>
                  <TableCell data-label="Partner admin login">
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

              {!filteredPartners.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-slate-500">
                    {isFetchingPartners
                      ? "Loading partners..."
                      : isPartnersError
                      ? "Could not load partners. Try refreshing."
                      : partnerSearch
                      ? "No partners match your search."
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
                <Label>{WHITELABEL_FORM_COPY.fields.displayName.label}</Label>
                <Input
                  value={draft.displayName}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, displayName: event.target.value })
                  }
                  placeholder={selectedOrg.organizationName}
                />
              </div>

              <div className="space-y-2">
                <Label>{WHITELABEL_FORM_COPY.fields.logoUrl.label}</Label>
                <Input
                  value={draft.logoUrl}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, logoUrl: event.target.value })
                  }
                  placeholder={WHITELABEL_FORM_COPY.fields.logoUrl.placeholder}
                />
              </div>

              <div className="space-y-2">
                <Label>{WHITELABEL_FORM_COPY.fields.faviconUrl.label}</Label>
                <Input
                  value={draft.faviconUrl}
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, faviconUrl: event.target.value })
                  }
                  placeholder={WHITELABEL_FORM_COPY.fields.faviconUrl.placeholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{WHITELABEL_FORM_COPY.fields.primaryColorHex.label}</Label>
                  <Input
                    value={draft.primaryColorHex}
                    onChange={(event) =>
                      setDraft((current) => current && { ...current, primaryColorHex: event.target.value })
                    }
                    placeholder={WHITELABEL_FORM_COPY.fields.primaryColorHex.placeholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{WHITELABEL_FORM_COPY.fields.accentColorHex.label}</Label>
                  <Input
                    value={draft.accentColorHex}
                    onChange={(event) =>
                      setDraft((current) => current && { ...current, accentColorHex: event.target.value })
                    }
                    placeholder={WHITELABEL_FORM_COPY.fields.accentColorHex.placeholder}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{WHITELABEL_FORM_COPY.fields.domainType.label}</Label>
                <Select
                  value={draft.domainType}
                  onValueChange={(value) =>
                    setDraft(
                      (current) =>
                        current && {
                          ...current,
                          domainType: value as WhitelabelDomainType,
                          domainValue:
                            value === "SHARED" ? "" : current.domainValue,
                        }
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WHITELABEL_DOMAIN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getDomainTypeDescription(draft.domainType)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {draft.domainType === "SHARED"
                    ? WHITELABEL_FORM_COPY.fields.domainValue.sharedLabel
                    : WHITELABEL_FORM_COPY.fields.domainValue.label}
                </Label>
                <Input
                  value={
                    draft.domainType === "SHARED"
                      ? getSharedAppDomain()
                      : draft.domainValue
                  }
                  onChange={(event) =>
                    setDraft((current) => current && { ...current, domainValue: event.target.value })
                  }
                  placeholder={getDomainValuePlaceholder(draft.domainType)}
                  disabled={draft.domainType === "SHARED"}
                  readOnly={draft.domainType === "SHARED"}
                />
                {draft.domainType === "SHARED" ? (
                  <p className="text-xs text-muted-foreground">
                    {WHITELABEL_FORM_COPY.fields.domainValue.sharedHelp}
                  </p>
                ) : null}
              </div>

              <WhitelabelBrandPreview
                displayName={draft.displayName || selectedOrg.organizationName}
                logoUrl={draft.logoUrl}
                primaryColorHex={draft.primaryColorHex}
                accentColorHex={draft.accentColorHex}
                domainType={draft.domainType}
                domainValue={draft.domainValue}
              />

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
              {editingPartner
                ? "Update supported partner details. Partner codes are generated by Factory1 and cannot be changed here."
                : "Enter partner details. Factory1 generates a unique code, creates a PARTNER_ADMIN login, and emails an invite to the contact email."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{WHITELABEL_FORM_COPY.fields.partnerName.label}</Label>
              <Input
                value={partnerForm.name}
                onChange={(event) =>
                  setPartnerForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={WHITELABEL_FORM_COPY.fields.partnerName.placeholder}
              />
            </div>

            <div className="space-y-2">
              <Label>{WHITELABEL_FORM_COPY.fields.partnerContactEmail.label}</Label>
              <Input
                type="email"
                value={partnerForm.contactEmail}
                onChange={(event) =>
                  setPartnerForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                placeholder={WHITELABEL_FORM_COPY.fields.partnerContactEmail.placeholder}
              />
            </div>

            {editingPartner ? (
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <p className="font-medium">Partner code</p>
                <p className="mt-1 font-mono text-base font-semibold">
                  {editingPartner.code}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {WHITELABEL_FORM_COPY.fields.partnerCode.generatedHelp}
                </p>
              </div>
            ) : (
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground">
                {WHITELABEL_FORM_COPY.fields.partnerCode.generatedHelp} A{" "}
                {WHITELABEL_ACCESS.partnerAdminRole} login is created and an
                invite email is sent to the contact email.
              </div>
            )}

            {editingPartner ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(partnerForm.active)}
                  onCheckedChange={(checked) =>
                    setPartnerForm((current) => ({ ...current, active: checked === true }))
                  }
                />
                Active partner
              </label>
            ) : null}
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

      <Dialog
        open={Boolean(createdPartner)}
        onOpenChange={(open) => {
          if (!open) setCreatedPartner(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner created</DialogTitle>
            <DialogDescription>
              Share this generated partner code with the partner&apos;s customers.
              The linked admin login invite was sent to the contact email.
            </DialogDescription>
          </DialogHeader>

          {createdPartner ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Generated partner code
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="break-all font-mono text-2xl font-semibold">
                    {createdPartner.code}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyPartnerCode(createdPartner.code)}
                  >
                    <Copy size={16} />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 text-sm">
                <p className="font-medium">{createdPartner.name}</p>
                <p className="mt-1 text-muted-foreground">
                  Partner admin login:{" "}
                  {createdPartner.userEmail ??
                    createdPartner.contactEmail ??
                    createdPartner.userId}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => setCreatedPartner(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-xs font-semibold text-[var(--factory1-text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-[var(--factory1-text-primary)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function getDomainTypeLabel(value: WhitelabelDomainType) {
  return getWhitelabelDomainOption(value).label;
}

function getDomainTypeDescription(value: WhitelabelDomainType) {
  return getWhitelabelDomainDescription(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
}
