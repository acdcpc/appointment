/** @type {const} */
// Warm "clay & parchment" design language (matches Kapoori Ka's professional
// caregiver aesthetic): terracotta brand, warm parchment backgrounds, and a
// warm charcoal dark mode with the same terracotta accents.
const themeColors = {
  // Brand + structure
  primary: { light: '#B85C38', dark: '#E8602C' },
  background: { light: '#F7F1EB', dark: '#171310' },
  surface: { light: '#FDF8F2', dark: '#241C18' },
  foreground: { light: '#1A1A2E', dark: '#F0E7DE' },
  muted: { light: '#7A6E65', dark: '#B5A69B' },
  border: { light: '#EDE0D4', dark: '#3E322A' },
  // Status
  success: { light: '#2E7D32', dark: '#5DBE8B' },
  warning: { light: '#B26A00', dark: '#F2C879' },
  error: { light: '#C0392B', dark: '#E06B5B' },
  // Action (terracotta CTA) — reserved for important parent-facing actions
  action: { light: '#C4501F', dark: '#E8602C' },
  actionHover: { light: '#A84519', dark: '#F0874A' },
  actionPressed: { light: '#8F3A12', dark: '#F5A284' },
  actionSurface: { light: '#FCECE2', dark: '#3A241C' },
  // Brand interactive states
  brandHover: { light: '#9E4E2E', dark: '#F0874A' },
  brandPressed: { light: '#84401F', dark: '#F5A284' },
  // Supporting accent — links, selected states, clinical highlights
  teal: { light: '#1565C0', dark: '#8AB4F8' },
  tealSurface: { light: '#E3F2FD', dark: '#1B2740' },
  // Status surfaces
  successSurface: { light: '#D1FAE5', dark: '#173B2C' },
  warningSurface: { light: '#FEF3C7', dark: '#3B2F14' },
  dangerSurface: { light: '#FEE2E2', dark: '#3F1D18' },
  // Inverse text on brand/action fills
  textInverse: { light: '#FFFFFF', dark: '#1A1A2E' },
  textInverseMuted: { light: '#F5E6DC', dark: '#4A2B20' },
  // Accessibility + disabled
  focusRing: { light: '#1565C0', dark: '#8AB4F8' },
  disabledSurface: { light: '#EDE0D4', dark: '#2B211C' },
  disabledText: { light: '#A99B8F', dark: '#6D5A52' },
};

module.exports = { themeColors };
