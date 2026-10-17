import { useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { OwnSubscription } from "@entities/subscription/api";
import { SubscriptionCard } from "@widgets/subscription-cards/SubscriptionCard";

interface CardsSliderProps {
  subscriptions: OwnSubscription[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  canBuy: boolean;
  onBuy: () => void;
  /** devices of the selected card, once loaded */
  devicesUsed?: number;
}

// a slide is ~85% of the track, so only one can be 60% visible at a time
const SLIDE = "w-[85%] max-w-[340px] shrink-0 snap-center";

function scrollToSlide(track: HTMLElement, index: number, behavior: ScrollBehavior) {
  const slide = track.children[index] as HTMLElement | undefined;
  if (slide) track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2, behavior });
}

/** Swipeable cards; the last slide buys a new subscription. */
export function CardsSlider({ subscriptions, selectedId, onSelect, canBuy, onBuy, devicesUsed }: CardsSliderProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  // includes the buy slide; selectedId never points at it
  const [visible, setVisible] = useState(() =>
    Math.max(
      0,
      subscriptions.findIndex((s) => s.id === selectedId),
    ),
  );
  const ids = subscriptions.map((s) => s.id).join(",");

  // the observer and the list-change scroll read the latest props without re-subscribing
  const latest = useRef({ subscriptions, selectedId, onSelect });
  useEffect(() => {
    latest.current = { subscriptions, selectedId, onSelect };
  });

  // the list changed (bought, deleted): keep the selected card in view.
  // Declared before the observer so it scrolls before the observer reports what's visible.
  useEffect(() => {
    const { subscriptions, selectedId } = latest.current;
    const index = subscriptions.findIndex((s) => s.id === selectedId);
    if (trackRef.current && index >= 0) scrollToSlide(trackRef.current, index, "auto");
  }, [ids]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { subscriptions, onSelect } = latest.current;
        for (const entry of entries) {
          // the observer also fires for the slide dropping below the threshold, still intersecting
          if (entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setVisible(index);
          if (index < subscriptions.length) onSelect(subscriptions[index].id);
        }
      },
      { root: track, threshold: 0.6 },
    );
    for (const slide of track.children) observer.observe(slide);
    return () => observer.disconnect();
  }, [ids]);

  return (
    <div>
      <div
        ref={trackRef}
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {subscriptions.map((sub, index) => (
          <div key={sub.id} data-index={index} className={SLIDE}>
            <SubscriptionCard sub={sub} index={index} devicesUsed={sub.id === selectedId ? devicesUsed : undefined} />
          </div>
        ))}
        <div data-index={subscriptions.length} className={SLIDE}>
          <button
            type="button"
            disabled={!canBuy}
            onClick={onBuy}
            className="flex aspect-[1.586] w-full flex-col items-center justify-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-white/20 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className={`size-8 stroke-[1.5] ${canBuy ? "text-primary" : ""}`} />
            {canBuy ? t("home.buy") : t("home.limitReached")}
          </button>
        </div>
      </div>

      {/* 24px tap targets around 6px dots; the negative margin keeps the visual spacing */}
      <div className="mt-2 mb-3 flex justify-center">
        {[...subscriptions, null].map((sub, index) => (
          <button
            key={sub?.id ?? "buy"}
            type="button"
            aria-label={
              sub ? t("home.slideOf", { index: index + 1, total: subscriptions.length }) : t("home.buy")
            }
            aria-current={index === visible}
            onClick={() => trackRef.current && scrollToSlide(trackRef.current, index, reduced ? "auto" : "smooth")}
            className="-my-[9px] flex h-6 min-w-6 items-center justify-center px-[3px]"
          >
            <span
              className={`block h-1.5 rounded-full transition-all ${index === visible ? "w-[18px] bg-primary" : "w-1.5 bg-foreground/20"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
