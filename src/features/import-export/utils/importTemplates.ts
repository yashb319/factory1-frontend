import { toCsv } from "./csv";

export type TemplateResult = {
  fileName: string;
  content: string;
};

export function templateBaseName(module: string): string {
  switch (module) {
    case "CUSTOMER":
      return "customer";
    case "SUPPLIER":
      return "supplier";
    case "INVENTORY":
      return "inventory";
    case "EMPLOYEE":
      return "employee";
    case "PRODUCT":
      return "product";
    default:
      return "import";
  }
}

// Canonical import templates per module. Used both by the bulk-import dialogs'
// "Download Template" action and by the Import/Export History "Regenerate"
// flow, so the template for an import is always re-downloadable from metadata.
export function getImportTemplateCsv(module: string): TemplateResult | null {
  switch (module) {
    case "CUSTOMER":
      return {
        fileName: "customer-import-template.csv",
        content: toCsv([
          [
            "customerCode",
            "name",
            "phone",
            "email",
            "gstNumber",
            "addressLine1",
            "addressLine2",
            "city",
            "state",
            "contactPerson",
            "creditTerms",
            "status",
            "notes",
          ],
          [
            "CUST-001",
            "ABC Traders",
            "9876543210",
            "abc@example.com",
            "29ABCDE1234F1Z5",
            "MG Road Bangalore",
            "Warehouse Area Bangalore",
            "Bangalore",
            "Karnataka",
            "Amit",
            "15 days credit",
            "ACTIVE",
            "Regular buyer",
          ],
        ]),
      };

    case "SUPPLIER":
      return {
        fileName: "supplier-import-template.csv",
        content: toCsv([
          [
            "supplierCode",
            "name",
            "phone",
            "email",
            "gstNumber",
            "address",
            "city",
            "state",
            "contactPerson",
            "creditTerms",
            "status",
            "notes",
          ],
          [
            "SUP-001",
            "ABC Textiles",
            "9876543210",
            "abc@example.com",
            "29ABCDE1234F1Z5",
            "Industrial Area",
            "Bangalore",
            "Karnataka",
            "Rajesh",
            "30 days credit",
            "ACTIVE",
            "Fabric supplier",
          ],
        ]),
      };

    case "INVENTORY":
      return {
        fileName: "inventory-import-template.csv",
        content: toCsv([
          [
            "itemCode",
            "name",
            "category",
            "type",
            "unit",
            "openingStock",
            "minStock",
            "maxStock",
            "reorderLevel",
            "price",
            "hsnCode",
            "supplierName",
            "description",
          ],
          [
            "FAB-001",
            "Blue Fabric",
            "Fabric",
            "RAW_MATERIAL",
            "meter",
            "500",
            "100",
            "85",
            "",
            "5208",
            "5",
            "ABC Textiles",
            "Used for bags",
          ],
        ]),
      };

    case "EMPLOYEE":
      return {
        fileName: "employee-import-template.csv",
        content: toCsv([
          [
            "employeeCode",
            "name",
            "phone",
            "email",
            "employeeType",
            "designation",
            "department",
            "salaryRate",
            "salaryType",
            "joiningDate",
            "status",
          ],
          [
            "EMP-001",
            "Ravi Kumar",
            "9876543210",
            "ravi@example.com",
            "BLUE_COLLAR",
            "Tailor",
            "Production",
            "450",
            "DAILY",
            "2024-04-01",
            "ACTIVE",
          ],
        ]),
      };

    default:
      return null;
  }
}
