"use client";

import { CalendarCheck, Clock, UserCheck, UserX } from "lucide-react";
import { useGetAttendanceDashboardQuery } from "../api/attendanceApi";

export function AttendanceStatsCards() {
    const today = new Date().toISOString().slice(0, 10);

    const { data, isLoading } = useGetAttendanceDashboardQuery(today);

    const total =
        (data?.present ?? 0) +
        (data?.absent ?? 0) +
        (data?.halfDay ?? 0) +
        (data?.paidLeave ?? 0) +
        (data?.unpaidLeave ?? 0);

    const attendancePercentage =
        total === 0 ? 0 : Math.round(((data?.present ?? 0) / total) * 100);

    const cards = [
        {
            label: "Present",
            value: data?.present ?? 0,
            icon: UserCheck,
        },
        {
            label: "Absent",
            value: data?.absent ?? 0,
            icon: UserX,
        },
        {
            label: "Half Day",
            value: data?.halfDay ?? 0,
            icon: Clock,
        },
        {
            label: "Attendance %",
            value: `${attendancePercentage}%`,
            icon: CalendarCheck,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {isLoading ? "-" : card.value}
                            </p>
                        </div>

                        <div className="rounded-lg bg-primary/10 p-2">
                            <card.icon className="h-5 w-5 text-primary" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}