"use client";

import { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EmployeeFormValues } from "../schemas/employee.schema";

interface Props {
  form: UseFormReturn<EmployeeFormValues>;
}

const familyMembers = [
  ["father", "Father"],
  ["mother", "Mother"],
  ["spouse", "Spouse"],
  ["child1", "Child 1"],
  ["child2", "Child 2"],
] as const;

const genderOptions = [
  ["MALE", "Male"],
  ["FEMALE", "Female"],
  ["OTHER", "Other"],
] as const;

export function EmployeeInsuranceFields({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium">Family details</h4>
        <div className="mt-3 space-y-4">
          {familyMembers.map(([key, label]) => {
            const nameField = `${key}Name` as
              | "fatherName"
              | "motherName"
              | "spouseName"
              | "child1Name"
              | "child2Name";
            const dateField = `${key}DateOfBirth` as
              | "fatherDateOfBirth"
              | "motherDateOfBirth"
              | "spouseDateOfBirth"
              | "child1DateOfBirth"
              | "child2DateOfBirth";
            const genderField = `${key}Gender` as
              | "fatherGender"
              | "motherGender"
              | "spouseGender"
              | "child1Gender"
              | "child2Gender";

            return (
              <fieldset key={key} className="rounded-lg border p-4">
                <legend className="px-1 text-xs font-semibold text-muted-foreground">
                  {label}
                </legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input {...form.register(nameField)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" {...form.register(dateField)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select
                      value={form.watch(genderField) ?? ""}
                      onValueChange={(value) =>
                        form.setValue(
                          genderField,
                          value as EmployeeFormValues[typeof genderField],
                          { shouldDirty: true, shouldValidate: true }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map(([value, text]) => (
                          <SelectItem key={value} value={value}>
                            {text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium">Health and occupation</h4>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Height (cm)</label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...form.register("heightCm", {
                setValueAs: (value) => value === "" ? undefined : Number(value),
              })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight (kg)</label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...form.register("weightKg", {
                setValueAs: (value) => value === "" ? undefined : Number(value),
              })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Smoking Status</label>
            <Select
              value={
                form.watch("smoker") === undefined
                  ? ""
                  : form.watch("smoker")
                    ? "YES"
                    : "NO"
              }
              onValueChange={(value) =>
                form.setValue("smoker", value === "YES", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">Non-Smoker</SelectItem>
                <SelectItem value="YES">Smoker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Occupation</label>
            <Input {...form.register("occupation")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Organisation Name</label>
            <Input {...form.register("organizationName")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Annual Income</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              {...form.register("annualIncome", {
                setValueAs: (value) => value === "" ? undefined : Number(value),
              })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium">Education</label>
            <Input {...form.register("education")} />
          </div>
        </div>
      </div>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Nominee</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input {...form.register("nomineeName")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <Input type="date" {...form.register("nomineeDateOfBirth")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <Select
              value={form.watch("nomineeGender") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "nomineeGender",
                  value as EmployeeFormValues["nomineeGender"],
                  { shouldDirty: true, shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Relationship with Employee
            </label>
            <Input {...form.register("nomineeRelationship")} />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
