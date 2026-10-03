import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BomDialog } from "../components/BomDialog";

const inventoryId = "11111111-1111-4111-8111-111111111111";

vi.mock("@/features/inventory/api/inventoryApi", () => ({
  useGetInventoryItemsQuery: vi.fn(() => ({
    data: { content: [], page: 0, size: 300, totalElements: 0, totalPages: 0 },
  })),
}));

vi.mock("../api/productsApi", () => ({
  useGetBomQuery: vi.fn(() => ({
    data: {
      id: "bom-1",
      productId: "product-1",
      name: "Default BOM",
      active: true,
      components: [
        {
          inventoryItemId: inventoryId,
          itemCode: "RM-001",
          itemName: "Steel Sheet",
          quantityRequired: 2,
          unit: "KG",
        },
      ],
    },
  })),
  useSaveBomMutation: vi.fn(() => [
    vi.fn(),
    { isLoading: false },
  ]),
}));

describe("BomDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the saved component label instead of its raw id when the inventory page does not contain it", async () => {
    render(
      <BomDialog
        open
        onOpenChange={vi.fn()}
        product={{
          id: "product-1",
          productCode: "FG-001",
          name: "Finished Cabinet",
          finishedGoodInventoryItemId: "finished-good-1",
          active: true,
          hasBom: true,
        }}
      />
    );

    expect(await screen.findByRole("option", { name: "RM-001 - Steel Sheet" })).toBeInTheDocument();
    expect(screen.queryByText(inventoryId)).not.toBeInTheDocument();
  });
});
