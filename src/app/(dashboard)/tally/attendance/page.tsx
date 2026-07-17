import { Suspense } from "react";
import { AttendanceTallyView } from "@/features/attendance/tally/AttendanceTallyView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AttendanceTallyView />
    </Suspense>
  );
}
