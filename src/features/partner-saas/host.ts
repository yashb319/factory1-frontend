/** Only a single incoming Host authority is accepted; never Forwarded or a URL. */
export function canonicalHost(authority: string | null): string | null {
  if (!authority || authority.length > 253 || /[^a-zA-Z0-9.:-]/.test(authority)) return null;
  if (authority.includes(",") || authority.includes("..")) return null;
  const match = /^([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)(?::([0-9]{1,5}))?$/.exec(authority);
  if (!match) return null;
  const hostname = match[1].toLowerCase();
  if (hostname.split(".").some((label) => label.length > 63 || label.startsWith("-") || label.endsWith("-"))) return null;
  if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 65535)) return null;
  return hostname + (match[2] ? `:${Number(match[2])}` : "");
}

export function directHost(authority: string | null, configured: string) {
  const host = canonicalHost(authority);
  return Boolean(host && configured.split(",").some((entry) => canonicalHost(entry.trim()) === host));
}
