import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "../components/ProductsPage";

let enabledFeatures = ["product_costing"];

vi.mock("@/lib/hook", () => ({
  useAppSelector: vi.fn(() => ({
    id: "finance-1",
    name: "Finance User",
    email: "finance@example.com",
    role: "FINANCE",
    status: "ACTIVE",
    organizationId: "org-1",
    organizationStatus: "ACTIVE",
  })),
}));

vi.mock("@/features/organization-features/api/organizationFeaturesApi", () => ({
  useGetOrganizationFeaturesQuery: vi.fn(() => ({
    data: { data: { enabledFeatures } },
  })),
}));

vi.mock("@/features/inventory/api/inventoryApi", () => ({
  useGetInventoryItemsQuery: vi.fn(() => ({
    data: { content: [], page: 0, size: 300, totalElements: 0, totalPages: 0 },
  })),
}));

vi.mock("@/features/import-export/hooks/useLogDataJob", () => ({
  useLogDataJob: vi.fn(() => vi.fn()),
}));

vi.mock("../api/productsApi", () => ({
  useGetProductsQuery: vi.fn(() => ({
    data: {
      content: [
        {
          id: "product-1",
          productCode: "FG-001",
          name: "Cabinet",
          finishedGoodInventoryItemId: "inventory-1",
          active: true,
          hasBom: true,
        },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useDeleteProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetNextProductCodeQuery: vi.fn(() => ({})),
  useCreateProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetBomQuery: vi.fn(() => ({})),
  useSaveBomMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRecordProductionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

const mutationState = {
  data: undefined,
  isLoading: false,
  isError: false,
  reset: vi.fn(),
};

vi.mock("../api/costingApi", () => ({
  useGetCostingPoliciesQuery: vi.fn(() => ({
    data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useSaveCostingPolicyMutation: vi.fn(() => [
    vi.fn(),
    { isLoading: false, isError: false },
  ]),
  usePublishCostingPolicyMutation: vi.fn(() => [
    vi.fn(),
    { isLoading: false, isError: false },
  ]),
  useCreateCostingPolicyVersionMutation: vi.fn(() => [
    vi.fn(),
    { isLoading: false, isError: false },
  ]),
  useLazyPreviewProductCostingQuery: vi.fn(() => [vi.fn(), mutationState]),
  useFreezeProductCostingMutation: vi.fn(() => [vi.fn(), mutationState]),
}));

describe("Products costing access", () => {
  beforeEach(() => {
    enabledFeatures = ["product_costing"];
    vi.clearAllMocks();
  });

  it("lets finance users access costing without exposing product operations", async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);

    expect(
      screen.getByRole("button", { name: "Costing policy" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Product" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record Production" })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Product actions for Cabinet" })
    );
    expect(
      await screen.findByRole("menuitem", { name: "View costing" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Configure BOM" })
    ).not.toBeInTheDocument();
  });

  it("hides the costing surface when the entitlement is absent", () => {
    enabledFeatures = ["inventory"];
    render(<ProductsPage />);

    expect(
      screen.queryByRole("button", { name: "Costing policy" })
    ).not.toBeInTheDocument();
  });
});
