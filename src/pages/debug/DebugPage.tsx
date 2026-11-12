import { CalendarDays, CreditCard, Package, Percent } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@shared/ui/Badge";
import { Button, type ButtonVariant } from "@shared/ui/Button";
import type { ButtonSize } from "@shared/ui/button-class";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { KpiTile } from "@shared/ui/KpiTile";
import { DialogContext } from "@shared/ui/surface";
import { Input } from "@shared/ui/Input";
import { PageHeader } from "@widgets/page-header/PageHeader";

// Dev-only (import.meta.env.DEV): the shared primitives, live, to check them against the panel's /dashboard/debug.
// Not translated on purpose: it never ships. A new variant or a change to one goes here first.

const TONES: [BadgeTone, string][] = [
  ["success", "Оплачен"],
  ["warning", "Ожидает"],
  ["error", "Отменён"],
  ["neutral", "Покупка"],
  ["accent", "Пробный"],
];

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Card round>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </Card>
  );
}

// a dialog's 12px-plate look, as PaymentDetailsDialog's body
function DialogBody({ children }: { children: ReactNode }) {
  return (
    <DialogContext.Provider value={true}>
      <div className="flex max-w-sm flex-col gap-3 rounded-dialog glass-dialog p-3">{children}</div>
    </DialogContext.Provider>
  );
}

const VARIANTS: [ButtonVariant, string][] = [
  ["glass", "второстепенное действие, отмена"],
  ["glassAccent", "действие в футере окна или формы"],
  ["glassSolid", "главное действие экрана"],
  ["glassDanger", "разрушительное действие"],
  ["secondary", "кнопка рядом с полем"],
];

const SIZES: [ButtonSize, string][] = [
  ["sm", "Отмена"],
  ["md", "Продлить"],
  ["field", "Применить"],
  ["lg", "Оплатить"],
];

export function DebugPage() {
  return (
    <>
      <PageHeader title="Дебаг: компоненты" />

      <Section
        title="Кнопки"
        note="Варианты как в панели, 14px. Размеры: sm 32px (строка списка), md 36px, field 38px (рядом с полем), lg 64px (полноэкранный шаг, 16px semibold)."
      >
        {VARIANTS.map(([variant, use]) => (
          <div
            key={variant}
            className="grid gap-3 border-t border-white/[0.08] pt-3 first:border-0 first:pt-0 md:grid-cols-[220px_1fr] md:items-center"
          >
            <div>
              <span className="font-mono text-xs">{variant}</span>
              <div className="text-xs text-muted-foreground">{use}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SIZES.map(([size, label]) => (
                <Button key={size} variant={variant} size={size} className={size === "lg" ? "w-40" : ""}>
                  {label}
                </Button>
              ))}
              <Button variant={variant} disabled>
                Выключена
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Badge" note="Без рамки, заливка тона; 12px uppercase.">
        <div className="flex flex-wrap gap-2">
          {TONES.map(([tone, label]) => (
            <Badge key={tone} tone={tone}>
              {label}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="KpiTile и InfoRow"
        note="Тело окна «Платёж». Плитка: подпись до 2 строк, подсказка прижата к низу. Строка: 36px, подпись 12px, значение 14px semibold, иконка 15px."
      >
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Сумма к оплате со скидкой"
              value={"1 990 ₽"}
              valueSuffix={<s>{"2 490 ₽"}</s>}
              hint={<Badge tone="success">Оплачен</Badge>}
            />
            <KpiTile label="Срок" value="12 мес." hint={<Badge tone="neutral">Покупка</Badge>} />
          </div>
          <Card variant="list">
            <InfoRow icon={Package} label="План" value="Премиум" />
            <InfoRow icon={Percent} label="Скидка по промокоду" value={<span className="text-success">−20%</span>} />
            <InfoRow icon={CreditCard} label="Способ оплаты" value="Telegram Stars" />
            <InfoRow icon={CalendarDays} label="Дата" value="13.11.2026 14:32" />
          </Card>
        </DialogBody>
      </Section>

      <Section
        title="Поля"
        note="14px от края, выключенное 40%. Последнее — автозаполнение: кликни и выбери сохранённый адрес, поле должно остаться тёмным."
      >
        <div className="flex max-w-sm flex-col gap-2">
          <Input placeholder="Промокод" />
          <Input defaultValue="SUMMER-2026" />
          <Input disabled defaultValue="Недоступно" />
          <form onSubmit={(e) => e.preventDefault()}>
            <Input className="w-full" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
          </form>
        </div>
      </Section>

      <Section title="Скроллбар" note="8px, как в панели (Firefox рисует свой тонкий).">
        <div className="h-32 max-w-sm overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} className="py-1 text-muted-foreground">
              Строка {i + 1}
            </p>
          ))}
        </div>
      </Section>
    </>
  );
}
