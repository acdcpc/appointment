/** @type {const} */
// Warm "clay & parchment" language — inspired by the Kapoori Ka reference the
// owner prefers. Light mode is warm parchment with terracotta actions and deep
// ink text; dark mode is warm charcoal with the same terracotta identity.
const themeColors = {
  // Brand + structure
  primary: { light: '#9A4A2A', dark: '#F0874A' },
  background: { light: '#FBF7F0', dark: '#171310' },
  surface: { light: '#FFFDF9', dark: '#241C18' },
  foreground: { light: '#2A211B', dark: '#F2E9E1' },
  muted: { light: '#6F6259', dark: '#B9A79A' },
  border: { light: '#EFE3D6', dark: '#3E322A' },
  // Status — factual only
  success: { light: '#2A6B47', dark: '#7AC79B' },
  warning: { light: '#8A5A00', dark: '#F2C879' },
  error: { light: '#B3261E', dark: '#F08D80' },
  // Action — the booking call to action (terracotta with ink text)
  action: { light: '#E8602C', dark: '#E8602C' },
  actionHover: { light: '#D14E1C', dark: '#F08050' },
  actionPressed: { light: '#B84315', dark: '#F5A284' },
  actionSurface: { light: '#FBE3D5', dark: '#3A241C' },
  // Brand interactive states
  brandHover: { light: '#833D22', dark: '#F5A284' },
  brandPressed: { light: '#6E3219', dark: '#F7BCA6' },
  // Supporting accent — sage/pine for selected, availability and clinical cues
  teal: { light: '#2F6B5C', dark: '#78C4AE' },
  tealSurface: { light: '#E8F1EA', dark: '#1E2A21' },
  // Status surfaces
  successSurface: { light: '#E4F3E8', dark: '#1B2C22' },
  warningSurface: { light: '#FBF0D6', dark: '#332814' },
  dangerSurface: { light: '#FBE5E3', dark: '#3A211D' },
  // Text on fills: white on the deep terracotta brand, ink on the clay action
  textInverse: { light: '#FFFFFF', dark: '#2A211B' },
  textInverseMuted: { light: '#F4DED2', dark: '#3A2A20' },
  onAction: { light: '#2A211B', dark: '#2A211B' },
  // Accessibility + disabled
  focusRing: { light: '#2F6B5C', dark: '#78C4AE' },
  disabledSurface: { light: '#F1E8DD', dark: '#2A211B' },
  disabledText: { light: '#A2968C', dark: '#6E6058' },
};

module.exports = { themeColors };
