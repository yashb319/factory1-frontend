"use client";

import { useEffect } from "react";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  useCreateEmployeeStatutoryProfileMutation,
  useGetEmployeeStatutoryProfileQuery,
  useUpdateEmployeeStatutoryProfileMutation,
} from "../api/employeeApi";
import { EmployeeStatutoryProfileRequest } from "../types/employee.types";
import {
  createDefaultStatutoryProfile,
  normalizeStatutoryProfile,
} from "../utils/employeeStatutory";
import { EmployeeStatutoryFields } from "./EmployeeStatutoryFields";

interface Props {
  employeeId: string;
}

function isNotFound(error: unknown) {
  return (error as FetchBaseQueryError | undefined)?.status === 404;
}

export function EmployeeStatutoryForm({ employeeId }: Props) {
  const profileQuery = useGetEmployeeStatutoryProfileQuery(employeeId);
  const [createProfile, createState] =
    useCreateEmployeeStatutoryProfileMutation();
  const [updateProfile, updateState] =
    useUpdateEmployeeStatutoryProfileMutation();
  const form = useForm<EmployeeStatutoryProfileRequest>({
    defaultValues: createDefaultStatutoryProfile(),
  });
  const values = useWatch({ control: form.control });
  const hasProfile = Boolean(profileQuery.data);
  const canEdit = !profileQuery.isLoading && (!profileQuery.isError || isNotFound(profileQuery.error));

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(profileQuery.data);
    } else if (profileQuery.isError && isNotFound(profileQuery.error)) {
      form.reset(createDefaultStatutoryProfile());
    }
  }, [form, profileQuery.data, profileQuery.error, profileQuery.isError]);

  async function onSubmit(values: EmployeeStatutoryProfileRequest) {
    const body = normalizeStatutoryProfile(values);

    try {
      if (hasProfile) {
        await updateProfile({ employeeId, body }).unwrap();
      } else {
        await createProfile({ employeeId, body }).unwrap();
      }
      toast.success("Statutory details saved");
    } catch {
      toast.error("Could not save statutory details");
    }
  }

  if (profileQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading statutory details...</p>;
  }

  if (profileQuery.isError && !isNotFound(profileQuery.error)) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        Statutory details could not be loaded.
      </p>
    );
  }

  return (
    <section className="border-t pt-6">
      <div>
        <h2 className="text-sm font-semibold">Statutory details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          India PF and payroll TDS inputs used for future payroll runs.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-5">
        <EmployeeStatutoryFields
          value={values}
          onChange={(field, value) =>
            form.setValue(field, value as never, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={!canEdit || createState.isLoading || updateState.isLoading}>
            {createState.isLoading || updateState.isLoading ? "Saving..." : "Save statutory details"}
          </Button>
        </div>
      </form>
    </section>
  );
}
