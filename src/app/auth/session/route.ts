import { getAuthSession } from "@/features/partner-saas/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getAuthSession(request);
}
