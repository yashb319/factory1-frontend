"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetOrganizationSettingsQuery,
  useTerminateOrganizationMutation,
} from "../api/organizationSettingsApi";

export function TerminateOrganizationPanel() {
  const { data } = useGetOrganizationSettingsQuery();
  const [terminate, { isLoading }] = useTerminateOrganizationMutation();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const orgName = data?.data?.organizationName ?? "";

  async function handleTerminate() {
    try {
      await terminate().unwrap();
      toast.success("Organization terminated. You will be logged out shortly.");
      setOpen(false);
    } catch {
      toast.error("Could not terminate organization");
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-red-950">
            Terminate Organization
          </h2>
          <p className="mt-1 text-sm text-red-700">
            This permanently closes {orgName ? <strong>{orgName}</strong> : "your organization"}. All
            data is marked for deletion and every user is signed out. This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-4"
            onClick={() => {
              setConfirmText("");
              setOpen(true);
            }}
          >
            <Trash2 size={16} />
            Terminate Organization
          </Button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate {orgName || "organization"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Type <strong>{orgName || "the organization name"}</strong> below to confirm. This
              immediately revokes access for all users and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            className="h-9"
            placeholder={orgName || "Organization name"}
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading || confirmText !== orgName}
              className="bg-red-600 hover:bg-red-700"
              onClick={handleTerminate}
            >
              {isLoading ? "Terminating..." : "Terminate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
