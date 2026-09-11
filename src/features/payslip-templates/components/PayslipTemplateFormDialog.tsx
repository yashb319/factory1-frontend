"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCreatePayslipTemplateMutation,
  useUpdatePayslipTemplateMutation,
} from "../api/payslipTemplateApi";
import {
  DEDUCTIONS_FIELD_OPTIONS,
  DEFAULT_TEMPLATE_DATA,
  EARNINGS_FIELD_OPTIONS,
  EMPLOYEE_INFO_FIELD_OPTIONS,
  EMPLOYER_CONTRIBUTION_FIELD_OPTIONS,
  PayslipTemplateData,
  PayslipTemplateResponse,
  PayslipTemplateRow,
} from "../types/payslipTemplate.types";

interface Props {
  open: boolean;
  template?: PayslipTemplateResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function PayslipTemplateFormDialog({ open, template, onOpenChange }: Props) {
  const isEdit = Boolean(template);

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [logoFileKey, setLogoFileKey] = useState(template?.logoFileKey ?? "");
  const [signatureFileKey, setSignatureFileKey] = useState(
    template?.signatureFileKey ?? ""
  );
  const [templateData, setTemplateData] = useState<PayslipTemplateData>(
    template?.templateData ?? DEFAULT_TEMPLATE_DATA
  );

  const [createTemplate, { isLoading: creating }] =
    useCreatePayslipTemplateMutation();
  const [updateTemplate, { isLoading: updating }] =
    useUpdatePayslipTemplateMutation();

  const saving = creating || updating;

  function handleFileToDataUrl(
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function toggleEmployeeInfoField(field: string, checked: boolean) {
    setTemplateData((current) => ({
      ...current,
      employeeInfo: {
        fields: checked
          ? [...current.employeeInfo.fields, field]
          : current.employeeInfo.fields.filter((value) => value !== field),
      },
    }));
  }

  function updateRows(
    section: "earnings" | "deductions" | "employerContributions",
    rows: PayslipTemplateRow[]
  ) {
    setTemplateData((current) => ({
      ...current,
      [section]: { rows },
    }));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      templateData,
      logoFileKey: logoFileKey || undefined,
      signatureFileKey: signatureFileKey || undefined,
    };

    try {
      if (isEdit && template) {
        await updateTemplate({ id: template.id, body }).unwrap();
        toast.success("Template updated");
      } else {
        await createTemplate(body).unwrap();
        toast.success("Template created as a new draft");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Could not update template" : "Could not create template");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(event) => event.preventDefault()}
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payslip Template" : "New Payslip Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Standard Payslip"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional short description"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileKeyField
              label="Logo"
              dataUrl={logoFileKey}
              onChange={(event) => handleFileToDataUrl(event, setLogoFileKey)}
              onClear={() => setLogoFileKey("")}
            />
            <FileKeyField
              label="Signature"
              dataUrl={signatureFileKey}
              onChange={(event) => handleFileToDataUrl(event, setSignatureFileKey)}
              onClear={() => setSignatureFileKey("")}
            />
          </div>

          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Header</h3>
            <div className="mt-3 flex items-center gap-3">
              <Checkbox
                checked={templateData.header.showLogo}
                onCheckedChange={(checked) =>
                  setTemplateData((current) => ({
                    ...current,
                    header: { ...current.header, showLogo: Boolean(checked) },
                  }))
                }
              />
              <span className="text-sm">Show organization logo</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Company name and address are always resolved from your organization profile at generation
              time.
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Employee details</h3>
            <p className="mt-1 text-xs text-slate-500">
              Choose which fields appear in the payslip&apos;s employee info block.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {EMPLOYEE_INFO_FIELD_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={templateData.employeeInfo.fields.includes(option.value)}
                    onCheckedChange={(checked) =>
                      toggleEmployeeInfoField(option.value, Boolean(checked))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <RowsSection
            title="Earnings"
            rows={templateData.earnings.rows}
            fieldOptions={EARNINGS_FIELD_OPTIONS}
            onChange={(rows) => updateRows("earnings", rows)}
          />

          <RowsSection
            title="Deductions"
            rows={templateData.deductions.rows}
            fieldOptions={DEDUCTIONS_FIELD_OPTIONS}
            onChange={(rows) => updateRows("deductions", rows)}
          />

          <RowsSection
            title="Employer contributions"
            rows={templateData.employerContributions.rows}
            fieldOptions={EMPLOYER_CONTRIBUTION_FIELD_OPTIONS}
            onChange={(rows) => updateRows("employerContributions", rows)}
          />

          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Net pay</h3>
            <div className="mt-3 flex items-center gap-3">
              <Checkbox
                checked={templateData.netPay.amountInWords}
                onCheckedChange={(checked) =>
                  setTemplateData((current) => ({
                    ...current,
                    netPay: { ...current.netPay, amountInWords: Boolean(checked) },
                  }))
                }
              />
              <span className="text-sm">Show net pay amount in words</span>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Signature / footer</h3>
            <div className="mt-3 flex items-center gap-3">
              <Checkbox
                checked={templateData.signatureBlock.showSignature}
                onCheckedChange={(checked) =>
                  setTemplateData((current) => ({
                    ...current,
                    signatureBlock: {
                      ...current.signatureBlock,
                      showSignature: Boolean(checked),
                    },
                  }))
                }
              />
              <span className="text-sm">Show signature block</span>
            </div>
            <Textarea
              className="mt-3"
              rows={2}
              value={templateData.signatureBlock.text}
              onChange={(event) =>
                setTemplateData((current) => ({
                  ...current,
                  signatureBlock: { ...current.signatureBlock, text: event.target.value },
                }))
              }
              placeholder="Footer text shown below the signature line"
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileKeyField({
  label,
  dataUrl,
  onChange,
  onClear,
}: {
  label: string;
  dataUrl: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-slate-400">No {label.toLowerCase()}</span>
          )}
        </div>
        <Input accept="image/*" type="file" onChange={onChange} className="min-w-0" />
        {dataUrl ? (
          <Button type="button" variant="outline" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RowsSection({
  title,
  rows,
  fieldOptions,
  onChange,
}: {
  title: string;
  rows: PayslipTemplateRow[];
  fieldOptions: { label: string; value: string }[];
  onChange: (rows: PayslipTemplateRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<PayslipTemplateRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    const nextOption = fieldOptions.find(
      (option) => !rows.some((row) => row.field === option.value)
    );
    onChange([
      ...rows,
      { label: nextOption?.label ?? "", field: nextOption?.value ?? fieldOptions[0]?.value ?? "" },
    ]);
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add row
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-slate-500">No rows added yet.</p>
        )}
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={row.label}
              onChange={(event) => updateRow(index, { label: event.target.value })}
              placeholder="Label shown on payslip"
              className="flex-1"
            />
            <Select
              value={row.field}
              onValueChange={(value) => updateRow(index, { field: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => removeRow(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
