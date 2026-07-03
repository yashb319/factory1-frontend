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

export function downloadCsv({
  fileName,
  content,
  mimeType = "text/csv;charset=utf-8;",
}: {
  fileName: string;
  content: string;
  mimeType?: string;
}) {
  const blob = new Blob([content], {
    type: mimeType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
