import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TextSizeLevel = "small" | "normal" | "large";
const STORAGE_KEY = "rainbow-text-scale";
const SCALES: Record<TextSizeLevel, number> = { small: 0.9, normal: 1, large: 1.15 };

type TextSizeContextValue = { level: TextSizeLevel; scale: number; setLevel: (level: TextSizeLevel) => void };
const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<TextSizeLevel>("normal");

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "small" || stored === "normal" || stored === "large") setLevelState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  const setLevel = useCallback((next: TextSizeLevel) => {
    setLevelState(next);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, next);
        // Web: scale the whole app surface (modern browsers support CSS zoom).
        // Native apps already follow the OS text-size preference.
        if (typeof document !== "undefined") {
          document.body.style.zoom = String(SCALES[next]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      if (typeof document !== "undefined" && typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const applied = stored === "small" || stored === "large" ? stored : "normal";
        document.body.style.zoom = String(SCALES[applied as TextSizeLevel]);
      }
    } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ level, scale: SCALES[level], setLevel }), [level, setLevel]);
  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error("useTextSize must be used within TextSizeProvider");
  return ctx;
}
