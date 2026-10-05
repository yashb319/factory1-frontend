import { describe, expect, it } from "vitest";
import { PRODUCT_BOM_CACHE_TAGS } from "../api/productsApi";

describe("Product BOM cache alignment", () => {
  it("refreshes both product and canonical production BOM surfaces after a Product BOM save", () => {
    expect(PRODUCT_BOM_CACHE_TAGS).toEqual(["Products", "Production"]);
  });
});
