import { z } from "zod";

export const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),

  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  photoDataUrl: z.string().optional(),

  employeeType: z.enum(["BLUE_COLLAR", "STAFF", "SUPERVISOR", "MANAGER"]),

  designation: z.string().optional(),
  department: z.string().optional(),

  salaryRate: z.number().min(0, "Salary must be 0 or more"),

  salaryType: z.enum(["HOURLY", "DAILY", "MONTHLY"]),

  joiningDate: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
