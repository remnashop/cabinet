import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@shared/ui/Skeleton";

/** The SVG comes from the library and the value is our backend's subscription URL, so injecting it is safe. */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const { t } = useTranslation();
  // markup null = the library failed (e.g. the value is too long for a QR code)
  const [svg, setSvg] = useState<{ value: string; markup: string | null } | null>(null);

  useEffect(() => {
    let stale = false;
    QRCode.toString(value, { type: "svg", margin: 1 }).then(
      (markup) => !stale && setSvg({ value, markup }),
      () => !stale && setSvg({ value, markup: null }),
    );
    return () => {
      stale = true;
    };
  }, [value]);

  const style = { width: size, height: size };
  if (svg?.value !== value) return <div style={style}><Skeleton className="size-full rounded-xl" /></div>;
  if (svg.markup === null) {
    return (
      <div style={style} className="flex items-center justify-center rounded-xl bg-white/[0.04] p-4 text-center text-sm text-muted-foreground">
        {t("common.qrFailed")}
      </div>
    );
  }
  // the URL is a credential: keep it out of the accessible name (it's printed below for copying anyway)
  return (
    <div
      role="img"
      aria-label={t("common.qrCode")}
      className="rounded-xl bg-white p-2 [&>svg]:size-full"
      style={style}
      dangerouslySetInnerHTML={{ __html: svg.markup }}
    />
  );
}
