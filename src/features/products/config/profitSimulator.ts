export const PROFIT_SIMULATOR_BOUNDS = {
  sellingPrice: { min: 0, max: 1_000_000_000_000, step: 0.01 },
  outputQuantity: { min: 0.000001, max: 1_000_000_000_000, step: 1 },
  materialQuantity: { min: 0, max: 1_000_000_000_000, step: 0.001 },
  materialRate: { min: 0, max: 1_000_000_000_000, step: 0.01 },
  wastePercentChange: { min: -100, max: 10_000, step: 0.1 },
  allocation: { min: 0, max: 1_000_000_000_000_000_000, step: 0.01 },
} as const;

export const PROFIT_SIMULATOR_MAX_MATERIAL_OVERRIDES = 100;
