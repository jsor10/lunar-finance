import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

type Point = { key: string; label: string; balance: number };

const CHART_H = 110;

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? "-" : ""}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

export function BalanceTrend({ trend, theme, fmt }: { trend: Point[]; theme: any; fmt: (n: number) => string }) {
  const balances = trend.map((t) => t.balance);
  const maxV = Math.max(...balances, 1);
  const minV = Math.min(...balances, 0);
  const span = maxV - minV || 1;

  const first = trend[0]?.balance ?? 0;
  const last = trend[trend.length - 1]?.balance ?? 0;
  const delta = last - first;
  const up = delta >= 0;

  return (
    <View
      testID="balance-trend-chart"
      style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.onSurfaceMuted }]}>BALANCE TREND</Text>
          <Text style={[styles.big, { color: theme.onSurface, fontFamily: FONTS.display }]}>
            {fmt(last)}
          </Text>
        </View>
        <View
          style={[
            styles.deltaPill,
            { backgroundColor: theme.brandTertiary },
          ]}
        >
          <Text style={[styles.deltaText, { color: up ? theme.success : theme.danger }]}>
            {up ? "▲" : "▼"} {fmt(Math.abs(delta))}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barsRow}
      >
        {trend.map((p, idx) => {
          const isLast = idx === trend.length - 1;
          const frac = (p.balance - minV) / span; // 0..1 relative to range
          const h = Math.max(6, frac * CHART_H);
          return (
            <View key={p.key} style={styles.col} testID={`trend-bar-${p.key}`}>
              <Text
                style={[
                  styles.barValue,
                  { color: isLast ? theme.accentColor : theme.onSurfaceMuted },
                ]}
              >
                {abbreviate(p.balance)}
              </Text>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={
                    isLast
                      ? [theme.accentColor, theme.accentColor]
                      : [theme.brandTertiary, theme.brandTertiary]
                  }
                  style={[
                    styles.bar,
                    {
                      height: h,
                      borderWidth: isLast ? 0 : 0.5,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: isLast ? theme.onSurface : theme.onSurfaceMuted }]}>
                {p.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  title: { fontFamily: FONTS.body, fontSize: 11, letterSpacing: 1.5 },
  big: { fontSize: 28, fontWeight: "500", marginTop: 2 },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    height: 32,
    borderRadius: RADIUS.pill,
  },
  deltaText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "700" },
  barsRow: { alignItems: "flex-end", gap: SPACING.md, paddingHorizontal: 2 },
  col: { alignItems: "center", width: 46 },
  barValue: { fontFamily: FONTS.body, fontSize: 11, fontWeight: "600", marginBottom: 6 },
  barTrack: { height: CHART_H, justifyContent: "flex-end" },
  bar: { width: 30, borderRadius: RADIUS.sm },
  barLabel: { fontFamily: FONTS.body, fontSize: 11, marginTop: 8, fontWeight: "600" },
});
