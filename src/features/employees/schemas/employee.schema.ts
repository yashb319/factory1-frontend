import { z } from "zod";

export const employeeFormSchema = z.object({
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
  mobile: z.string().optional(),
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
  // Stores the selected employee's id client-side; mapped to
  // reportingToEmployeeId on submit.
  reportingToEmployeeId: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
