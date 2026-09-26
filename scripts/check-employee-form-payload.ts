import assert from "node:assert/strict";

import {
  buildEmployeeUpdateRequest,
  EmployeeStatutorySaveError,
  saveEmployeeEdit,
} from "../src/features/employees/utils/employeeFormPayload.ts";
import type { EmployeeFormValues } from "../src/features/employees/schemas/employee.schema.ts";

const baseValues: EmployeeFormValues = {
  name: "Test Employee",
  salaryRate: 500,
  salaryType: "DAILY",
  status: "ACTIVE",
  photoDataUrl: "https://cdn.example.com/existing.jpg",
  statutoryProfile: { taxRegime: "NEW" },
};

const replacement = "data:image/png;base64,AAAA";
assert.equal(
  buildEmployeeUpdateRequest(baseValues).photoDataUrl,
  baseValues.photoDataUrl,
  "existing HTTP image URLs must remain unchanged"
);
assert.equal(
  buildEmployeeUpdateRequest({
    ...baseValues,
    photoDataUrl: replacement,
  }).photoDataUrl,
  replacement,
  "replacement data URLs must be sent unchanged"
);
assert.equal(
  buildEmployeeUpdateRequest({
    ...baseValues,
    photoDataUrl: "",
  }).photoDataUrl,
  "",
  "removed photos must be sent as an explicit blank value"
);

const calls: string[] = [];
await saveEmployeeEdit({
  employeeId: "employee-1",
  hasStatutoryProfile: true,
  values: baseValues,
  updateEmployee: async () => {
    calls.push("employee");
  },
  createStatutoryProfile: async () => {
    calls.push("create-statutory");
  },
  updateStatutoryProfile: async () => {
    calls.push("update-statutory");
  },
});
assert.deepEqual(
  calls,
  ["employee", "update-statutory"],
  "unified edit must save employee fields before statutory details"
);

const createCalls: string[] = [];
await saveEmployeeEdit({
  employeeId: "employee-2",
  hasStatutoryProfile: false,
  values: baseValues,
  updateEmployee: async () => {
    createCalls.push("employee");
  },
  createStatutoryProfile: async () => {
    createCalls.push("create-statutory");
  },
  updateStatutoryProfile: async () => {
    createCalls.push("update-statutory");
  },
});
assert.deepEqual(createCalls, ["employee", "create-statutory"]);

await assert.rejects(
  saveEmployeeEdit({
    employeeId: "employee-1",
    hasStatutoryProfile: false,
    values: baseValues,
    updateEmployee: async () => {},
    createStatutoryProfile: async () => {
      throw new Error("statutory failed");
    },
    updateStatutoryProfile: async () => {},
  }),
  EmployeeStatutorySaveError,
  "statutory failures must propagate to the unified submit handler"
);

console.log("Employee form payload checks passed");
