import type {
  HealthCheckArea,
  HealthCheckResult,
  HealthCheckSavingsModule,
} from "./types";

type OperationalArea = Exclude<HealthCheckArea, "FULL_FACTORY">;

const operationalAreas: OperationalArea[] = [
  "EMPLOYEE",
  "PRODUCTION",
  "INVENTORY",
  "FINANCE",
  "REPORTING",
];

const areaBenefits: Record<OperationalArea, { title: string; description: string }> = {
  EMPLOYEE: {
    title: "Keep worker records in one organized place",
    description: "Move away from paper, memory, and repeated updates so the right people can check one consistent record.",
  },
  PRODUCTION: {
    title: "See production progress sooner",
    description: "Bring daily updates together so delays and missed targets are easier to spot before they grow.",
  },
  INVENTORY: {
    title: "Make stock changes easier to trace",
    description: "Record receipts, usage, and adjustments consistently so the team can follow what changed and when.",
  },
  FINANCE: {
    title: "Keep cost and cash information structured and timely",
    description: "Organize operating information as work happens so reviews rely less on late collection and guesswork.",
  },
  REPORTING: {
    title: "Give owners a consistent, self-serve view",
    description: "Use the same organized operating information for regular updates instead of rebuilding reports each time.",
  },
};

export type OperationalBenefit = {
  area: OperationalArea;
  title: string;
  description: string;
};

export function getOperationalBenefits(result: HealthCheckResult): OperationalBenefit[] {
  const modulesByArea = new Map<OperationalArea, HealthCheckSavingsModule>();
  for (const projectionModule of result.savingsProjection?.modules ?? []) {
    modulesByArea.set(projectionModule.area, projectionModule);
  }

  const areas = result.primaryArea === "FULL_FACTORY"
    ? operationalAreas
    : uniqueAreas([
        result.primaryArea,
        ...modulesByArea.keys(),
        ...result.secondaryAreas,
      ]);

  return areas.map((area) => {
    const fallback = areaBenefits[area];
    const valueStatement = modulesByArea.get(area)?.valueStatement?.trim();
    return {
      area,
      title: fallback.title,
      description: valueStatement || fallback.description,
    };
  });
}

function uniqueAreas(areas: HealthCheckArea[]): OperationalArea[] {
  return Array.from(
    new Set(areas.filter((area): area is OperationalArea => area !== "FULL_FACTORY"))
  );
}
