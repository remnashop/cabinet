import { useState } from "react";

/**
 * A one-time code as a row of cells. One real input lies over them, see-through: paste, the keyboard's
 * one-time-code suggestion and backspace keep working as in any field; the cells only draw its digits.
 */
export function CodeInput({
  value,
  length,
  onChange,
  invalid,
}: {
  value: string;
  length: number;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  // the cell the next digit lands in; none once the code is whole
  const active = focused && value.length < length ? value.length : -1;
  return (
    <div className="relative">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={`flex h-13 items-center justify-center rounded-xl glass-well ring-inset text-xl font-semibold tabular-nums transition-shadow ${
              invalid ? "ring-1 ring-error" : i === active ? "ring-1 ring-primary" : ""
            }`}
          >
            {value[i] ?? (i === active && <span className="h-5 w-px animate-pulse bg-primary" />)}
          </span>
        ))}
      </div>
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 size-full cursor-default bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
