"use client";

import { useState } from "react";
import { FileText, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useCreatePayslipTemplateDraftVersionMutation,
  useDeletePayslipTemplateMutation,
  useGetPayslipTemplatesQuery,
  usePublishPayslipTemplateMutation,
  useSetDefaultPayslipTemplateMutation,
} from "../api/payslipTemplateApi";
import { PayslipTemplateResponse } from "../types/payslipTemplate.types";
import { PayslipTemplateFormDialog } from "./PayslipTemplateFormDialog";

export function PayslipTemplatesPanel() {
  const { data, isLoading } = useGetPayslipTemplatesQuery();
  const [publishTemplate, { isLoading: publishing }] =
    usePublishPayslipTemplateMutation();
  const [createDraftVersion, { isLoading: creatingDraft }] =
    useCreatePayslipTemplateDraftVersionMutation();
  const [setDefaultTemplate, { isLoading: settingDefault }] =
    useSetDefaultPayslipTemplateMutation();
  const [deleteTemplate, { isLoading: deleting }] =
    useDeletePayslipTemplateMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PayslipTemplateResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PayslipTemplateResponse | null>(
    null
  );

  const templates = data?.data ?? [];
  const busy = publishing || creatingDraft || settingDefault || deleting;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(template: PayslipTemplateResponse) {
    setEditing(template);
    setFormOpen(true);
  }

  async function handlePublish(template: PayslipTemplateResponse) {
    try {
      await publishTemplate(template.id).unwrap();
      toast.success("Template published");
    } catch {
      toast.error("Could not publish template");
    }
  }

  async function handleNewDraftVersion(template: PayslipTemplateResponse) {
    try {
      await createDraftVersion(template.id).unwrap();
      toast.success("New draft version created");
    } catch {
      toast.error("Could not create a new draft version");
    }
  }

  async function handleSetDefault(template: PayslipTemplateResponse) {
    try {
      await setDefaultTemplate(template.id).unwrap();
      toast.success("Default template updated");
    } catch {
      toast.error("Could not set default template");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteTemplate(pendingDelete.id).unwrap();
      toast.success("Template deleted");
      setPendingDelete(null);
    } catch {
      toast.error("Could not delete template");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Payslip Templates</h2>
            <p className="mt-1 text-sm text-slate-500">
              Design the layout used when payslips are generated. Templates are versioned — publish a draft
              to make it available, or start a new draft version from an already-published template.
            </p>
          </div>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                  Loading templates...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                  No payslip templates yet. A system default is used until you create one.
                </TableCell>
              </TableRow>
            )}

            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="whitespace-normal font-medium text-slate-900">
                  {template.name}
                  {template.description && (
                    <p className="mt-0.5 text-xs font-normal text-slate-500">
                      {template.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={template.status} />
                </TableCell>
                <TableCell>v{template.version}</TableCell>
                <TableCell>
                  {template.isDefault ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {template.status === "DRAFT" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(template)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => handlePublish(template)}
                        >
                          Publish
                        </Button>
                      </>
                    )}

                    {template.status === "PUBLISHED" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleNewDraftVersion(template)}
                        >
                          New draft version
                        </Button>
                        {!template.isDefault && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleSetDefault(template)}
                          >
                            Set default
                          </Button>
                        )}
                      </>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setPendingDelete(template)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PayslipTemplateFormDialog
        key={`${formOpen}-${editing?.id ?? "new"}`}
        open={formOpen}
        template={editing}
        onOpenChange={setFormOpen}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this template version. Payslips already generated with it are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: PayslipTemplateResponse["status"] }) {
  if (status === "PUBLISHED") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">Published</Badge>;
  }
  if (status === "ARCHIVED") {
    return <Badge variant="outline">Archived</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}
