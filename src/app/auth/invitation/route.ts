import { activateProductInvitation, getInvitationChallenge } from "@/features/partner-saas/auth/server";

export const runtime = "nodejs";
export const GET = getInvitationChallenge;
export const POST = activateProductInvitation;
