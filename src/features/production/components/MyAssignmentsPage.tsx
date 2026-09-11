"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/hook";
import { useGetOrganizationSettingsQuery } from "@/features/organization-settings/api/organizationSettingsApi";
import { useGetMyAssignmentsQuery } from "../api/productionApi";
import type { MyAssignmentResponse } from "../types/production.types";
import { PartialCompletionForm } from "./PartialCompletionForm";

function statusTone(status?: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "BLOCKED" || status === "HOLD") return "warning" as const;
  if (status === "IN_PROGRESS" || status === "PAUSED") return "pending" as const;
  return "info" as const;
}

function isOverdue(deadline?: string) {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

export function MyAssignmentsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const assignmentsQuery = useGetMyAssignmentsQuery();
  const orgSettingsQuery = useGetOrganizationSettingsQuery();
  const selfServiceEnabled = Boolean(
    orgSettingsQuery.data?.data.employeeSelfProgressUpdateEnabled
  );

  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My orders"
        description="Production steps assigned to you across all active orders."
        icon={ClipboardList}
        module="production"
      />

      {!selfServiceEnabled ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Your organization has not enabled employee self-progress updates yet. You can view your
            assignments below, but logging output and completing steps must be done by a
            production lead.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Assigned steps</CardTitle>
          <CardDescription>Deadline, status, and quantities for each step assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your assignments...
            </div>
          ) : assignmentsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load your assignments right now.</p>
              <Button size="sm" variant="outline" onClick={() => void assignmentsQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : !assignments.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No assignments yet"
              description="Production steps assigned to you will show up here."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => (
                <MyAssignmentCard
                  key={assignment.assignmentId}
                  assignment={assignment}
                  canSelfUpdate={selfServiceEnabled}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MyAssignmentCard({
  assignment,
  canSelfUpdate,
}: {
  assignment: MyAssignmentResponse;
  canSelfUpdate: boolean;
  currentUserId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(assignment.deadline);
  const remainingQuantity =
    assignment.remainingQuantity ??
    Math.max(
      assignment.plannedQuantity -
        assignment.completedQuantity -
        assignment.rejectedQuantity,
      0
    );

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{assignment.orderNumber}</div>
          <div className="text-xs text-muted-foreground">
            {assignment.productName ?? assignment.productId}
          </div>
        </div>
        <StatusBadge tone={statusTone(assignment.orderStatus)}>{assignment.orderStatus}</StatusBadge>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <div>Step: {assignment.stepName}</div>
        <div>
          Output {assignment.completedQuantity} / {assignment.plannedQuantity}
          {assignment.rejectedQuantity ? ` (rejected ${assignment.rejectedQuantity})` : ""}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {assignment.stepStatus ? (
          <Badge variant="outline">{assignment.stepStatus}</Badge>
        ) : null}
        {assignment.deadline ? (
          <Badge variant={overdue ? "destructive" : "outline"}>
            {overdue ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
            Due {new Date(assignment.deadline).toLocaleString()}
          </Badge>
        ) : null}
      </div>

      {canSelfUpdate ? (
        <div className="mt-3 space-y-2">
          {assignment.stepStatus !== "COMPLETED" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Hide production form" : "Record production"}
            </Button>
          ) : null}

          {expanded ? (
            <PartialCompletionForm
              orderId={assignment.orderId}
              stepId={assignment.stepId}
              remainingQuantity={remainingQuantity}
              expectedOrderVersion={assignment.executionVersion}
              expectedStepVersion={assignment.stepExpectedVersion}
              onDone={() => setExpanded(false)}
              onCancel={() => setExpanded(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
