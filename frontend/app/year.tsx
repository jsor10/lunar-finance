import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";
import { shareYearPdf, YearRow } from "@/src/utils/yearPdf";

export default function YearOverview() {
  const { theme, user, loading, transactions, salaryFor, fmt, t, locale } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const t of transactions) set.add(new Date(t.created_at).getFullYear());
    return Array.from(set).sort((a, b) => a - b);
  }, [transactions]);

  const year = selectedYear ?? (years.length ? years[years.length - 1] : new Date().getFullYear());
  const yIdx = years.indexOf(year);

  const data = useMemo(() => {
    const agg = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0, has: false }));
    for (const t of transactions) {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      agg[m].has = true;
      if (t.type === "income") agg[m].income += t.amount;
      else agg[m].expenses += t.amount;
    }
    const rows: YearRow[] = agg.map((a, m) => {
      const salary = a.has ? salaryFor(year, m) : 0;
      return {
        label: new Date(2000, m, 1).toLocaleString(locale, { month: "long" }),
        has: a.has,
        salary,
        income: a.income,
        expenses: a.expenses,
        saved: a.has ? salary + a.income - a.expenses : 0,
      };
    });
    const totalIncome = rows.reduce((s, r) => s + r.income, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
    const totalSaved = rows.reduce((s, r) => s + (r.has ? r.saved : 0), 0);
    return { rows, totalIncome, totalExpenses, totalSaved };
  }, [transactions, year, salaryFor, locale]);

  if (!loading && !user) return <Redirect href="/" />;

  const cellWidth = (width - SPACING.lg * 2 - SPACING.sm * 2) / 3;

  const share = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await shareYearPdf({
        year,
        rows: data.rows,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        totalSaved: data.totalSaved,
        accent: theme.accentColor,
        fmt,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.md,
          paddingHorizontal: SPACING.lg,
          paddingBottom: insets.bottom + SPACING.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            testID="year-back-button"
            onPress={() => router.back()}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
          >
            <Feather name="arrow-left" size={20} color={theme.onSurface} />
          </Pressable>
          <Pressable
            testID="share-year-button"
            onPress={share}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: theme.brandTertiary, borderColor: "transparent" }]}
          >
            <Feather name="share-2" size={18} color={theme.accentColor} />
          </Pressable>
        </View>

        <Text style={[styles.kicker, { color: theme.accentColor }]}>{t("overview_kicker")}</Text>
        <View style={styles.yearRow}>
          <Pressable
            testID="year-prev"
            onPress={() => yIdx > 0 && setSelectedYear(years[yIdx - 1])}
            disabled={yIdx <= 0}
            hitSlop={8}
            style={[!(yIdx > 0) && { opacity: 0.3 }]}
          >
            <Feather name="chevron-left" size={26} color={theme.onSurface} />
          </Pressable>
          <Text
            testID="year-title"
            style={[styles.yearTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}
          >
            {year}
          </Text>
          <Pressable
            testID="year-next"
            onPress={() => yIdx >= 0 && yIdx < years.length - 1 && setSelectedYear(years[yIdx + 1])}
            disabled={!(yIdx >= 0 && yIdx < years.length - 1)}
            hitSlop={8}
            style={[!(yIdx >= 0 && yIdx < years.length - 1) && { opacity: 0.3 }]}
          >
            <Feather name="chevron-right" size={26} color={theme.onSurface} />
          </Pressable>
        </View>

        {/* Totals */}
        <View style={[styles.totals, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <View style={styles.totalCell}>
            <Text style={[styles.totalLabel, { color: theme.onSurfaceMuted }]}>{t("income_u")}</Text>
            <Text style={[styles.totalValue, { color: theme.success, fontFamily: FONTS.display }]}>
              +{fmt(data.totalIncome)}
            </Text>
          </View>
          <View style={[styles.vr, { backgroundColor: theme.border }]} />
          <View style={styles.totalCell}>
            <Text style={[styles.totalLabel, { color: theme.onSurfaceMuted }]}>{t("expenses_u")}</Text>
            <Text style={[styles.totalValue, { color: theme.danger, fontFamily: FONTS.display }]}>
              -{fmt(data.totalExpenses)}
            </Text>
          </View>
          <View style={[styles.vr, { backgroundColor: theme.border }]} />
          <View style={styles.totalCell}>
            <Text style={[styles.totalLabel, { color: theme.onSurfaceMuted }]}>{t("saved_u")}</Text>
            <Text
              testID="year-total-saved"
              style={[styles.totalValue, { color: theme.accentColor, fontFamily: FONTS.display }]}
            >
              {fmt(data.totalSaved)}
            </Text>
          </View>
        </View>

        {/* 12-month grid */}
        <View style={styles.grid} testID={`year-grid-${year}`}>
          {data.rows.map((r, m) => (
            <View
              key={r.label}
              testID={`year-cell-${m}`}
              style={[
                styles.cell,
                {
                  width: cellWidth,
                  backgroundColor: r.has ? theme.surfaceSecondary : "transparent",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.cellMonth, { color: r.has ? theme.onSurfaceMuted : theme.border }]}>
                {r.label.slice(0, 3).toUpperCase()}
              </Text>
              {r.has ? (
                <Text
                  style={[
                    styles.cellValue,
                    { color: r.saved >= 0 ? theme.success : theme.danger, fontFamily: FONTS.display },
                  ]}
                  numberOfLines={1}
                >
                  {fmt(r.saved)}
                </Text>
              ) : (
                <Text style={[styles.cellValue, { color: theme.border, fontFamily: FONTS.display }]}>—</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.note, { color: theme.onSurfaceMuted }]}>{t("year_note")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  kicker: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  yearTitle: { fontSize: 40, fontWeight: "500" },
  totals: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  totalCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  totalLabel: { fontFamily: FONTS.body, fontSize: 10, letterSpacing: 1.2, marginBottom: 4, fontWeight: "700" },
  totalValue: { fontSize: 15, fontWeight: "500" },
  vr: { width: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  cell: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    paddingVertical: SPACING.md,
    alignItems: "center",
    gap: 4,
  },
  cellMonth: { fontFamily: FONTS.body, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  cellValue: { fontSize: 14, fontWeight: "500" },
  note: {
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.lg,
    lineHeight: 17,
  },
});
