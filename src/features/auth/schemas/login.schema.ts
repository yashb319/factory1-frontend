import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{6}$/.test(value), {
      message: "Enter the 6 digit OTP",
    }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
