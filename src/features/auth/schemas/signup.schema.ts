import { z } from "zod";

export const signupSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{6}$/.test(value), {
      message: "Enter the 6 digit OTP",
    }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
