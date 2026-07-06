import { z } from "zod";

export const signupSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  location: z.string().min(2, "Factory location is required"),
  industryType: z.string().min(2, "Industry type is required"),
  employeeCountEstimate: z.number().min(1, "Enter employee count"),
  gstNumber: z
    .string()
    .optional()
    .refine((value) => !value || /^[0-9A-Z]{15}$/.test(value.trim().toUpperCase()), {
      message: "GST number must be 15 characters",
    }),
  businessType: z.string().optional(),
  state: z.string().optional(),
  otp: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{6}$/.test(value), {
      message: "Enter the 6 digit OTP",
    }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
