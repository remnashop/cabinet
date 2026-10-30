import { useTranslation } from "react-i18next";

import { ButtonLink } from "@shared/ui/ButtonLink";
import { FullScreen } from "@widgets/full-screen/FullScreen";

// the zero's ring: a conic sweep cut down to a 12px band, its edges fading over a pixel
const BAND =
  "radial-gradient(farthest-side, transparent calc(100% - 13px), #000 calc(100% - 12px), #000 calc(100% - 1px), transparent)";

const DIGIT = "bg-linear-to-b from-foreground to-foreground/20 bg-clip-text text-transparent";

function NotFoundArt() {
  return (
    <div aria-hidden className="relative flex items-center justify-center py-4">
      <span className="absolute size-40 rounded-full bg-primary/20 blur-3xl motion-safe:animate-breathe" />
      <div className="relative flex items-center gap-3 text-[112px] leading-none font-bold tracking-tighter">
        <span className={DIGIT}>4</span>
        {/* a circle, not the digit's oval: the comet's band is cut round and only follows a round track */}
        <span className="relative size-20">
          <span className="absolute inset-0 rounded-full border-[12px] border-white/[0.07]" />
          <span
            className="absolute inset-0 rounded-full will-change-transform motion-safe:animate-spin"
            style={{
              animationDuration: "3.2s",
              background: "conic-gradient(from -140deg, transparent, var(--color-primary) 140deg, transparent 140deg)",
              mask: BAND,
              WebkitMask: BAND,
            }}
          />
        </span>
        <span className={DIGIT}>4</span>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <FullScreen>
      <NotFoundArt />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-bold">{t("pages.notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("pages.notFoundHint")}</p>
      </div>
      <ButtonLink to="/" replace variant="solid" className="mt-2 w-full">
        {t("pages.notFoundHome")}
      </ButtonLink>
    </FullScreen>
  );
}
