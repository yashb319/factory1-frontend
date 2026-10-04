import type { CostingPolicyOptions } from "../types/costing.types";

export const COSTING_POLICY_OPTIONS: CostingPolicyOptions = {
  materialValuations: [
    {
      value: "LATEST_POSTED_PURCHASE",
      label: "Latest posted purchase",
      description:
        "Use the latest eligible posted purchase evidence. Mutable catalog prices remain an estimate fallback.",
    },
    {
      value: "MANUAL_STANDARD",
      label: "Manual standard cost",
      description:
        "Use an explicitly maintained standard rate with source evidence.",
    },
  ],
  sellingPriceBases: [
    {
      value: "NONE",
      label: "No selling-price basis",
      description: "Exclude selling-price evidence from Phase 1 costing.",
    },
    {
      value: "LATEST_POSTED_SALE",
      label: "Latest posted sale",
      description: "Use eligible posted sales evidence linked to the product.",
    },
    {
      value: "CURRENT_LIST_PRICE",
      label: "Current list price",
      description:
        "Use the mutable finished-good catalog price as an estimate.",
    },
  ],
  allocationModes: [
    {
      value: "EXCLUDED",
      label: "Excluded",
      description: "Return no amount for this component; never substitute zero.",
    },
    {
      value: "PER_OUTPUT",
      label: "Amount per output unit",
      description:
        "Apply the explicit amount to each output unit. This is a policy assumption, not a timesheet.",
    },
    {
      value: "TOTAL_ALLOCATION",
      label: "Total allocation",
      description: "Allocate the explicit total across the policy output quantity.",
    },
  ],
};
