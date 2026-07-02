import React, { useState } from "react";
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
import { useCountdown, formatDuration } from "@/src/hooks/useCountdown";

const CARD_BG =
  "https://images.pexels.com/photos/24712928/pexels-photo-24712928.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const CARD_BG_DARK =
  "https://images.pexels.com/photos/30232780/pexels-photo-30232780.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  const { theme, user, stats, fmt } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [salaryOpen, setSalaryOpen] = useState(false);

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
            <Text style={[styles.kicker, { color: theme.onSurfaceMuted }]}>WELCOME BACK</Text>
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

        {/* Monthly summary */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
          Financial Summary
        </Text>
        <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <SummaryRow
            theme={theme}
            label="This Month"
            value={fmt(stats.thisMonthExpenses)}
            hint="spent"
          />
          <View style={[styles.hr, { backgroundColor: theme.border }]} />
          <SummaryRow
            theme={theme}
            label="Avg / Expense"
            value={fmt(stats.avgExpense)}
            hint="per entry"
          />
        </View>
      </ScrollView>

      <SalarySheet visible={salaryOpen} onClose={() => setSalaryOpen(false)} />
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
      <Text style={[styles.statValue, { color: theme.onSurface, fontFamily: FONTS.display }]}>
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ theme, label, value, hint }: any) {
  return (
    <View style={styles.summaryRow}>
      <View>
        <Text style={[styles.summaryLabel, { color: theme.onSurface }]}>{label}</Text>
        <Text style={[styles.summaryHint, { color: theme.onSurfaceMuted }]}>{hint}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: theme.accentColor, fontFamily: FONTS.display }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.lg },
  kicker: { fontFamily: FONTS.body, fontSize: 11, letterSpacing: 2, marginBottom: 2 },
  greeting: { fontSize: 32, fontWeight: "500" },
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
  statLabel: { fontFamily: FONTS.body, fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "500" },
  sectionTitle: { fontSize: 22, fontWeight: "500", marginBottom: SPACING.md },
  summaryCard: { borderRadius: RADIUS.md, borderWidth: 0.5, paddingHorizontal: SPACING.lg },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  summaryLabel: { fontFamily: FONTS.body, fontSize: 15, fontWeight: "600" },
  summaryHint: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  summaryValue: { fontSize: 22, fontWeight: "500" },
  hr: { height: 0.5 },
});
