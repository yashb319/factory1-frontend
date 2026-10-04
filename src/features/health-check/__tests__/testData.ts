import type { HealthCheckResult, HealthCheckSavingsProjection } from "../types";

export const savingsProjection: HealthCheckSavingsProjection = {
  modelVersion: "3.0.0",
  currency: "INR",
  costBasis: "PRODUCTIVITY_COST_EQUIVALENT",
  factorySizeBand: "MEDIUM",
  assumptions: {
    workingDaysPerMonth: 26,
    loadedHourlyLabourCostInr: 250,
    realizationFactor: { min: 0.4, max: 0.7 },
  },
  modules: [
    {
      area: "INVENTORY",
      moduleName: "Inventory",
      reason: "Connected stock records can reduce repeated counts and manual reconciliation.",
      evidence: ["Stock accuracy varies", "Reordering uses team experience"],
      baselineManualHoursPerMonth: { min: 80, max: 120 },
      estimatedHoursSavedPerMonth: { min: 32.4, max: 67.6 },
      valueStatement: "Stock receipts and usage become easier to trace without waiting for another manual count.",
      estimatedMonthlyCostSavedInr: { min: 8_100, max: 16_900 },
      estimatedMonthlyWasteLeakageReductionInr: null,
      confidence: "MEDIUM",
      dataQuality: "DIRECTIONAL_SELF_REPORTED",
    },
    {
      area: "REPORTING",
      moduleName: "Reports",
      reason: "Shared operational data can reduce report preparation effort.",
      evidence: ["Reports take several days"],
      baselineManualHoursPerMonth: { min: 30, max: 50 },
      estimatedHoursSavedPerMonth: { min: 12, max: 28 },
      valueStatement: "Owners can check the same structured update without waiting for a report to be rebuilt.",
      estimatedMonthlyCostSavedInr: { min: 3_000, max: 7_000 },
      estimatedMonthlyWasteLeakageReductionInr: null,
      confidence: "LOW",
      dataQuality: "DIRECTIONAL_SELF_REPORTED",
    },
  ],
  overall: {
    estimatedHoursSavedMonthly: { min: 44.4, max: 95.6 },
    estimatedHoursSavedYearly: { min: 532.8, max: 1_147.2 },
    estimatedCostSavedMonthlyInr: { min: 11_100, max: 23_900 },
    estimatedCostSavedYearlyInr: { min: 133_200, max: 286_800 },
  },
  disclaimer: "Indicative estimate based on submitted answers and stated assumptions. Actual savings vary and are not guaranteed.",
};

export const healthCheckResult: HealthCheckResult = {
  primaryArea: "INVENTORY",
  priority: "HIGH_OPPORTUNITY",
  recommendedModules: ["Inventory", "Production"],
  secondaryAreas: ["PRODUCTION"],
  keyFindings: [
    "Stock records are updated manually.",
    "Reordering starts after shortages.",
    "Production and stock are disconnected.",
    "Counts often differ.",
  ],
  explanation: "Connected stock movements can give your team earlier warning of shortages.",
  savingsProjection,
};
