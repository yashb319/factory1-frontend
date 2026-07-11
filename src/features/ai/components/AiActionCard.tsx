"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { AiActionProposal } from "../types/ai.types";

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

const CREATE_FIELDS: Record<string, FieldConfig[]> = {
  employees: [
    { key: "name", label: "Name", required: true, placeholder: "Rahul Kumar" },
    { key: "phone", label: "Phone", placeholder: "9876543210" },
    { key: "email", label: "Email", placeholder: "name@factory1.test" },
    {
      key: "department",
      label: "Department",
      placeholder: "Production",
      options: [
        "Production",
        "Finance",
        "Operations",
        "Packing",
        "Quality",
        "HR",
        "Store",
        "Maintenance",
      ],
    },
    {
      key: "designation",
      label: "Designation",
      placeholder: "Operator",
      options: [
        "Operator",
        "Supervisor",
        "Manager",
        "Engineer",
        "Helper",
        "Accountant",
      ],
    },
    {
      key: "status",
      label: "Status",
      placeholder: "ACTIVE",
      options: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
    },
  ],
  customers: [
    { key: "name", label: "Name", required: true, placeholder: "Acme Pvt Ltd" },
    { key: "phone", label: "Phone", placeholder: "9988001122" },
    { key: "email", label: "Email", placeholder: "billing@acme.com" },
    { key: "gstNumber", label: "GST Number", placeholder: "27AAAAA0000A1Z5" },
    { key: "city", label: "City", placeholder: "Mumbai" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  suppliers: [
    { key: "name", label: "Name", required: true, placeholder: "Om Traders" },
    { key: "phone", label: "Phone", placeholder: "9988003344" },
    { key: "email", label: "Email", placeholder: "sales@omtraders.com" },
    { key: "gstNumber", label: "GST Number", placeholder: "27BBBBB0000B1Z5" },
    { key: "city", label: "City", placeholder: "Pune" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  inventory: [
    { key: "name", label: "Name", required: true, placeholder: "Bolt" },
    {
      key: "unit",
      label: "Unit",
      placeholder: "pcs",
      options: ["pcs", "kg", "ltr", "box", "set", "meter"],
    },
    { key: "currentStock", label: "Current Stock", placeholder: "0" },
    { key: "minimumStock", label: "Minimum Stock", placeholder: "0" },
    { key: "purchasePrice", label: "Purchase Price", placeholder: "0" },
    {
      key: "category",
      label: "Category",
      placeholder: "Raw",
      options: ["Raw", "Packaging", "Consumable", "Finished"],
    },
    { key: "supplierName", label: "Supplier", placeholder: "Om Traders" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  products: [
    { key: "name", label: "Name", required: true, placeholder: "Chair" },
    {
      key: "unit",
      label: "Unit",
      placeholder: "pcs",
      options: ["pcs", "kg", "ltr", "box", "set"],
    },
    { key: "description", label: "Description", placeholder: "Wooden chair" },
  ],
  attendance: [
    { key: "name", label: "Employee", required: true, placeholder: "Ravi Kumar" },
    {
      key: "status",
      label: "Status",
      placeholder: "PRESENT",
      options: [
        "PRESENT",
        "ABSENT",
        "HALF_DAY",
        "PAID_LEAVE",
        "UNPAID_LEAVE",
        "HOLIDAY",
      ],
    },
    { key: "date", label: "Date (YYYY-MM-DD)", placeholder: "2026-07-11" },
  ],
  payroll: [
    { key: "month", label: "Month (1-12)", required: true, placeholder: "6" },
    { key: "year", label: "Year", required: true, placeholder: "2026" },
  ],
  production: [
    { key: "name", label: "Product", required: true, placeholder: "Chair" },
    { key: "quantity", label: "Quantity", required: true, placeholder: "50" },
    { key: "date", label: "Date (YYYY-MM-DD)", placeholder: "2026-07-11" },
  ],
  purchase: [
    { key: "name", label: "Supplier", required: true, placeholder: "Om Traders" },
    { key: "amount", label: "Amount", required: true, placeholder: "12500" },
  ],
  sales: [
    { key: "name", label: "Customer", required: true, placeholder: "Acme Pvt Ltd" },
    { key: "amount", label: "Amount", required: true, placeholder: "24000" },
  ],
};

const UPDATE_FIELDS: Record<string, FieldConfig[]> = {
  employees: [
    { key: "phone", label: "Phone", placeholder: "9876543210" },
    { key: "email", label: "Email", placeholder: "name@factory1.test" },
    {
      key: "department",
      label: "Department",
      placeholder: "Production",
      options: [
        "Production",
        "Finance",
        "Operations",
        "Packing",
        "Quality",
        "HR",
        "Store",
        "Maintenance",
      ],
    },
    {
      key: "designation",
      label: "Designation",
      placeholder: "Operator",
      options: [
        "Operator",
        "Supervisor",
        "Manager",
        "Engineer",
        "Helper",
        "Accountant",
      ],
    },
    {
      key: "status",
      label: "Status",
      placeholder: "ACTIVE",
      options: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
    },
  ],
  customers: [
    { key: "phone", label: "Phone", placeholder: "9988001122" },
    { key: "email", label: "Email", placeholder: "billing@acme.com" },
    { key: "gstNumber", label: "GST Number", placeholder: "27AAAAA0000A1Z5" },
    { key: "paymentTerms", label: "Payment Terms", placeholder: "Net 30" },
    { key: "contactPerson", label: "Contact Person", placeholder: "Ravi" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  suppliers: [
    { key: "phone", label: "Phone", placeholder: "9988003344" },
    { key: "email", label: "Email", placeholder: "sales@omtraders.com" },
    { key: "gstNumber", label: "GST Number", placeholder: "27BBBBB0000B1Z5" },
    { key: "paymentTerms", label: "Payment Terms", placeholder: "Net 30" },
    { key: "contactPerson", label: "Contact Person", placeholder: "Ravi" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  inventory: [
    { key: "currentStock", label: "Current Stock", placeholder: "0" },
    { key: "minimumStock", label: "Minimum Stock", placeholder: "0" },
    { key: "purchasePrice", label: "Purchase Price", placeholder: "0" },
    { key: "sellingPrice", label: "Selling Price", placeholder: "0" },
    { key: "supplierName", label: "Supplier", placeholder: "Om Traders" },
    { key: "status", label: "Status", placeholder: "ACTIVE", options: ["ACTIVE"] },
  ],
  products: [
    { key: "name", label: "Name", placeholder: "Chair" },
    { key: "description", label: "Description", placeholder: "Wooden chair" },
    {
      key: "active",
      label: "Active",
      placeholder: "true",
      options: ["true", "false"],
    },
  ],
};

interface Props {
  action: AiActionProposal;
  loading: boolean;
  onApply: (
    action: AiActionProposal,
    fields?: Record<string, string>
  ) => void;
}

export function AiActionCard({ action, loading, onApply }: Props) {
  if (action.create === true) {
    return (
      <AiCreateCard
        action={action}
        loading={loading}
        onApply={onApply}
      />
    );
  }

  if (action.delete === true || action.restore === true) {
    return (
      <AiDeleteCard
        action={action}
        loading={loading}
        onApply={onApply}
      />
    );
  }

  if (action.approve === true) {
    return (
      <AiApproveCard
        action={action}
        loading={loading}
        onApply={onApply}
      />
    );
  }

  if (action.export === true) {
    return (
      <AiExportCard
        action={action}
        loading={loading}
        onApply={onApply}
      />
    );
  }

  return (
    <AiUpdateCard
      action={action}
      loading={loading}
      onApply={onApply}
    />
  );
}

function AiApproveCard({ action, loading, onApply }: Props) {
  return (
    <div className="rounded-md border border-l-4 border-l-emerald-500 bg-emerald-50 p-3">
      <div className="text-xs font-medium uppercase text-emerald-700">
        Approve {action.module}
      </div>
      <div className="mt-1 font-medium">{action.recordLabel}</div>
      <p className="mt-2 text-xs text-emerald-700">
        {action.confirmationText}
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={loading}
        onClick={() => onApply(action)}
      >
        Approve
      </Button>
    </div>
  );
}

function AiExportCard({ action, loading, onApply }: Props) {
  return (
    <div className="rounded-md border border-l-4 border-l-indigo-500 bg-indigo-50 p-3">
      <div className="text-xs font-medium uppercase text-indigo-700">
        Export {action.module}
      </div>
      <div className="mt-1 font-medium">{action.recordLabel}</div>
      <p className="mt-2 text-xs text-indigo-700">
        {action.confirmationText}
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={loading}
        onClick={() => onApply(action)}
      >
        Start export
      </Button>
    </div>
  );
}

function AiDeleteCard({ action, loading, onApply }: Props) {
  const isRestore = action.restore === true;

  return (
    <div className="rounded-md border border-l-4 border-l-red-500 bg-red-50 p-3">
      <div className="text-xs font-medium uppercase text-red-700">
        {isRestore ? "Restore" : "Delete"} {action.module}
      </div>
      <div className="mt-1 font-medium">{action.recordLabel}</div>
      <p className="mt-2 text-xs text-red-700">
        {action.confirmationText}
      </p>
      <Button
        type="button"
        size="sm"
        variant={isRestore ? "default" : "destructive"}
        className="mt-3"
        disabled={loading}
        onClick={() => onApply(action)}
      >
        {isRestore ? "Restore record" : "Delete record"}
      </Button>
    </div>
  );
}

function FieldInput({
  field,
  module,
  value,
  onChange,
}: {
  field: FieldConfig;
  module: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = `ai-${module}-${field.key}`;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">
        {field.label}
        {field.required ? (
          <span className="text-destructive"> *</span>
        ) : null}
      </label>
      <Input
        list={field.options ? listId : undefined}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.options ? (
        <datalist id={listId}>
          {field.options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function normalize(value: unknown): string {
  if (value == null) {
    return "";
  }

  const text = String(value);

  return text === "null" ? "" : text;
}

function AiCreateCard({ action, loading, onApply }: Props) {
  const fields =
    CREATE_FIELDS[action.module] ?? [
      { key: "name", label: "Name", required: true, placeholder: "" },
    ];

  const initial = React.useMemo<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    const source = (action.newValues ?? {}) as Record<string, string>;

    for (const field of fields) {
      const existing = source[field.key];

      if (existing != null && existing !== "") {
        values[field.key] = existing;
      }
    }

    return values;
  }, [action.newValues, fields]);

  const [values, setValues] = React.useState<Record<string, string>>(initial);

  const missingRequired = fields.some(
    (field) => field.required && !values[field.key]?.trim()
  );

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    const payload: Record<string, string> = {};

    for (const field of fields) {
      const value = values[field.key]?.trim();

      if (value) {
        payload[field.key] = value;
      }
    }

    onApply(action, payload);
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        New {action.module}
      </div>
      <div className="mt-1 font-medium">Add a new record</div>
      <div className="mt-3 grid gap-2">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            module={`create-${action.module}`}
            value={values[field.key] ?? ""}
            onChange={(value) => handleChange(field.key, value)}
          />
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={loading || missingRequired}
        onClick={handleCreate}
      >
        {missingRequired ? "Fill required fields" : "Create record"}
      </Button>
    </div>
  );
}

function AiUpdateCard({ action, loading, onApply }: Props) {
  const fields =
    UPDATE_FIELDS[action.module] ?? [
      { key: "name", label: "Name", placeholder: "" },
    ];

  const current = React.useMemo<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    const source = (action.currentValues ?? {}) as Record<string, string>;

    for (const field of fields) {
      values[field.key] = normalize(source[field.key]);
    }

    return values;
  }, [action.currentValues, fields]);

  const [values, setValues] = React.useState<Record<string, string>>(current);

  const changed = React.useMemo(() => {
    let count = 0;

    for (const field of fields) {
      const next = values[field.key]?.trim() ?? "";
      const previous = current[field.key]?.trim() ?? "";

      if (next !== previous && next !== "") {
        count += 1;
      }
    }

    return count;
  }, [values, current, fields]);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleUpdate() {
    const payload: Record<string, string> = {};

    for (const field of fields) {
      const next = values[field.key]?.trim() ?? "";

      if (next !== "" && next !== (current[field.key]?.trim() ?? "")) {
        payload[field.key] = next;
      }
    }

    onApply(action, payload);
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {action.module}
      </div>
      <div className="mt-1 font-medium">{action.recordLabel}</div>
      <div className="mt-3 grid gap-2">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            module={`update-${action.module}`}
            value={values[field.key] ?? ""}
            onChange={(value) => handleChange(field.key, value)}
          />
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={loading || changed === 0}
        onClick={handleUpdate}
      >
        {changed === 0 ? "No changes" : `Update ${changed} field${changed > 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
