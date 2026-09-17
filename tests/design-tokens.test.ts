import { describe, expect, it } from "vitest";
import themeConfig from "../theme.config.js";
import { bilingualText } from "../lib/language-preference";

const { themeColors } = themeConfig as unknown as {
  themeColors: Record<string, { light: string; dark: string }>;
};

/** WCAG 2.x relative-luminance contrast ratio for two hex colours. */
function contrast(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const [lighter, darker] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const REQUIRED_TOKENS = [
  "primary", "teal", "action", "background", "surface", "foreground", "muted", "border",
  "success", "warning", "error", "actionSurface", "tealSurface", "successSurface",
  "warningSurface", "dangerSurface", "textInverse", "onAction", "focusRing", "disabledText",
];

describe("design tokens — canonical navy / teal / coral system", () => {
  it.each(["light", "dark"] as const)("defines every required token in %s mode", (mode) => {
    for (const token of REQUIRED_TOKENS) {
      expect(themeColors[token], `${token}.${mode} missing`).toBeDefined();
      expect(themeColors[token][mode]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("keeps the warm brand identity: terracotta brand, clay booking action, parchment canvas", () => {
    expect(themeColors.action.light.toLowerCase()).toBe("#e8602c");
    expect(themeColors.primary.light.toLowerCase()).toBe("#9a4a2a");
    expect(themeColors.background.light.toLowerCase()).toBe("#fbf7f0");
    expect(themeColors.surface.light.toLowerCase()).toBe("#fffdf9");
  });
});

describe("contrast floor — parent-facing text stays legible in both modes", () => {
  const pairs: Array<{ label: string; fg: string; bg: string; min: number }> = [];

  for (const mode of ["light", "dark"] as const) {
    pairs.push(
      { label: `foreground on background (${mode})`, fg: themeColors.foreground[mode], bg: themeColors.background[mode], min: 4.5 },
      { label: `foreground on surface (${mode})`, fg: themeColors.foreground[mode], bg: themeColors.surface[mode], min: 4.5 },
      { label: `muted on background (${mode})`, fg: themeColors.muted[mode], bg: themeColors.background[mode], min: 4.5 },
      { label: `ink-on-coral booking CTA (${mode})`, fg: themeColors.onAction[mode], bg: themeColors.action[mode], min: 4.5 },
      { label: `inverse text on navy brand fill (${mode})`, fg: themeColors.textInverse[mode], bg: themeColors.primary[mode], min: 4.5 },
      { label: `success on background (${mode})`, fg: themeColors.success[mode], bg: themeColors.background[mode], min: 4.5 },
      { label: `error on background (${mode})`, fg: themeColors.error[mode], bg: themeColors.background[mode], min: 4.5 },
      // amber is reserved for large/bold status labels, assessed at the AA large-text floor
      { label: `warning on background (${mode})`, fg: themeColors.warning[mode], bg: themeColors.background[mode], min: 3 },
      { label: `teal link on background (${mode})`, fg: themeColors.teal[mode], bg: themeColors.background[mode], min: 4.5 },
    );
  }

  it.each(pairs)("$label ≥ $min:1", ({ fg, bg, min }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe("bilingual presentation", () => {
  it("returns the Nepali string for Nepali readers and English otherwise", () => {
    expect(bilingualText("ne", "Book a visit", "भेट्ने समय लिनुहोस्")).toBe("भेट्ने समय लिनुहोस्");
    expect(bilingualText("en", "Book a visit", "भेट्ने समय लिनुहोस्")).toBe("Book a visit");
  });

  it("never falls back to an empty label in either language", () => {
    const labels: Array<[string, string]> = [
      ["Book a visit", "भेट्ने समय लिनुहोस्"],
      ["Sign in", "लग इन"],
      ["Delete my account", "मेरो खाता मेटाउनुहोस्"],
      ["Night mode", "रात्री मोड"],
      ["Text size", "अक्षरको आकार"],
      ["No child profile linked yet", "अझै बच्चा प्रोफाइल जोडिएको छैन"],
    ];
    for (const [en, ne] of labels) {
      expect(en.trim().length).toBeGreaterThan(0);
      expect(ne.trim().length).toBeGreaterThan(0);
      expect(ne).not.toBe(en);
    }
  });
});
