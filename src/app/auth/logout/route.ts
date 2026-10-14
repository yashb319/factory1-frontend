import { logoutAuth } from "@/features/partner-saas/auth/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return logoutAuth(request);
}
