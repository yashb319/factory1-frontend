"use client";

import {
  Download,
  FileWarning,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataJob, DataJobStatus } from "../types/importExport.types";

interface Props {
  jobs: DataJob[];
}

function getStatusBadge(status: DataJobStatus) {
  switch (status) {
    case "COMPLETED":
      return <Badge>Completed</Badge>;
    case "RUNNING":
      return <Badge variant="secondary">Running</Badge>;
    case "PENDING":
      return <Badge variant="outline">Pending</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "PARTIAL_SUCCESS":
      return <Badge variant="secondary">Partial Success</Badge>;
  }
}

export function ImportExportTable({ jobs }: Props) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Recent Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Imports and exports initiated across your organization.
          </p>
        </div>

        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[180px]">Progress</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[70px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Badge variant="outline">{job.operation}</Badge>
                </TableCell>

                <TableCell className="font-medium">{job.module}</TableCell>

                <TableCell>
                  <div>
                    <p className="font-medium">{job.fileName}</p>
                    {job.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed {job.completedAt}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell>{getStatusBadge(job.status)}</TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <Progress value={job.progress} />
                    <p className="text-xs text-muted-foreground">
                      {job.progress}%
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">
                    <p>Total: {job.totalRows ?? "-"}</p>
                    <p className="text-muted-foreground">
                      Success: {job.successRows ?? "-"} / Failed:{" "}
                      {job.failedRows ?? "-"}
                    </p>
                  </div>
                </TableCell>

                <TableCell>{job.createdBy}</TableCell>
                <TableCell>{job.createdAt}</TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {job.outputFileUrl && (
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download Output
                        </DropdownMenuItem>
                      )}

                      {job.errorFileUrl && (
                        <DropdownMenuItem>
                          <FileWarning className="mr-2 h-4 w-4" />
                          Download Error File
                        </DropdownMenuItem>
                      )}

                      {!job.outputFileUrl && !job.errorFileUrl && (
                        <DropdownMenuItem disabled>
                          No files available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}