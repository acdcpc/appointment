/** @type {const} */
// Kapoori Ka Design System — Nepal Edition (v2): warm "clay & parchment"
// language. ink #1A1A2E for reading text, clay #E8602C for actions (ink text
// on clay fills per v2), pine #3D8B5E strictly for trust/success, gold as the
// sparing highlight. Warm charcoal dark mode keeps the terracotta identity.
const themeColors = {
  // Brand + structure
  primary: { light: '#B85C38', dark: '#E8602C' },
  background: { light: '#FBF7F0', dark: '#171310' },
  surface: { light: '#FFFDF9', dark: '#241C18' },
  foreground: { light: '#1A1A2E', dark: '#F0E7DE' },
  muted: { light: '#7A6E65', dark: '#B5A69B' },
  border: { light: '#F0E4D9', dark: '#3E322A' },
  // Status — pine is trust/success only; danger never decorative
  success: { light: '#3D8B5E', dark: '#5DBE8B' },
  warning: { light: '#92400E', dark: '#F2C879' },
  error: { light: '#C0392B', dark: '#E06B5B' },
  // Action (clay CTA) — ink text on clay fills (v2 button-primary pattern)
  action: { light: '#E8602C', dark: '#E8602C' },
  actionHover: { light: '#D14E1C', dark: '#F0874A' },
  actionPressed: { light: '#B84315', dark: '#F5A284' },
  actionSurface: { light: '#F2D2B5', dark: '#3A241C' },
  // Brand interactive states
  brandHover: { light: '#A84519', dark: '#F0874A' },
  brandPressed: { light: '#8F3A12', dark: '#F5A284' },
  // Supporting accent — gold highlight + sage calm wash (selected/link states)
  teal: { light: '#3D8B5E', dark: '#5DBE8B' },
  tealSurface: { light: '#EAF2E7', dark: '#1F2A20' },
  // Status surfaces (v2 washes)
  successSurface: { light: '#D1FAE5', dark: '#173B2C' },
  warningSurface: { light: '#FEF3C7', dark: '#3B2F14' },
  dangerSurface: { light: '#FEE2E2', dark: '#3F1D18' },
  // Inverse text on warm fills — ink per v2 (never white on clay)
  textInverse: { light: '#1A1A2E', dark: '#1A1A2E' },
  textInverseMuted: { light: '#F5E6DC', dark: '#4A2B20' },
  // Accessibility + disabled
  focusRing: { light: '#1565C0', dark: '#8AB4F8' },
  disabledSurface: { light: '#F0E4D9', dark: '#2B211C' },
  disabledText: { light: '#A99B8F', dark: '#6D5A52' },
};

module.exports = { themeColors };
