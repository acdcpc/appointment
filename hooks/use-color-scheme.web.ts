import { useEffect, useState } from "react";

import { useThemeContext } from "@/lib/theme-provider";

/**
 * Web variant of the scheme hook.
 *
 * The app's own choice — the scheme the user selected, persisted in storage,
 * with the system value only as its initial default — is the single source of
 * truth. The previous version read react-native's SYSTEM scheme instead, so an
 * app set to dark on a light desktop rendered half-dark: CSS-variable surfaces
 * (canvas, class-styled cards) followed the app's choice while every inline
 * colour (headings, eyebrows, buttons) followed the OS — dark-on-dark, which
 * is exactly the unreadable clinic-home screen.
 *
 * The hydration gate stays: the prerendered HTML is always light, so the first
 * client render must be light too; the provider then flips every consumer to
 * the stored scheme immediately after mount.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { colorScheme } = useThemeContext();

  return hasHydrated ? colorScheme : "light";
}
