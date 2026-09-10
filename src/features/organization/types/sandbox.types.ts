import type { ApiResponse } from "@/types/api";

export type SandboxStatus = {
  isSandbox: boolean;
  expiresAt: string | null;
};

export type SandboxStatusResponse = ApiResponse<SandboxStatus>;

export type SandboxConvertResponse = ApiResponse<{
  message: string;
}>;
