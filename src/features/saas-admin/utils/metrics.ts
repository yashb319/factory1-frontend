export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);

  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "0s";

  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;

  return `${secs}s`;
}

export function formatThroughput(
  bytes: number | null | undefined,
  ms: number | null | undefined
): string {
  if (!bytes || !ms || ms <= 0) return "0 B/s";

  const bytesPerSecond = (bytes / ms) * 1000;
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const exponent = Math.min(
    Math.floor(Math.log(bytesPerSecond) / Math.log(1024)),
    units.length - 1
  );
  const value = bytesPerSecond / Math.pow(1024, exponent);

  return `${value.toFixed(2)} ${units[exponent]}`;
}
