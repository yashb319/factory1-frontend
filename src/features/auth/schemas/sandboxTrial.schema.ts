import { z } from "zod";

export const sandboxTrialSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120, "Name is too long"),
  organizationName: z
    .string()
    .trim()
    .min(1, "Enter your organization name")
    .max(160, "Organization name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255, "Email is too long"),
});

export type SandboxTrialFormValues = z.infer<typeof sandboxTrialSchema>;
