import { PublicPayslipViewer } from "@/features/payslips/components/PublicPayslipViewer";

export default async function PublicPayslipPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PublicPayslipViewer token={token} />;
}
