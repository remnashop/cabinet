import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { readStorage, writeStorage } from "@shared/lib/safe-storage";

import en from "./locales/en.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LANGUAGES = ["en", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
// each in its own language, so a reader of the other one still finds theirs
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = { ru: "Русский", en: "English" };

const STORAGE_KEY = "cabinet_language";

export function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function detectInitialLanguage(): SupportedLanguage {
  const stored = readStorage(STORAGE_KEY);
  if (isSupportedLanguage(stored)) return stored;
  const browserLanguage = navigator.language.slice(0, 2);
  return isSupportedLanguage(browserLanguage) ? browserLanguage : "en";
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

i18n.on("languageChanged", (language) => {
  writeStorage(STORAGE_KEY, language);
  document.documentElement.lang = language;
});

export default i18n;
