import html2canvas from "html2canvas";
import JSZip from "jszip";

import {
  PayrollItemResponse,
  PayrollRunDetailsResponse,
} from "../types/payroll.types";
import { buildPayslipHtml } from "./payrollPayslipHtml.utils";

export async function createPayslipJpg(
  payroll: PayrollRunDetailsResponse,
  item: PayrollItemResponse
) {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.left = "-99999px";
  iframe.style.top = "0";
  iframe.style.width = "900px";
  iframe.style.height = "1200px";
  iframe.style.backgroundColor = "#ffffff";

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;

  if (!doc) {
    document.body.removeChild(iframe);
    return null;
  }

  doc.open();
  doc.write(buildPayslipHtml(payroll, item));
  doc.close();

  await new Promise((resolve) => setTimeout(resolve, 300));

  const target = doc.getElementById("payslip-root");

  if (!target) {
    document.body.removeChild(iframe);
    return null;
  }

  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,
  });

  const dataUrl = canvas.toDataURL("image/jpeg", 1);

  document.body.removeChild(iframe);

  return dataUrl;
}

export async function downloadPayslipJpg(
  payroll: PayrollRunDetailsResponse,
  item: PayrollItemResponse
) {
  const image = await createPayslipJpg(payroll, item);
  if (!image) return;

  const link = document.createElement("a");
  link.href = image;
  link.download = getPayslipFileName(payroll, item);
  link.click();
}

export async function printPayslip(
  payroll: PayrollRunDetailsResponse,
  item: PayrollItemResponse
) {
  const image = await createPayslipJpg(payroll, item);
  if (!image) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Payslip</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
          }

          img {
            width: 794px;
            max-width: 100%;
            height: auto;
          }

          @media print {
            body {
              padding: 0;
            }

            img {
              width: 100%;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <img src="${image}" />
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

export async function downloadAllPayslipsZip(
  payroll: PayrollRunDetailsResponse
) {
  const zip = new JSZip();

  for (const item of payroll.items ?? []) {
    const image = await createPayslipJpg(payroll, item);
    if (!image) continue;

    const base64 = image.split(",")[1];
    zip.file(getPayslipFileName(payroll, item), base64, {
      base64: true,
    });
  }

  const blob = await zip.generateAsync({
    type: "blob",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `payslips-${payroll.payrollMonth}-${payroll.payrollYear}.zip`;
  link.click();

  URL.revokeObjectURL(url);
}

function getPayslipFileName(
  payroll: PayrollRunDetailsResponse,
  item: PayrollItemResponse
) {
  return `payslip-${item.employeeName}-${payroll.payrollMonth}-${payroll.payrollYear}.jpg`;
}