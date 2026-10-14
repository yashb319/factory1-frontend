import { z } from "zod";

export const SUPPORT_ISSUE_TYPES = [
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "LEAVE", label: "Leave" },
  { value: "PAYROLL", label: "Payroll" },
  { value: "ACCOUNT_ACCESS", label: "Account / Login" },
  { value: "TECHNICAL", label: "Technical issue" },
  { value: "OTHER", label: "Other" },
] as const;

const singleLine = /^[^\u0000-\u001f\u007f-\u009f\u2028\u2029]*$/;
const descriptionText = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]*$/;

export const contactSupportSchema = z.object({
  name: z.string()
    .regex(singleLine, "Enter your name on one line without control characters.")
    .trim().min(1, "Enter your name.").max(120, "Use 120 characters or fewer."),
  companyEmail: z.string()
    .regex(singleLine, "Enter your company email on one line.")
    .trim().min(1, "Enter your company email.")
    .max(254, "Use 254 characters or fewer.")
    .email("Enter a valid company email."),
  issueType: z.enum(
    ["ATTENDANCE", "LEAVE", "PAYROLL", "ACCOUNT_ACCESS", "TECHNICAL", "OTHER"],
    { error: "Choose an issue type." }
  ),
  description: z.string()
    .regex(descriptionText, "Remove unsupported control characters.")
    .trim().min(1, "Describe your issue.")
    .max(5000, "Use 5,000 characters or fewer."),
});

export type ContactSupportRequest = z.infer<typeof contactSupportSchema>;

export type ContactSupportResponse = {
  success: true;
  message: string;
  data: null;
};

export function isContactSupportResponse(value: unknown): value is ContactSupportResponse {
  return typeof value === "object" && value !== null &&
    "success" in value && value.success === true &&
    "message" in value && typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    "data" in value && value.data === null;
}
