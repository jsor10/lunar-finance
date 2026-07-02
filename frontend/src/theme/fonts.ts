import { Platform } from "react-native";

// Elegant serif for display numbers & headers, clean system sans for body.
export const FONTS = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }) as string,
  body: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 4,
  md: 12,
  lg: 20,
  pill: 999,
};
