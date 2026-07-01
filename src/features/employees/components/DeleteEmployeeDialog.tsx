"use client";

import { Loader2, Trash2 } from "lucide-react";
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

import { Employee } from "../types/employee.types";
import { useDeleteEmployeeMutation } from "../api/employeeApi";

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: Props) {
  const [deleteEmployee, { isLoading }] = useDeleteEmployeeMutation();

  async function handleDelete() {
    if (!employee) return;

    try {
      await deleteEmployee(employee.id).unwrap();

      toast.success("Employee deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete employee");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>

          <AlertDialogTitle>Delete employee?</AlertDialogTitle>

          <AlertDialogDescription>
            This action will remove{" "}
            <span className="font-medium text-foreground">
              {employee?.name}
            </span>{" "}
            from your employee records. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={isLoading}
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}