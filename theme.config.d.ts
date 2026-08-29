export const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  action: { light: string; dark: string };
  actionHover: { light: string; dark: string };
  actionPressed: { light: string; dark: string };
  actionSurface: { light: string; dark: string };
  brandHover: { light: string; dark: string };
  brandPressed: { light: string; dark: string };
  teal: { light: string; dark: string };
  tealSurface: { light: string; dark: string };
  successSurface: { light: string; dark: string };
  warningSurface: { light: string; dark: string };
  dangerSurface: { light: string; dark: string };
  textInverse: { light: string; dark: string };
  textInverseMuted: { light: string; dark: string };
  focusRing: { light: string; dark: string };
  disabledSurface: { light: string; dark: string };
  disabledText: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
