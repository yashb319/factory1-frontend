import { z } from "zod";

export const employeeStatutoryProfileSchema = z.object({
  panNumber: z.string().max(20, "PAN number must be 20 characters or fewer").optional(),
  uan: z.string().max(40, "UAN must be 40 characters or fewer").optional(),
  pfAccountNumber: z
    .string()
    .max(40, "PF account number must be 40 characters or fewer")
    .optional(),
  pfEnabled: z.boolean().optional(),
  epsMember: z.boolean().optional(),
  pfCalculationType: z
    .enum(["STATUTORY_CEILING", "ACTUAL_WAGES", "CUSTOM"])
    .optional(),
  customPfWage: z.number().min(0, "Custom PF wage cannot be negative").optional(),
  voluntaryPfEnabled: z.boolean().optional(),
  voluntaryPfPercent: z
    .number()
    .min(0, "Voluntary PF percentage cannot be negative")
    .max(100, "Voluntary PF percentage cannot exceed 100")
    .optional(),
  taxRegime: z.enum(["OLD", "NEW"]).optional(),
  previousEmployerIncome: z
    .number()
    .min(0, "Previous employer income cannot be negative")
    .optional(),
  otherDeclaredIncome: z
    .number()
    .min(0, "Other declared income cannot be negative")
    .optional(),
  housePropertyIncome: z.number().optional(),
  declaredDeductionsTotal: z
    .number()
    .min(0, "Declared deductions cannot be negative")
    .optional(),
});

export const employeeFormSchema = z
  .object({
    code: z.string().optional(),
    name: z.string().min(2, "Name must be at least 2 characters"),

    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    photoDataUrl: z.string().optional(),

    designation: z.string().optional(),
    department: z.string().optional(),

    salaryRate: z.number().min(0, "Salary must be 0 or more"),

    salaryType: z.enum(["HOURLY", "DAILY", "MONTHLY"]),

    joiningDate: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),

    location: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    address: z.string().optional(),
    mobile: z
      .string()
      .regex(/^\d{10}$/, "Mobile number must contain exactly 10 digits")
      .optional()
      .or(z.literal("")),
    permanentAddress: z.string().optional(),
    maritalStatus: z
      .enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"])
      .optional(),
    aadhaarNumber: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranchName: z.string().optional(),
    bankIfscCode: z.string().optional(),
    employmentBasis: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).optional(),
    reportingToEmployeeId: z.string().optional(),
    statutoryProfile: employeeStatutoryProfileSchema.optional(),
  })
  .superRefine((values, context) => {
    if (
      values.dateOfBirth &&
      values.joiningDate &&
      values.dateOfBirth >= values.joiningDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth must be before the joining date",
      });
      context.addIssue({
        code: "custom",
        path: ["joiningDate"],
        message: "Joining date must be after the date of birth",
      });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
