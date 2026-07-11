import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const STORAGE_PREFIX = "factory1_export_file:";

export type LocalExportFile = {
  id: string;
  fileName: string;
  mimeType: string;
  content: string;
  createdAt: string;
};

export function saveLocalExportFile({
  fileName,
  content,
  mimeType = "text/csv;charset=utf-8;",
}: {
  fileName: string;
  content: string;
  mimeType?: string;
}) {
  const id = crypto.randomUUID();
  const file: LocalExportFile = {
    id,
    fileName,
    mimeType,
    content,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(file));

  return {
    id,
    url: `factory1-local-export://${id}`,
  };
}

export function getLocalExportFile(url: string) {
  const id = url.replace("factory1-local-export://", "");
  const raw = localStorage.getItem(STORAGE_PREFIX + id);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalExportFile;
  } catch {
    localStorage.removeItem(STORAGE_PREFIX + id);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mimeMatch = head.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const isBase64 = head.includes(";base64");
  const binary = isBase64 ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// On native (iOS/Android) the WebView cannot trigger a browser download, so we
// persist the file to the device and surface it via the OS share sheet (or the
// in-app browser as a fallback). On web we keep the classic blob + anchor flow.
async function saveFileNative(fileName: string, blob: Blob): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Documents,
    });

    if (Capacitor.isPluginAvailable("Share")) {
      try {
        await Share.share({ title: fileName, files: [uri] });
      } catch {
        // user dismissed the share sheet — the file is already saved
      }
    } else {
      await Browser.open({ url: uri });
    }

    return true;
  } catch (err) {
    console.error("[localExportFiles] native save failed:", err);
    return false;
  }
}

function saveFileWeb(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function saveFile({
  fileName,
  content,
  mimeType = "text/csv;charset=utf-8;",
}: {
  fileName: string;
  content: string | Blob;
  mimeType?: string;
}) {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mimeType })
      : content;

  const handled = await saveFileNative(fileName, blob);
  if (!handled) {
    saveFileWeb(blob, fileName);
  }
}

export async function downloadCsv({
  fileName,
  content,
  mimeType = "text/csv;charset=utf-8;",
}: {
  fileName: string;
  content: string;
  mimeType?: string;
}) {
  return saveFile({ fileName, content, mimeType });
}

// Remote / server-generated URLs (and local-export URLs handled by callers)
// must open in the system browser on native instead of window.open.
export async function openExternalUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch (err) {
      console.error("[localExportFiles] browser open failed:", err);
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

// Printable HTML documents can't open a WebView print window on native, so we
// render them in the system browser (where the user can print / save to PDF).
export async function printHtml(html: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = btoa(unescape(encodeURIComponent(html)));
      await Browser.open({ url: `data:text/html;base64,${base64}` });
      return true;
    } catch (err) {
      console.error("[localExportFiles] native print failed:", err);
      return false;
    }
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
