import en from "../translations/en.json";
import hi from "../translations/hi.json";
import mr from "../translations/mr.json";

const translations = { en, hi, mr };

export function useTranslation(language) {
  const available = Object.keys(translations);
  const lang = language || available[0];
  const t = translations[lang] || translations[available[0]];

  return function translate(key, fallback) {
    return t[key] || fallback || key;
  };
}
