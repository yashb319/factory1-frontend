import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductionMaterialPreview } from "../components/ProductionMaterialPreview";

describe("ProductionMaterialPreview", () => {
  it("renders additive material names and codes without exposing internal ids", () => {
    const inventoryItemId = "33333333-3333-4333-8333-333333333333";
    const consumptionId = "44444444-4444-4444-8444-444444444444";

    render(
      <ProductionMaterialPreview
        preview={{
          finishedGoodCredit: 1,
          stockWarnings: [],
          items: [
            {
              inventoryItemId,
              itemCode: "RM-004",
              itemName: "Aluminium Sheet",
              requiredQuantity: 3,
              coveredQuantity: 1,
              newStockDebitQuantity: 2,
              unit: "KG",
              coverageSources: [
                {
                  consumptionId,
                  inventoryItemId,
                  itemCode: "RM-004",
                  itemName: "Aluminium Sheet",
                  quantity: 1,
                  unit: "KG",
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getAllByText(/RM-004 - Aluminium Sheet/)).toHaveLength(2);
    expect(screen.queryByText(inventoryItemId)).not.toBeInTheDocument();
    expect(screen.queryByText(consumptionId)).not.toBeInTheDocument();
  });

  it("uses an explicit fallback only when a historical relation has no label", () => {
    render(
      <ProductionMaterialPreview
        preview={{
          finishedGoodCredit: 0,
          stockWarnings: [],
          items: [
            {
              inventoryItemId: "deleted-item",
              requiredQuantity: 1,
              coveredQuantity: 0,
              newStockDebitQuantity: 1,
              unit: "PCS",
              coverageSources: [],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Material name unavailable")).toBeInTheDocument();
    expect(screen.queryByText("deleted-item")).not.toBeInTheDocument();
  });
});
