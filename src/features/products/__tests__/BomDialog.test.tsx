import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BomDialog } from "../components/BomDialog";

const inventoryId = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  inventoryQuery: vi.fn(),
  refetchInventory: vi.fn(),
  saveBom: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

vi.mock("@/features/inventory/api/inventoryApi", () => ({
  useGetInventoryItemsQuery: mocks.inventoryQuery,
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
  useSaveBomMutation: vi.fn(() => [mocks.saveBom, { isLoading: false }]),
}));

describe("BomDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inventoryQuery.mockReturnValue({
      data: { content: [], page: 0, size: 300, totalElements: 0, totalPages: 0 },
      isError: false,
      isFetching: false,
      refetch: mocks.refetchInventory,
    });
    mocks.saveBom.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: "bom-1",
        productId: "product-1",
        name: "Default BOM",
        active: true,
        components: [],
      }),
    });
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

  it("populates component choices from supported inventory items", async () => {
    mocks.inventoryQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "raw-1",
            itemCode: "RM-002",
            name: "Aluminium Sheet",
            itemType: "RAW_MATERIAL",
            unit: "KG",
            currentStock: 12,
            minimumStock: 1,
            inventoryValue: 120,
            status: "ACTIVE",
            lowStock: false,
            outOfStock: false,
          },
          {
            id: "finished-1",
            itemCode: "FG-002",
            name: "Finished Table",
            itemType: "FINISHED_GOOD",
            unit: "PCS",
            currentStock: 2,
            minimumStock: 1,
            inventoryValue: 200,
            status: "ACTIVE",
            lowStock: false,
            outOfStock: false,
          },
        ],
        page: 0,
        size: 300,
        totalElements: 2,
        totalPages: 1,
      },
      isError: false,
      isFetching: false,
      refetch: mocks.refetchInventory,
    });

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

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    expect(await screen.findByRole("option", { name: "RM-002 - Aluminium Sheet (RAW_MATERIAL)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Finished Table/ })).not.toBeInTheDocument();
  });

  it("shows the inventory API error and offers a retry instead of an empty-success dropdown", async () => {
    mocks.inventoryQuery.mockReturnValue({
      error: {
        status: 500,
        data: {
          message:
            "No enum constant com.factory1.inventory.model.InventoryItemType.SPARE_PART",
        },
      },
      isError: true,
      isFetching: false,
      refetch: mocks.refetchInventory,
    });

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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No enum constant com.factory1.inventory.model.InventoryItemType.SPARE_PART"
    );
    expect(screen.getByRole("button", { name: "Add Component" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry inventory" }));
    expect(mocks.refetchInventory).toHaveBeenCalledOnce();
  });

  it("preserves the Product BOM contract and explains the canonical draft lifecycle after saving", async () => {
    const onOpenChange = vi.fn();

    render(
      <BomDialog
        open
        onOpenChange={onOpenChange}
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

    await screen.findByRole("option", { name: "RM-001 - Steel Sheet" });
    fireEvent.click(screen.getByRole("button", { name: "Save BOM" }));

    await waitFor(() =>
      expect(mocks.saveBom).toHaveBeenCalledWith({
        productId: "product-1",
        body: {
          name: "Default BOM",
          active: true,
          components: [
            {
              inventoryItemId: inventoryId,
              quantityRequired: 2,
              unit: "KG",
            },
          ],
        },
      })
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "BOM saved as a draft. Publish it in Production > BOM Definition before using it for new production orders."
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
