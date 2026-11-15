import { DEFAULT_ACCENT_COLOR, hexToHueDegrees, hexToRgbNormalized, hueRotateHex, rgbToHex } from "@shared/lib/color";

/** The background's colors as stored: base null follows the accent; a null tone is derived from the base. */
export interface ShaderColors {
  base: string | null;
  tones: (string | null)[] | null;
}

// With DEFAULT_ACCENT_COLOR these four stops reproduce the background the app has always had.
export const DEFAULT_SHADER_BASE = "#12101a";
export const SHADER_TONE_COUNT = 3;

// each tone from the base: hue shift, added saturation, fixed lightness, so any base keeps the background dark
const TONE_RULES: readonly { hueShift: number; saturationGain: number; lightness: number }[] = [
  { hueShift: -43.8, saturationGain: 0.032, lightness: 0.124 },
  { hueShift: -37.7, saturationGain: 0.174, lightness: 0.133 },
  { hueShift: -15, saturationGain: 0.162, lightness: 0.098 },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgbNormalized(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const sector = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [(sector * 60 + 360) % 360, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return lightness - saturation * Math.min(lightness, 1 - lightness) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgbToHex(channel(0) * 255, channel(8) * 255, channel(4) * 255);
}

function deriveTones(base: string): string[] {
  const [hue, saturation] = hexToHsl(base);
  return TONE_RULES.map((rule) =>
    hslToHex((hue + rule.hueShift + 360) % 360, clamp01(saturation + rule.saturationGain), rule.lightness),
  );
}

// the accent's hue delta from the default one
function accentHueRadians(accent: string | null): number {
  if (!accent) return 0;
  return ((hexToHueDegrees(accent) - hexToHueDegrees(DEFAULT_ACCENT_COLOR)) * Math.PI) / 180;
}

/** The four colors the shader mixes: base, then the three tones. */
export function resolveShaderStops(accent: string | null, colors: ShaderColors): string[] {
  const hue = accentHueRadians(accent);
  const base = colors.base ?? hueRotateHex(DEFAULT_SHADER_BASE, hue);
  const derived = colors.base
    ? deriveTones(colors.base)
    : deriveTones(DEFAULT_SHADER_BASE).map((tone) => hueRotateHex(tone, hue));
  return [base, ...derived.map((tone, i) => colors.tones?.[i] ?? tone)];
}
