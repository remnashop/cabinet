import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ru from "@/locales/ru/translation.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru } },
    fallbackLng: "ru",
    supportedLngs: ["ru"],
    interpolation: { escapeValue: false },
  });

export default i18n;
