import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "ne";
type LanguagePreference = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; toggleLanguage: () => void; ready: boolean };
const LanguageContext = createContext<LanguagePreference | null>(null);
const STORAGE_KEY = "rainbow-clinic-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("ne");
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => { if (value === "ne" || value === "en") setLanguageState(value); }).finally(() => setReady(true)); }, []);
  const setLanguage = (next: AppLanguage) => { setLanguageState(next); void AsyncStorage.setItem(STORAGE_KEY, next); };
  const value = useMemo(() => ({ language, setLanguage, toggleLanguage: () => setLanguage(language === "en" ? "ne" : "en"), ready }), [language, ready]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguagePreference() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguagePreference must be used inside LanguageProvider");
  return value;
}

export function bilingualText(language: AppLanguage, english: string, nepali: string) { return language === "ne" ? nepali : english; }
