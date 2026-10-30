import { useReducedMotion } from "motion/react";
import { Plus, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useDevicesQuery, type OwnSubscription } from "@entities/subscription/api";
import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import { RippleButton } from "@shared/ui/RippleButton";
import { NoticeBar, SubscriptionCard } from "@widgets/subscription-cards/SubscriptionCard";

import { CARD_ASPECT_SHORT } from "./card-aspect";

interface CardsSliderProps {
  subscriptions: OwnSubscription[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** the only subscription a user can have: nothing to swipe to, no "buy" slide, no dots */
  single?: boolean;
  canBuy: boolean;
  onBuy: () => void;
  /** where the selected card's alert leads: its renewal */
  renewTo?: string;
}

// below lg a slide is the page's full width, the dots say there are more (a gap as wide as the gutter keeps the next
// one out of view); desktop: three across, more scroll sideways
const SLIDE = "w-full shrink-0 snap-center lg:w-[calc((100%-1.5rem)/3)]";

// every card counts its own devices; the selected one shares the query with the devices list
export function SlideCard({
  sub,
  noticeApart,
  selected,
}: {
  sub: OwnSubscription;
  noticeApart?: boolean;
  selected?: boolean;
}) {
  const devices = useDevicesQuery(sub.id);
  return (
    <SubscriptionCard
      sub={sub}
      devicesUsed={devices.data?.total}
      noticeApart={noticeApart}
      selected={selected}
    />
  );
}

function scrollToSlide(track: HTMLElement, index: number, behavior: ScrollBehavior) {
  const slide = track.children[index] as HTMLElement | undefined;
  if (slide) track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2, behavior });
}

const SWIPE_HINT_KEY = "cabinet_swipe_hint";

/** Swipeable cards; the last slide buys a new subscription. */
export function CardsSlider({
  subscriptions,
  selectedId,
  onSelect,
  single = false,
  canBuy,
  onBuy,
  renewTo,
}: CardsSliderProps) {
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
  // a dot's target while the track glides there: the slides it passes on the way don't count
  const targetRef = useRef<number | null>(null);

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
        // desktop shows the cards side by side: a click picks one, not what scrolled into view
        if (matchMedia("(min-width: 64rem)").matches) return;
        const { subscriptions, onSelect } = latest.current;
        for (const entry of entries) {
          // the observer also fires for the slide dropping below the threshold, still intersecting
          if (entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (targetRef.current !== null && index !== targetRef.current) continue;
          targetRef.current = null;
          setVisible(index);
          if (index < subscriptions.length) onSelect(subscriptions[index].id);
        }
      },
      { root: track, threshold: 0.6 },
    );
    for (const slide of track.children) observer.observe(slide);
    // the glide stopped short (a swipe took over, or the end came first): what's in view counts again
    const release = () => (targetRef.current = null);
    track.addEventListener("scrollend", release);
    track.addEventListener("pointerdown", release);
    return () => {
      observer.disconnect();
      track.removeEventListener("scrollend", release);
      track.removeEventListener("pointerdown", release);
    };
  }, [ids]);

  // the first visit on a phone with two cards or more: the slides peek left and back once, to show the next one is a
  // swipe away (with one card it would only show the buy slide)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || latest.current.subscriptions.length < 2 || reduced || readStorage(SWIPE_HINT_KEY) || matchMedia("(min-width: 64rem)").matches) return;
    const timer = setTimeout(() => {
      writeStorage(SWIPE_HINT_KEY, "1");
      for (const slide of track.children)
        slide.animate(
          [
            { transform: "translateX(0)", easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
            { transform: "translateX(-45%)", offset: 0.3 },
            { transform: "translateX(-45%)", offset: 0.45, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
            { transform: "translateX(0)" },
          ],
          { duration: 1800 },
        );
    }, 700);
    // a touch before the hint means the swipe is already known
    const skip = () => {
      clearTimeout(timer);
      writeStorage(SWIPE_HINT_KEY, "1");
    };
    track.addEventListener("pointerdown", skip, { once: true });
    return () => {
      clearTimeout(timer);
      track.removeEventListener("pointerdown", skip);
    };
  }, [reduced, ids]);

  const selected = subscriptions.find((sub) => sub.id === selectedId);

  return (
    <div>
      <div className="relative mb-3 lg:mb-0">
        <div
          ref={trackRef}
          className="relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] lg:-mx-3 lg:-mt-3 lg:mb-1 lg:gap-3 lg:p-3 [&::-webkit-scrollbar]:hidden"
        >
          {/* the slides stretch to the tallest card, the cards and the buy slide fill them; strips stand apart (NoticeBar) */}
          {subscriptions.map((sub, index) => (
            <div key={sub.id} data-index={index} className={SLIDE}>
              <RippleButton
                type="button"
                aria-pressed={sub.id === selectedId}
                onClick={() => {
                  onSelect(sub.id);
                  setVisible(index);
                  if (trackRef.current) scrollToSlide(trackRef.current, index, reduced ? "auto" : "smooth");
                }}
                // alone, the card takes the "buy" slide's height itself
                className={`relative block ${single ? CARD_ASPECT_SHORT : "h-full"} w-full rounded-home text-left transition-opacity ${
                  sub.id === selectedId ? "" : "opacity-55 hover:opacity-90"
                }`}
              >
                <SlideCard sub={sub} noticeApart selected={sub.id === selectedId} />
              </RippleButton>
            </div>
          ))}
          {!single && (
            <div data-index={subscriptions.length} className={SLIDE}>
              <RippleButton
                type="button"
                disabled={!canBuy}
                onClick={onBuy}
                className={`relative flex ${CARD_ASPECT_SHORT} h-full w-full flex-col items-center justify-center gap-1.5 rounded-home border-[1.5px] border-dashed border-white/20 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {canBuy ? <Plus className="size-8 stroke-[1.5] text-primary" /> : <TriangleAlert className="size-6 stroke-[1.5]" />}
                {canBuy ? t("home.buy") : t("home.limitReached")}
              </RippleButton>
            </div>
          )}
        </div>

        {/* 24px tap targets around 6px dots, centred on the header's line (the track's 2px, the border, the 16px padding,
            half of the 20px line); the row lets taps through to the card between them */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-[17px] flex justify-center lg:hidden ${single ? "hidden" : ""}`}
        >
          {[...subscriptions, null].map((sub, index) => (
            <button
              key={sub?.id ?? "buy"}
              type="button"
              aria-label={
                sub ? t("home.slideOf", { index: index + 1, total: subscriptions.length }) : t("home.buy")
              }
              aria-current={index === visible}
              onClick={() => {
                // desktop doesn't scroll, so the dot picks its card itself
                if (sub) onSelect(sub.id);
                setVisible(index);
                targetRef.current = index;
                if (trackRef.current) scrollToSlide(trackRef.current, index, reduced ? "auto" : "smooth");
              }}
              className="pointer-events-auto flex h-6 min-w-6 items-center justify-center px-[3px]"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${index === visible ? "w-[18px] bg-primary" : "w-1.5 bg-foreground/20"}`}
              />
            </button>
          ))}
        </div>
      </div>

      {selected && <NoticeBar sub={selected} to={renewTo} />}
    </div>
  );
}
