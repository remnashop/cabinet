import { TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { SuccessCheck } from "@shared/ui/SuccessCheck";

import "./check-variants.css";

// Dev-only (VITE_MOCKS=1): the result screen with each candidate mark (success, error, warning), over whatever page is
// open. Not translated on purpose: it never ships.

const CHECK = "M20 6 9 17l-5-5";
const CROSS = "M18 6 6 18M6 6l12 12";
const BANG = "M12 4.5v10M12 19.5h.01";

// "!" is two short strokes: thicker, or it reads thinner than the check and the cross
const Mark = ({ d, size = 32, stroke = d === BANG ? 3 : 2.25 }: { d: string; size?: number; stroke?: number }) => (
  <svg className="cv-mark" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
    {/* pathLength 1: the dash animation draws it whatever the path's real length */}
    <path d={d} pathLength={1} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Variant = [name: string, art: () => ReactNode];

// the shapes every tone tries, its own mark inside
const soft = (d: string, motion = ""): Variant[1] => () => (
  <span className={`cv-disc ${motion}`}>
    <Mark d={d} />
  </span>
);
const glow = (d: string): Variant[1] => () => (
  <>
    <span className="cv-glow" />
    <span className="cv-wave" />
    <span className="cv-wave late" />
    <span className="cv-disc">
      <Mark d={d} />
    </span>
  </>
);
const solid = (d: string): Variant[1] => () => (
  <span className="cv-disc cv-solid">
    <Mark d={d} stroke={2.75} />
  </span>
);
const ring = (d: string): Variant[1] => () => (
  <>
    <svg className="cv-ring" viewBox="0 0 100 100" width={76} height={76} aria-hidden>
      <circle cx={50} cy={50} r={46} fill="var(--soft)" stroke="currentColor" strokeWidth={2.5} pathLength={1} />
    </svg>
    <span className="cv-after-ring relative">
      <Mark d={d} size={36} stroke={2.5} />
    </span>
  </>
);
const bare = (d: string): Variant[1] => () => (
  <span className="cv-bare">
    <Mark d={d} size={64} />
  </span>
);
const pulse = (d: string): Variant[1] => () => (
  <>
    <span className="cv-wave once" />
    <span className="cv-disc">
      <Mark d={d} />
    </span>
  </>
);

const SUCCESS: Variant[] = [
  ["В приложении (искры)", () => <SuccessCheck />],
  ["Мягкий круг", soft(CHECK)],
  ["Свечение и волны", glow(CHECK)],
  ["Залитый круг", solid(CHECK)],
  ["Обводка рисуется", ring(CHECK)],
  ["Без круга", bare(CHECK)],
  [
    "Ореол из колец",
    () => (
      <>
        <span className="cv-halo size-24 [animation-delay:0.1s]" />
        <span className="cv-halo size-20 [animation-delay:0.05s]" />
        <span className="cv-disc">
          <Mark d={CHECK} />
        </span>
      </>
    ),
  ],
  [
    "Градиент бренда",
    () => (
      <span className="cv-disc cv-brand">
        <Mark d={CHECK} stroke={2.75} />
      </span>
    ),
  ],
  [
    "Загрузка → галочка",
    () => (
      <>
        <span className="cv-arc" />
        <span className="cv-disc cv-late">
          <Mark d={CHECK} />
        </span>
      </>
    ),
  ],
];

const ERROR: Variant[] = [
  ["Мягкий круг", soft(CROSS)],
  ["Мягкий круг и тряска", soft(CROSS, "cv-shake")],
  ["Свечение и волны (как в оплате)", glow(CROSS)],
  ["Залитый круг", solid(CROSS)],
  ["Обводка рисуется", ring(CROSS)],
  ["Без круга", bare(CROSS)],
  ["Одна волна", pulse(CROSS)],
];

const WARNING: Variant[] = [
  ["Мягкий круг", soft(BANG)],
  ["Мягкий круг и покачивание", soft(BANG, "cv-wiggle")],
  [
    "Треугольник в круге",
    () => (
      <span className="cv-disc">
        <TriangleAlert className="size-7" strokeWidth={2} />
      </span>
    ),
  ],
  ["Залитый круг", solid(BANG)],
  ["Обводка рисуется", ring(BANG)],
  [
    "Без круга (треугольник)",
    () => (
      <span className="cv-bare-icon">
        <TriangleAlert className="size-14" strokeWidth={1.75} />
      </span>
    ),
  ],
  ["Одна волна", pulse(BANG)],
];

type Tone = "success" | "error" | "warning";

/** Each tone on its screen: the variants, the texts, the buttons (the first one solid when there are two). */
const TONES: Record<Tone, { label: string; variants: Variant[]; title: string; hint: string; buttons: string[] }> = {
  success: {
    label: "Успех",
    variants: SUCCESS,
    title: "Промокод активирован",
    hint: "Подписка продлена на 7 дней",
    buttons: ["Продолжить"],
  },
  error: {
    label: "Ошибка",
    variants: ERROR,
    title: "Платёж не прошёл",
    hint: "Попробуйте ещё раз или выберите другой способ оплаты",
    buttons: ["Попробовать снова", "Вернуться на главную страницу"],
  },
  warning: {
    label: "Предупреждение",
    variants: WARNING,
    title: "Нет подходящей подписки",
    hint: "Промокод можно применить только к активной подписке",
    buttons: ["Закрыть"],
  },
};

const pill = (on: boolean) =>
  on ? "border-primary/45 bg-primary/15 text-primary" : "border-white/[0.14] bg-white/[0.05] text-foreground";

/** A bar at the foot of the screen: the tone, then its numbers; each opens the result screen with its mark, replaying it. */
export function CheckVariants({ onDone }: { onDone: () => void }) {
  const [tone, setTone] = useState<Tone>("success");
  const [picked, setPicked] = useState<number | null>(0);
  // bumped on every pick: the same number again replays its animation
  const [run, setRun] = useState(0);
  const pick = (i: number) => {
    setPicked(i);
    setRun((r) => r + 1);
  };
  const { variants, title, hint, buttons } = TONES[tone];
  const close = () => setPicked(null);

  return (
    <>
      <BottomSheet bare open={picked !== null} onClose={close} title={title}>
        {picked !== null && (
          <div key={run} className="flex flex-col items-center gap-4 text-center">
            <div className={`cv-art cv-${tone}`}>{variants[picked][1]()}</div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xl font-bold tracking-tight text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {buttons.map((label, i) => (
            <Button key={label} variant={buttons.length > 1 && i === 0 ? "solid" : "outline"} size="lg" className="w-full" onClick={close}>
              {label}
            </Button>
          ))}
        </div>
      </BottomSheet>
      <div className="fixed inset-x-0 bottom-[calc(16px+var(--safe-bottom,0px))] z-50 flex justify-center px-4">
        <div className="flex max-w-full flex-col gap-2 rounded-2xl border border-white/[0.14] bg-popover/90 p-2.5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 px-1 text-xs">
            <span className="truncate text-muted-foreground">
              {picked !== null ? `${picked + 1}. ${variants[picked][0]}` : "Выберите вариант"}
            </span>
            <button type="button" onClick={onDone} className="shrink-0 font-semibold text-foreground">
              Готово
            </button>
          </div>
          <div className="flex gap-1.5">
            {(Object.keys(TONES) as Tone[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTone(key);
                  pick(0);
                }}
                className={`h-8 flex-1 rounded-full border px-3 text-sm font-semibold ${pill(tone === key)}`}
              >
                {TONES[key].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {variants.map(([name], i) => (
              <button
                key={name}
                type="button"
                aria-label={name}
                onClick={() => pick(i)}
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${pill(picked === i)}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
