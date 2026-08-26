import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { Theme } from "@/src/theme/colors";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

export type DonutSlice = { name: string; value: number };

type Props = {
  data: DonutSlice[]; // sorted desc, max ~6 slices
  total: number;
  scopeLabel: string; // e.g. "This Month" | "All Time"
  theme: Theme;
  fmt: (n: number) => string;
};

const SIZE = 172;
const STROKE = 22;

function palette(theme: Theme): string[] {
  const base = [theme.accentColor, "#C6A45A", "#3FA07C", "#C0453B", "#5A82C4", "#9A9A9A"];
  // Avoid a duplicate when the accent itself is gold.
  if (theme.accent === "gold") base[1] = "#0B1F3B";
  if (theme.accent === "emerald") base[2] = "#C6A45A";
  return base;
}

export function CategoryDonut({ data, total, scopeLabel, theme, fmt }: Props) {
  const r = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * r;
  const colors = palette(theme);
  let acc = 0;

  return (
    <View
      testID="category-donut"
      style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
    >
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              stroke={theme.surfaceTertiary}
              strokeWidth={STROKE}
              fill="none"
            />
            {data.map((s, i) => {
              const len = (s.value / total) * C;
              const seg = (
                <Circle
                  key={s.name}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={r}
                  stroke={colors[i % colors.length]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${Math.max(len - 2.5, 0.5)} ${C}`}
                  strokeDashoffset={-acc}
                  fill="none"
                />
              );
              acc += len;
              return seg;
            })}
          </G>
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.centerValue, { color: theme.onSurface, fontFamily: FONTS.display }]}>
            {fmt(total)}
          </Text>
          <Text style={[styles.centerLabel, { color: theme.onSurfaceMuted }]}>{scopeLabel}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <View key={s.name} style={styles.legendRow} testID={`donut-legend-${s.name}`}>
              <View style={[styles.dot, { backgroundColor: colors[i % colors.length] }]} />
              <Text style={[styles.legendName, { color: theme.onSurfaceSecondary }]} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={[styles.legendPct, { color: theme.onSurfaceMuted }]}>{pct}%</Text>
              <Text style={[styles.legendAmt, { color: theme.onSurface, fontFamily: FONTS.display }]}>
                {fmt(s.value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    padding: SPACING.lg,
  },
  donutWrap: { alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  centerValue: { fontSize: 22, fontWeight: "500" },
  centerLabel: { fontFamily: FONTS.body, fontSize: 11, letterSpacing: 1, marginTop: 2, textTransform: "uppercase" },
  legend: { gap: 2 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  legendPct: { fontFamily: FONTS.body, fontSize: 12, width: 38, textAlign: "right" },
  legendAmt: { fontSize: 15, fontWeight: "500", width: 92, textAlign: "right" },
});
