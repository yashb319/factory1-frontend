import {
  printHtml,
  saveFile,
} from "@/features/import-export/utils/localExportFiles";

// Print, download and share helpers shared by the Tally billing and accounting
// detail screens. `html` is a full printable document produced by the relevant
// print utility (invoicePrint / voucherPrint).

export async function printDocument(html: string): Promise<boolean> {
  return printHtml(html);
}

export async function downloadDocument(fileName: string, html: string) {
  await saveFile({ fileName, content: html, mimeType: "text/html" });
}

// Returns true if a share was attempted/handled. Falls back to false when the
// Web Share API (with files) is unavailable so callers can show a message.
export async function shareDocument(
  title: string,
  html: string,
  fallbackText = "",
): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  try {
    const file = new File([html], `${title}.html`, { type: "text/html" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text: fallbackText });
      return true;
    }
  } catch {
    // user cancelled or share failed — fall through to false
  }

  return false;
}
