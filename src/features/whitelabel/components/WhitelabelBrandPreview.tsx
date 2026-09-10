import {
  WHITELABEL_DEFAULT_BRANDING,
  getSharedAppDomain,
  getWhitelabelDomainOption,
} from "../config/whitelabelUiConfig";
import type { WhitelabelDomainType } from "../types/whitelabel.types";
import { isValidHexColor, isValidUrl } from "../utils/validation";

type WhitelabelBrandPreviewProps = {
  displayName: string;
  logoUrl: string;
  primaryColorHex: string;
  accentColorHex: string;
  domainType: WhitelabelDomainType;
  domainValue: string;
};

export function WhitelabelBrandPreview({
  displayName,
  logoUrl,
  primaryColorHex,
  accentColorHex,
  domainType,
  domainValue,
}: WhitelabelBrandPreviewProps) {
  const primary = isValidHexColor(primaryColorHex)
    ? primaryColorHex || WHITELABEL_DEFAULT_BRANDING.primaryColorHex
    : WHITELABEL_DEFAULT_BRANDING.primaryColorHex;
  const accent = isValidHexColor(accentColorHex)
    ? accentColorHex || WHITELABEL_DEFAULT_BRANDING.accentColorHex
    : WHITELABEL_DEFAULT_BRANDING.accentColorHex;
  const domainOption = getWhitelabelDomainOption(domainType);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--factory1-border)]">
      <div
        className="flex items-center gap-3 px-3 py-2 text-white"
        style={{ backgroundColor: primary }}
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white/15 text-sm font-semibold">
          {logoUrl && isValidUrl(logoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs opacity-80">
            {domainType === "SHARED" ? getSharedAppDomain() : domainValue}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-white px-3 py-2 text-xs text-[var(--factory1-text-muted)]">
        <span>{domainOption.label}</span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          Accent
        </span>
      </div>
    </div>
  );
}
