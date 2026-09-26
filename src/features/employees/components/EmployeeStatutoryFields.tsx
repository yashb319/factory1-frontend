"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  EmployeeStatutoryProfileRequest,
  PfCalculationType,
  TaxRegime,
} from "../types/employee.types";

interface Props {
  value: EmployeeStatutoryProfileRequest;
  onChange: <Key extends keyof EmployeeStatutoryProfileRequest>(
    field: Key,
    value: EmployeeStatutoryProfileRequest[Key]
  ) => void;
}

export function EmployeeStatutoryFields({ value, onChange }: Props) {
  function setField<Key extends keyof EmployeeStatutoryProfileRequest>(
    field: Key,
    nextValue: EmployeeStatutoryProfileRequest[Key]
  ) {
    onChange(field, nextValue);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN number">
          <Input
            value={value.panNumber ?? ""}
            onChange={(event) => setField("panNumber", event.target.value)}
            placeholder="ABCDE1234F"
          />
        </Field>
        <Field label="UAN">
          <Input
            value={value.uan ?? ""}
            onChange={(event) => setField("uan", event.target.value)}
            placeholder="12-digit UAN"
          />
        </Field>
        <Field label="PF account number">
          <Input
            value={value.pfAccountNumber ?? ""}
            onChange={(event) => setField("pfAccountNumber", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckboxField
          checked={Boolean(value.pfEnabled)}
          label="PF enabled for this employee"
          onChange={(checked) => setField("pfEnabled", checked)}
        />
        <CheckboxField
          checked={Boolean(value.epsMember)}
          label="EPS member"
          onChange={(checked) => setField("epsMember", checked)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PF calculation type">
          <Select
            value={value.pfCalculationType ?? "STATUTORY_CEILING"}
            onValueChange={(nextValue) =>
              setField("pfCalculationType", nextValue as PfCalculationType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STATUTORY_CEILING">Statutory ceiling</SelectItem>
              <SelectItem value="ACTUAL_WAGES">Actual wages</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {value.pfCalculationType === "CUSTOM" && (
          <NumberField
            label="Custom PF wage"
            min={0}
            value={value.customPfWage}
            onChange={(nextValue) => setField("customPfWage", nextValue)}
          />
        )}
      </div>

      <div className="space-y-3">
        <CheckboxField
          checked={Boolean(value.voluntaryPfEnabled)}
          label="Enable voluntary PF"
          onChange={(checked) => setField("voluntaryPfEnabled", checked)}
        />
        {value.voluntaryPfEnabled && (
          <NumberField
            label="Voluntary PF percentage (0-100)"
            min={0}
            max={100}
            value={value.voluntaryPfPercent}
            onChange={(nextValue) => setField("voluntaryPfPercent", nextValue)}
          />
        )}
      </div>

      <Field label="Tax regime">
        <Select
          value={value.taxRegime ?? "NEW"}
          onValueChange={(nextValue) =>
            setField("taxRegime", nextValue as TaxRegime)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">New regime</SelectItem>
            <SelectItem value="OLD">Old regime</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Previous employer income"
          min={0}
          value={value.previousEmployerIncome}
          onChange={(nextValue) => setField("previousEmployerIncome", nextValue)}
        />
        <NumberField
          label="Other declared income"
          min={0}
          value={value.otherDeclaredIncome}
          onChange={(nextValue) => setField("otherDeclaredIncome", nextValue)}
        />
        <NumberField
          label="House property income (loss allowed)"
          value={value.housePropertyIncome}
          onChange={(nextValue) => setField("housePropertyIncome", nextValue)}
        />
        <NumberField
          label="Declared deductions total"
          disabled={value.taxRegime !== "OLD"}
          min={0}
          value={value.declaredDeductionsTotal}
          onChange={(nextValue) => setField("declaredDeductionsTotal", nextValue)}
        />
      </div>
      {value.taxRegime !== "OLD" && (
        <p className="text-xs text-muted-foreground">
          Declared deductions are ignored under the new tax regime.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(nextValue) => onChange(nextValue === true)}
      />
      <span>{label}</span>
    </label>
  );
}

function NumberField({
  disabled,
  label,
  max,
  min,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number | undefined) => void;
  value?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        disabled={disabled}
        min={min}
        max={max}
        step="0.01"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)
        }
      />
    </Field>
  );
}
