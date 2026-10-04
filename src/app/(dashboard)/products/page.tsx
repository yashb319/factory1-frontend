import { Suspense } from "react";
import { ProductsPage } from "@/features/products/components/ProductsPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Loading products...
        </p>
      }
    >
      <ProductsPage />
    </Suspense>
  );
}