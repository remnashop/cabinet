import { Bug, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  loadScenario,
  saveScenario,
  type MockFailure,
  type MockPaymentOutcome,
  type MockStatus,
  type Scenario,
} from "./scenario";

// Dev-only (VITE_MOCKS=1): the mock backend's knobs, to look at the layout in every state. Not translated on
// purpose: it never ships.

type Key = keyof Scenario;
type Option = [label: string, value: Scenario[Key]];

const nums = (...values: number[]): Option[] => values.map((v) => [String(v), v]);
const unlimited = (...values: number[]): Option[] => values.map((v) => [v === 0 ? "∞" : String(v), v]);
const yesNo: Option[] = [
  ["да", true],
  ["нет", false],
];

const FIELDS: [Key, string, Option[]][] = [
  ["subscriptions", "Подписок", nums(0, 1, 2, 3)],
  ["maxActive", "Лимит подписок", [...nums(1, 2, 3), ["∞", null]]],
  ["status", "Статус первой", (["ACTIVE", "LIMITED", "EXPIRED", "DISABLED"] as MockStatus[]).map((s) => [s, s])],
  ["daysLeft", "Дней осталось", nums(0, 2, 27, 120)],
  ["trial", "Первая — пробная", yesNo],
  ["trialAvailable", "Пробный доступен", yesNo],
  ["trialPaid", "Пробный платный", yesNo],
  ["deviceLimit", "Лимит устройств", unlimited(0, 1, 2, 3, 5)],
  ["devices", "Устройств", nums(0, 1, 2, 3, 5)],
  ["trafficLimit", "Трафик, ГБ", unlimited(0, 5, 50, 100)],
  ["trafficUsed", "Израсходовано у первой, ГБ", nums(0, 4.6, 12.4, 48, 100)],
  ["deviceReset", "Удаление устройств", yesNo],
  ["points", "Баллы", nums(0, 120, 2400)],
  ["bonusDays", "Бонусные дни", nums(0, 3, 30)],
  ["discount", "Скидка, %", nums(0, 10, 25)],
  ["referral", "Рефералка", yesNo],
  ["referralEmpty", "Рефералка пустая", yesNo],
  ["connectGuide", "Инструкция подключения", yesNo],
  ["alertDemo", "Демо свечения карточек", yesNo],
  ["paymentOutcome", "Исход оплаты", (["PAID", "CANCELED", "FAILED", "PENDING"] as MockPaymentOutcome[]).map((s) => [s, s])],
  ["failRequests", "Ломать запросы", (["none", "server", "network"] as MockFailure[]).map((s) => [s, s])],
  ["legalPending", "Принять документы заново", yesNo],
  ["miniAppOnly", "Только Mini App", yesNo],
];

/** The header's slot for the button (HeaderActions), while the page has a header: login and payment pages don't. */
function useHeaderSlot() {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    const find = () => setSlot(document.getElementById("mock-debug-slot"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return slot;
}

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(loadScenario);
  const slot = useHeaderSlot();

  const headerButton =
    slot &&
    createPortal(
      <button
        type="button"
        aria-label="Моки"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border transition-colors hover:bg-white/[0.06] hover:text-foreground ${
          open ? "bg-white/[0.08] text-foreground" : "bg-white/[0.05] text-muted-foreground"
        }`}
      >
        <Bug className="size-[17px]" />
      </button>,
      slot,
    );
  return (
    <>
      {headerButton}
      <div
        className={`fixed z-[100] ${
          slot ? "top-[calc(var(--safe-top)+64px)] right-4" : "bottom-[calc(max(var(--safe-bottom),16px)+80px)] left-4 lg:bottom-4"
        }`}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`flex max-h-[80vh] w-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/[0.14] bg-popover/90 p-4 shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6)] backdrop-blur-2xl ${
                slot ? "origin-top-right" : "origin-bottom-left"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide">Моки</span>
                <button type="button" aria-label="Закрыть" onClick={() => setOpen(false)} className="text-muted-foreground">
                  <X className="size-4" />
                </button>
              </div>
              {FIELDS.map(([key, label, options]) => (
                <label key={key} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="text-muted-foreground">{label}</span>
                  <select
                    value={options.findIndex(([, v]) => v === draft[key])}
                    onChange={(event) => setDraft({ ...draft, [key]: options[Number(event.target.value)][1] })}
                    className="rounded-full border border-border bg-surface px-2 py-1 text-[12.5px] text-foreground"
                  >
                    {options.map(([optionLabel], i) => (
                      <option key={optionLabel} value={i}>
                        {optionLabel}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveScenario(null)}
                  className="h-8 flex-1 rounded-full border border-border text-[12.5px] font-semibold"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={() => saveScenario(draft)}
                  className="h-8 flex-1 rounded-full bg-primary text-[12.5px] font-semibold text-primary-foreground"
                >
                  Применить
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!open && !slot && (
          <button
            type="button"
            aria-label="Моки"
            onClick={() => setOpen(true)}
            className="flex size-10 items-center justify-center rounded-full border border-white/[0.14] bg-popover/80 text-muted-foreground backdrop-blur-2xl hover:text-foreground"
          >
            <Bug className="size-[18px]" />
          </button>
        )}
      </div>
    </>
  );
}
