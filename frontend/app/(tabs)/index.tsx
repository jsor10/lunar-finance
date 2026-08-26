import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";
import { SalarySheet } from "@/src/components/SalarySheet";
import { CategoryDonut, DonutSlice } from "@/src/components/CategoryDonut";
import { useCountdown, formatDuration } from "@/src/hooks/useCountdown";

const CARD_BG =
  "https://images.pexels.com/photos/24712928/pexels-photo-24712928.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const CARD_BG_DARK =
  "https://images.pexels.com/photos/30232780/pexels-photo-30232780.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  const { theme, user, stats, fmt, transactions } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [salaryOpen, setSalaryOpen] = useState(false);

  // Spending-by-category donut: this month's expenses, falling back to all time.
  const donut = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    const monthMap = new Map<string, number>();
    const allMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const name = t.category || "Other";
      allMap.set(name, (allMap.get(name) || 0) + t.amount);
      const d = new Date(t.created_at);
      if (d.getMonth() === cm && d.getFullYear() === cy) {
        monthMap.set(name, (monthMap.get(name) || 0) + t.amount);
      }
    }
    const useMonth = monthMap.size > 0;
    const src = useMonth ? monthMap : allMap;
    const sorted = Array.from(src.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    let data: DonutSlice[] = sorted;
    if (sorted.length > 5) {
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5).reduce((s, x) => s + x.value, 0);
      data = [...top, { name: "Others", value: rest }];
    }
    const total = data.reduce((s, x) => s + x.value, 0);
    return { data, total, scope: useMonth ? "This Month" : "All Time" };
  }, [transactions]);

  const lockRemaining = useCountdown(user?.delete_lock_until);
  const cardWidth = (width - SPACING.lg * 2 - SPACING.md) / 2;
  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.md,
          paddingBottom: SPACING.xxl,
          paddingHorizontal: SPACING.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.header} testID="home-header">
          <View>
            <Text style={[styles.kicker, { color: theme.accentColor }]}>WELCOME BACK</Text>
            <Text style={[styles.greeting, { color: theme.onSurface, fontFamily: FONTS.display }]}>
              {firstName}
            </Text>
          </View>
        </View>

        {lockRemaining > 0 ? (
          <View
            testID="home-lock-banner"
            style={[styles.lockBanner, { backgroundColor: theme.brandTertiary }]}
          >
            <Feather name="lock" size={16} color={theme.danger} />
            <Text style={[styles.lockText, { color: theme.onSurface }]}>
              Account deletion locked · {formatDuration(lockRemaining)}
            </Text>
          </View>
        ) : null}

        {/* Hero balance card */}
        <View style={[styles.hero, { borderColor: theme.border }]} testID="balance-card">
          <Image
            source={{ uri: theme.mode === "dark" ? CARD_BG_DARK : CARD_BG }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={
              theme.mode === "dark"
                ? ["rgba(5,5,5,0.55)", "rgba(5,5,5,0.9)"]
                : ["rgba(11,31,59,0.72)", "rgba(11,31,59,0.94)"]
            }
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Available Balance</Text>
            <Text style={styles.heroBalance} testID="available-balance">
              {fmt(stats.availableBalance)}
            </Text>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroSubLabel}>Monthly Salary</Text>
                <Text style={styles.heroSubValue} testID="monthly-salary">
                  {fmt(stats.salary)}
                </Text>
              </View>
              <Pressable
                testID="salary-button"
                onPress={() => setSalaryOpen(true)}
                style={({ pressed }) => [styles.salaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Feather name="edit-3" size={15} color="#0B1F3B" />
                <Text style={styles.salaryBtnText}>Salary</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.grid}>
          <StatCard
            width={cardWidth}
            theme={theme}
            icon="arrow-down-left"
            label="Total Expenses"
            value={fmt(stats.totalExpenses)}
            tint={theme.danger}
            testID="total-expenses-card"
          />
          <StatCard
            width={cardWidth}
            theme={theme}
            icon="arrow-up-right"
            label="Extra Income"
            value={fmt(stats.totalIncome)}
            tint={theme.success}
            testID="extra-income-card"
          />
        </View>

        {/* Spending by category */}
        {donut.total > 0 ? (
          <>
            <SectionHeader
              theme={theme}
              eyebrow="INSIGHTS"
              title="Spending by Category"
              subtitle={
                donut.scope === "This Month"
                  ? "Where your money went this month"
                  : "Where your money has gone so far"
              }
            />
            <View style={{ marginBottom: SPACING.xl }}>
              <CategoryDonut
                data={donut.data}
                total={donut.total}
                scopeLabel={donut.scope}
                theme={theme}
                fmt={fmt}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      <SalarySheet visible={salaryOpen} onClose={() => setSalaryOpen(false)} />
    </View>
  );
}

function SectionHeader({ theme, eyebrow, title, subtitle }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionEyebrow, { color: theme.accentColor }]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: theme.onSurfaceMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function StatCard({ width, theme, icon, label, value, tint, testID }: any) {
  return (
    <View
      testID={testID}
      style={[styles.statCard, { width, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
    >
      <View style={[styles.statIcon, { backgroundColor: theme.brandTertiary }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.statLabel, { color: theme.onSurfaceMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tint, fontFamily: FONTS.display }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.lg },
  kicker: { fontFamily: FONTS.body, fontSize: 11, letterSpacing: 2.5, marginBottom: 4, fontWeight: "700" },
  greeting: { fontSize: 36, fontWeight: "500" },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  lockText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  hero: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 0.5,
    marginBottom: SPACING.md,
  },
  heroContent: { padding: SPACING.lg },
  heroLabel: { color: "rgba(255,255,255,0.75)", fontFamily: FONTS.body, fontSize: 13 },
  heroBalance: {
    color: "#FFFFFF",
    fontFamily: FONTS.display,
    fontSize: 48,
    fontWeight: "500",
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  heroSubLabel: { color: "rgba(255,255,255,0.65)", fontFamily: FONTS.body, fontSize: 12 },
  heroSubValue: {
    color: "#FFFFFF",
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    marginTop: 2,
  },
  salaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: SPACING.md,
    height: 40,
    borderRadius: RADIUS.pill,
  },
  salaryBtnText: { color: "#0B1F3B", fontFamily: FONTS.body, fontSize: 14, fontWeight: "600" },
  grid: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.xl },
  statCard: { borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 0.5 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: { fontSize: 26, fontWeight: "500" },
  sectionHeader: { marginBottom: SPACING.md },
  sectionEyebrow: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 24, fontWeight: "500" },
  sectionSubtitle: { fontFamily: FONTS.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
