import { createContext, useContext, useState } from "react";

// SESSION_KEY: set to lang code after user picks; cleared on page reload automatically (sessionStorage)
const SESSION_KEY = "smartHotelLangSelected";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  /**
   * On every browser refresh/new tab, sessionStorage is wiped,
   * so SESSION_KEY will be null → language=null → show language selector.
   * Once user picks a language, we store it in sessionStorage so navigating
   * between pages within the same session doesn't re-show the selector.
   */
  const [language, setLanguageState] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) || null;
  });

  const setLanguage = (lang) => {
    sessionStorage.setItem(SESSION_KEY, lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
