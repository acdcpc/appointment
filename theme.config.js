/** @type {const} */
const themeColors = {
  // Brand + structure
  primary: { light: '#092C4C', dark: '#5BB8D0' },
  background: { light: '#F7FAFC', dark: '#102A43' },
  surface: { light: '#FFFFFF', dark: '#173B56' },
  foreground: { light: '#102A43', dark: '#F7FAFC' },
  muted: { light: '#627D98', dark: '#B8C7D8' },
  border: { light: '#D9E2EC', dark: '#345A73' },
  // Status
  success: { light: '#2F855A', dark: '#68D391' },
  warning: { light: '#C27C0E', dark: '#F6C453' },
  error: { light: '#C53030', dark: '#FC8181' },
  // Action (coral) — reserved for important parent-facing actions
  action: { light: '#F97360', dark: '#F98B78' },
  actionHover: { light: '#E85F4C', dark: '#FAA08F' },
  actionPressed: { light: '#D14F3C', dark: '#F8B3A6' },
  actionSurface: { light: '#FFF4F1', dark: '#3A2430' },
  // Brand interactive states
  brandHover: { light: '#0B3A63', dark: '#74C6DB' },
  brandPressed: { light: '#082239', dark: '#8ED4E5' },
  // Supporting clinical teal — charts, links, selected states
  teal: { light: '#0E7490', dark: '#38B7C0' },
  tealSurface: { light: '#E0F2F3', dark: '#143D44' },
  // Status surfaces
  successSurface: { light: '#EAF7F0', dark: '#1C3A2E' },
  warningSurface: { light: '#FFF8EB', dark: '#3C331C' },
  dangerSurface: { light: '#FDE7E2', dark: '#46232A' },
  // Inverse text on brand/action fills
  textInverse: { light: '#FFFFFF', dark: '#FFFFFF' },
  textInverseMuted: { light: '#CFE3ED', dark: '#DCEBF2' },
  // Accessibility + disabled
  focusRing: { light: '#38B7C0', dark: '#5BB8D0' },
  disabledSurface: { light: '#EEF2F7', dark: '#24425C' },
  disabledText: { light: '#9FB3C8', dark: '#64809A' },
};

module.exports = { themeColors };
