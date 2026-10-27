import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

// First number in an already-formatted value ("1 234 ₽", "12,5%", "$1,234.56"):
// 1–2 digits after the last . or , are a fraction, anything else is grouping.
const NUMBER_RUN = /\d(?:[\d\s.,]*\d)?/;

interface ParsedNumber {
  prefix: string;
  suffix: string;
  value: number;
  fraction: number;
  decimalSep: string;
  groupSep: string;
}

function parseNumber(text: string): ParsedNumber | null {
  const match = NUMBER_RUN.exec(text);
  if (!match) return null;
  const run = match[0];
  const decimal = /[.,](\d{1,2})$/.exec(run);
  const fraction = decimal ? decimal[1].length : 0;
  const intPart = decimal ? run.slice(0, -(fraction + 1)) : run;
  return {
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + run.length),
    value: Number(intPart.replace(/\D/g, "") + (decimal ? `.${decimal[1]}` : "")),
    fraction,
    decimalSep: decimal ? run[run.length - fraction - 1] : "",
    groupSep: /\D/.exec(intPart)?.[0] ?? "",
  };
}

function formatParsed(parsed: ParsedNumber, value: number): string {
  const [int, frac] = value.toFixed(parsed.fraction).split(".");
  const grouped = parsed.groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, parsed.groupSep) : int;
  return `${parsed.prefix}${grouped}${frac ? parsed.decimalSep + frac : ""}${parsed.suffix}`;
}

// Counts up to the value on load and from the old value on change, keeping the caller's formatting.
export function CountUp({ text }: { text: string }) {
  const parsed = parseNumber(text);
  const target = parsed?.value;
  const fromRef = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (target === undefined) return;
    const controls = animate(fromRef.current, target, {
      duration: 0.8,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => {
        fromRef.current = latest;
        setShown(latest);
      },
    });
    return () => controls.stop();
  }, [target]);

  return <>{parsed ? formatParsed(parsed, shown) : text}</>;
}
