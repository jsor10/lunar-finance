export type Mode = "light" | "dark";
export type Accent = "navy" | "gold" | "emerald";

const ACCENTS = {
  navy: {
    primary: "#0B1F3B",
    secondary: "#1C3A66",
    tertiaryLight: "#E6ECF5",
    tertiaryDark: "#16233A",
    onPrimary: "#FFFFFF",
    lift: "#5A82C4",
    label: "Midnight Navy",
    swatch: "#0B1F3B",
  },
  gold: {
    primary: "#C6A45A",
    secondary: "#A48645",
    tertiaryLight: "#F9F5EC",
    tertiaryDark: "#3A301A",
    onPrimary: "#1A1A1A",
    lift: "#D8BC7E",
    label: "Champagne Gold",
    swatch: "#C6A45A",
  },
  emerald: {
    primary: "#0F3D2E",
    secondary: "#0A281E",
    tertiaryLight: "#E7ECEA",
    tertiaryDark: "#0F2A20",
    onPrimary: "#FFFFFF",
    lift: "#3FA07C",
    label: "Deep Emerald",
    swatch: "#0F3D2E",
  },
} as const;

export const ACCENT_LIST: Accent[] = ["navy", "gold", "emerald"];
export const ACCENT_META = ACCENTS;

export type Theme = {
  mode: Mode;
  accent: Accent;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  onSurface: string;
  onSurfaceSecondary: string;
  onSurfaceMuted: string;
  border: string;
  // accent-derived
  accentColor: string; // for icons/highlights/text
  primaryBg: string; // button bg
  onPrimary: string; // text on button
  brandTertiary: string; // soft tinted container
  onBrandTertiary: string;
  success: string;
  error: string;
  danger: string;
};

export function buildTheme(mode: Mode, accent: Accent): Theme {
  const a = ACCENTS[accent];
  const isDark = mode === "dark";

  const base = isDark
    ? {
        surface: "#050505",
        surfaceSecondary: "#121212",
        surfaceTertiary: "#1E1E1E",
        onSurface: "#FFFFFF",
        onSurfaceSecondary: "#E4E4E4",
        onSurfaceMuted: "#9A9A9A",
        border: "#262626",
      }
    : {
        surface: "#FAFAFA",
        surfaceSecondary: "#FFFFFF",
        surfaceTertiary: "#F0F0F0",
        onSurface: "#121212",
        onSurfaceSecondary: "#3A3A3A",
        onSurfaceMuted: "#8A8A8A",
        border: "#EAEAEA",
      };

  return {
    mode,
    accent,
    ...base,
    accentColor: isDark ? a.lift : a.primary,
    primaryBg: isDark ? a.lift : a.primary,
    onPrimary: isDark ? "#0A0A0A" : a.onPrimary,
    brandTertiary: isDark ? a.tertiaryDark : a.tertiaryLight,
    onBrandTertiary: isDark ? a.lift : a.primary,
    success: isDark ? "#3FA07C" : "#0F3D2E",
    error: "#C0453B",
    danger: "#C0453B",
  };
}

export const CURRENCIES = {
  EUR: { symbol: "€", label: "Euro" },
  USD: { symbol: "$", label: "US Dollar" },
  GBP: { symbol: "£", label: "British Pound" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatMoney(amount: number, code: CurrencyCode): string {
  const symbol = CURRENCIES[code]?.symbol ?? "€";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${formatted}`;
}
