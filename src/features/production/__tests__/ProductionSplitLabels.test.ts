import { describe, expect, it } from "vitest";
import {
  assignmentEffectLabel,
  qualityEvidenceLabel,
} from "../components/ProductionSplit";

describe("production split labels", () => {
  it("uses resolved assignment and source-step names", () => {
    expect(
      assignmentEffectLabel({
        assignmentId: "assignment-id",
        effect: "INHERITED",
        targetRole: "OPERATOR",
        assigneeUserId: "user-id",
        assigneeName: "Asha Rao",
        vendorId: null,
        vendorName: null,
        sourceStepId: "step-id",
        sourceStepName: "Cutting",
        deadline: null,
      })
    ).toBe("INHERITED / OPERATOR / Asha Rao / source step Cutting");
  });

  it("uses resolved quality definition and production references", () => {
    expect(
      qualityEvidenceLabel({
        resultId: "result-id",
        sourceOrderId: "order-id",
        sourceOrderNumber: "PO-1042",
        sourceStepId: "step-id",
        sourceStepName: "Inspection",
        definitionId: "definition-id",
        definitionCode: "QC-07",
        definitionName: "Surface finish",
        passed: true,
        scope: "BATCH",
      })
    ).toBe(
      "PASS / BATCH / QC-07 - Surface finish / PO-1042 / Inspection"
    );
  });
});
