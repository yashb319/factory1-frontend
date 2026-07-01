"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { useGetAttendanceDashboardQuery } from "../api/attendanceApi";

export function AttendanceAiInsights() {

    const today = new Date().toISOString().slice(0, 10);

    const { data, isLoading } = useGetAttendanceDashboardQuery(today);

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card p-4">
                <div className="h-12 animate-pulse rounded-md bg-muted" />
            </div>
        );
    }

    const total =
        (data?.present ?? 0) +
        (data?.absent ?? 0) +
        (data?.halfDay ?? 0) +
        (data?.paidLeave ?? 0) +
        (data?.unpaidLeave ?? 0);

    const attendancePercentage =
        total === 0 ? 0 : Math.round(((data?.present ?? 0) / total) * 100);

    const absentToday = data?.absent ?? 0;
    const halfDayToday = data?.halfDay ?? 0;

    const insights: string[] = [];

    if (attendancePercentage < 75) {
        insights.push(
            "Attendance is below 75% today. Production capacity may be affected."
        );
    }

    if (absentToday > 0) {
        insights.push(
            `${absentToday} employees are absent today. Check if critical roles are impacted.`
        );
    }

    if (halfDayToday > 0) {
        insights.push(
            `${halfDayToday} employees are on half-day today. Check if shift coverage is affected.`
        );
    }

    if (insights.length === 0) {
        insights.push(
            "Attendance looks stable today. No major workforce risk detected."
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>

                <div className="space-y-2">
                    <div>
                        <h3 className="text-sm font-semibold">AI Attendance Insights</h3>
                        <p className="text-sm text-muted-foreground">
                            Early workforce risk signals based on today&apos;s attendance.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {insights.map((insight) => (
                            <div key={insight} className="flex gap-2 text-sm">
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <p>{insight}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}