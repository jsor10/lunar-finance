import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp, Transaction } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";
import { TransactionSheet } from "@/src/components/TransactionSheet";
import { BalanceTrend } from "@/src/components/BalanceTrend";
import { categoryIcon } from "@/src/constants/categories";
import { shareMonthPdf } from "@/src/utils/monthPdf";

type MonthData = {
  key: string;
  title: string;
  year: number;
  month1: number; // 1-12
  salary: number;
  income: number;
  expenses: number;
  balance: number;
  breakdown: { name: string; expense: number; income: number }[];
  allItems: Transaction[];
};

type Group = {
  name: string;
  expense: number;
  income: number;
  items: Transaction[];
};

export default function Transactions() {
  const { theme, transactions, deleteTransaction, deleteMonth, fmt, salaryFor, t, locale } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // All months (chronological), each with summary + category breakdown.
  const months = useMemo<MonthData[]>(() => {
    const map = new Map<string, {
      key: string;
      title: string;
      year: number;
      month1: number;
      income: number;
      expenses: number;
      all: Transaction[];
      cats: Map<string, { name: string; expense: number; income: number }>;
    }>();
    for (const t of transactions) {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: d.toLocaleString(locale, { month: "long", year: "numeric" }),
          year: d.getFullYear(),
          month1: d.getMonth() + 1,
          income: 0,
          expenses: 0,
          all: [],
          cats: new Map(),
        });
      }
      const bucket = map.get(key)!;
      if (t.type === "income") bucket.income += t.amount;
      else bucket.expenses += t.amount;
      const cname = t.category || "Other";
      if (!bucket.cats.has(cname)) bucket.cats.set(cname, { name: cname, expense: 0, income: 0 });
      const c = bucket.cats.get(cname)!;
      if (t.type === "income") c.income += t.amount;
      else c.expense += t.amount;
      bucket.all.push(t);
    }
    return Array.from(map.values())
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((m) => {
        const sal = salaryFor(m.year, m.month1 - 1);
        return {
          key: m.key,
          title: m.title,
          year: m.year,
          month1: m.month1,
          salary: sal,
          income: m.income,
          expenses: m.expenses,
          balance: sal + m.income - m.expenses,
          breakdown: Array.from(m.cats.values()).sort(
            (a, b) => b.expense + b.income - (a.expense + a.income),
          ),
          allItems: m.all,
        };
      });
  }, [transactions, salaryFor, locale]);

  const trend = useMemo(
    () =>
      months.map((m) => ({
        key: m.key,
        label: new Date(m.year, m.month1 - 1, 1).toLocaleString(locale, { month: "short" }),
        balance: m.balance,
      })),
    [months, locale],
  );

  let idx = selectedKey ? months.findIndex((m) => m.key === selectedKey) : -1;
  if (idx === -1) idx = months.length - 1; // default: latest month
  const current = idx >= 0 ? months[idx] : null;

  // Category groups for the shown month, distributed into two balanced columns.
  const columns = useMemo<[Group[], Group[]]>(() => {
    if (!current) return [[], []];
    const map = new Map<string, Group>();
    for (const t of current.allItems) {
      const name = t.category || "Other";
      if (!map.has(name)) map.set(name, { name, expense: 0, income: 0, items: [] });
      const g = map.get(name)!;
      if (t.type === "income") g.income += t.amount;
      else g.expense += t.amount;
      g.items.push(t);
    }
    const groups = Array.from(map.values()).sort(
      (a, b) => b.expense + b.income - (a.expense + a.income),
    );
    const colA: Group[] = [];
    const colB: Group[] = [];
    let hA = 0;
    let hB = 0;
    for (const g of groups) {
      const h = g.items.length + 2; // approximate card height weight
      if (hA <= hB) {
        colA.push(g);
        hA += h;
      } else {
        colB.push(g);
        hB += h;
      }
    }
    return [colA, colB];
  }, [current]);

  const goPrev = () => {
    if (idx > 0) {
      Haptics.selectionAsync();
      setSelectedKey(months[idx - 1].key);
    }
  };
  const goNext = () => {
    if (idx < months.length - 1) {
      Haptics.selectionAsync();
      setSelectedKey(months[idx + 1].key);
    }
  };

  const resetMonth = async () => {
    if (!current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteMonth(current.year, current.month1);
    setSelectedKey(null); // fall back to latest remaining month
  };

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setSheetOpen(true);
  };
  const remove = (t: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteTransaction(t.id);
  };

  const colWidth = (width - SPACING.lg * 2 - SPACING.md) / 2;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.md,
          paddingHorizontal: SPACING.lg,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: theme.accentColor }]}>{t("your_money")}</Text>
            <Text style={[styles.title, { color: theme.onSurface, fontFamily: FONTS.display }]}>
              {t("activity_title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.onSurfaceMuted }]}>
              {t("activity_sub")}
            </Text>
          </View>
          <Pressable
            testID="year-overview-button"
            onPress={() => router.push("/year")}
            style={({ pressed }) => [
              styles.yearBtn,
              { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="calendar" size={14} color={theme.accentColor} />
            <Text style={[styles.yearBtnText, { color: theme.onSurface }]}>{t("year_btn")}</Text>
          </Pressable>
        </View>

        {trend.length >= 2 ? <BalanceTrend trend={trend} theme={theme} fmt={fmt} t={t} /> : null}

        {current ? (
          <>
            <MonthNav
              theme={theme}
              title={current.title}
              canPrev={idx > 0}
              canNext={idx < months.length - 1}
              onPrev={goPrev}
              onNext={goNext}
              onReset={resetMonth}
              monthKey={current.key}
              t={t}
            />
            <MonthHeader theme={theme} section={current} fmt={fmt} t={t} />

            <View style={styles.columns} testID={`category-columns-${current.key}`}>
              <View style={{ width: colWidth, gap: SPACING.md }}>
                {columns[0].map((g) => (
                  <GroupCard
                    key={g.name}
                    group={g}
                    theme={theme}
                    fmt={fmt}
                    onEdit={openEdit}
                    onDelete={remove}
                  />
                ))}
              </View>
              <View style={{ width: colWidth, gap: SPACING.md }}>
                {columns[1].map((g) => (
                  <GroupCard
                    key={g.name}
                    group={g}
                    theme={theme}
                    fmt={fmt}
                    onEdit={openEdit}
                    onDelete={remove}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.empty} testID="transactions-empty">
            <View style={[styles.emptyIcon, { backgroundColor: theme.brandTertiary }]}>
              <Feather name="inbox" size={26} color={theme.accentColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
              {t("no_entries_title")}
            </Text>
            <Text style={[styles.emptyText, { color: theme.onSurfaceMuted }]}>
              {t("no_entries_text")}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        testID="add-transaction-fab"
        onPress={openAdd}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primaryBg, bottom: insets.bottom + 78 },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Feather name="plus" size={26} color={theme.onPrimary} />
      </Pressable>

      <TransactionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
      />
    </View>
  );
}

function GroupCard({ group, theme, fmt, onEdit, onDelete }: any) {
  return (
    <View
      testID={`group-card-${group.name}`}
      style={[styles.groupCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
    >
      <View style={styles.groupHeader}>
        <View style={[styles.groupIcon, { backgroundColor: theme.brandTertiary }]}>
          <Feather name={categoryIcon(group.name) as any} size={13} color={theme.accentColor} />
        </View>
        <Text style={[styles.groupName, { color: theme.onSurface }]} numberOfLines={1}>
          {group.name}
        </Text>
      </View>
      <View style={styles.groupTotals}>
        {group.expense > 0 ? (
          <Text style={[styles.groupTotal, { color: theme.danger, fontFamily: FONTS.display }]}>
            -{fmt(group.expense)}
          </Text>
        ) : null}
        {group.income > 0 ? (
          <Text style={[styles.groupTotal, { color: theme.success, fontFamily: FONTS.display }]}>
            +{fmt(group.income)}
          </Text>
        ) : null}
      </View>
      <View style={[styles.groupDivider, { backgroundColor: theme.border }]} />
      {group.items.map((item: Transaction, i: number) => (
        <Pressable
          key={item.id}
          testID={`transaction-row-${item.id}`}
          onPress={() => onEdit(item)}
          style={({ pressed }) => [
            styles.entry,
            i > 0 && { borderTopWidth: 0.5, borderTopColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryDesc, { color: theme.onSurface }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text
              style={[
                styles.entryAmount,
                {
                  color: item.type === "expense" ? theme.danger : theme.success,
                  fontFamily: FONTS.display,
                },
              ]}
              numberOfLines={1}
            >
              {item.type === "expense" ? "-" : "+"}
              {fmt(item.amount)}
            </Text>
          </View>
          <Pressable
            testID={`delete-transaction-${item.id}`}
            onPress={() => onDelete(item)}
            hitSlop={10}
            style={styles.entryDelete}
          >
            <Feather name="trash-2" size={14} color={theme.onSurfaceMuted} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

function MonthNav({ theme, title, canPrev, canNext, onPrev, onNext, onReset, monthKey, t }: any) {
  return (
    <View style={styles.monthNav} testID={`month-nav-${monthKey}`}>
      <Pressable
        testID="month-prev"
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={8}
        style={[
          styles.navArrow,
          { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
          !canPrev && { opacity: 0.35 },
        ]}
      >
        <Feather name="chevron-left" size={20} color={theme.onSurface} />
      </Pressable>
      <View style={styles.navCenter}>
        <Text
          testID="month-nav-title"
          style={[styles.navTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <ResetMonthButton theme={theme} onReset={onReset} monthKey={monthKey} t={t} />
      </View>
      <Pressable
        testID="month-next"
        onPress={onNext}
        disabled={!canNext}
        hitSlop={8}
        style={[
          styles.navArrow,
          { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
          !canNext && { opacity: 0.35 },
        ]}
      >
        <Feather name="chevron-right" size={20} color={theme.onSurface} />
      </Pressable>
    </View>
  );
}

function ResetMonthButton({ theme, onReset, monthKey, t }: any) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setArmed(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [monthKey]);

  const press = () => {
    if (!armed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3500);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    onReset();
  };

  return (
    <Pressable
      testID={`reset-month-${monthKey}`}
      onPress={press}
      hitSlop={8}
      style={[
        styles.resetBtn,
        armed
          ? { backgroundColor: theme.danger }
          : { backgroundColor: "rgba(192,69,59,0.12)" },
      ]}
    >
      <Feather name={armed ? "alert-triangle" : "trash-2"} size={13} color={armed ? "#FFFFFF" : theme.danger} />
      {armed ? <Text style={styles.resetBtnText}>{t("erase_q")}</Text> : null}
    </Pressable>
  );
}

function MonthHeader({ theme, section, fmt, t }: any) {
  const positive = section.balance >= 0;

  const shareMonth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await shareMonthPdf({
        title: section.title,
        salary: section.salary,
        income: section.income,
        expenses: section.expenses,
        balance: section.balance,
        breakdown: section.breakdown,
        items: section.allItems,
        accent: theme.accentColor,
        fmt,
      });
    } catch {}
  };

  return (
    <View style={styles.monthHeader} testID={`month-section-${section.key}`}>
      <View style={styles.monthTitleRow}>
        <Text
          testID={`month-balance-${section.key}`}
          style={[styles.monthBalance, { color: positive ? theme.accentColor : theme.danger, fontFamily: FONTS.display }]}
        >
          {fmt(section.balance)}
        </Text>
        <Pressable
          testID={`share-month-${section.key}`}
          onPress={shareMonth}
          hitSlop={8}
          style={[styles.shareBtn, { backgroundColor: theme.brandTertiary }]}
        >
          <Feather name="share-2" size={15} color={theme.accentColor} />
        </Pressable>
      </View>
      <View style={[styles.monthSummary, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
        <MiniStat theme={theme} label={t("salary_label")} value={fmt(section.salary)} tint={theme.onSurface} />
        <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />
        <MiniStat theme={theme} label={t("income_label")} value={fmt(section.income)} tint={theme.success} />
        <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />
        <MiniStat theme={theme} label={t("expenses_label")} value={fmt(section.expenses)} tint={theme.danger} />
      </View>
    </View>
  );
}

function MiniStat({ theme, label, value, tint }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniLabel, { color: theme.onSurfaceMuted }]}>{label}</Text>
      <Text style={[styles.miniValue, { color: tint, fontFamily: FONTS.display }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { marginBottom: SPACING.md, flexDirection: "row", alignItems: "flex-start" },
  yearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 0.5,
    marginTop: SPACING.sm,
  },
  yearBtnText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  kicker: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: { fontSize: 34, fontWeight: "500" },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, marginTop: 4 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  navArrow: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  navCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  navTitle: { fontSize: 22, fontWeight: "500", textAlign: "center" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    minWidth: 28,
    paddingHorizontal: 7,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
  },
  resetBtnText: { fontFamily: FONTS.body, fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  monthHeader: { marginBottom: SPACING.lg },
  monthTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  monthBalance: { fontSize: 26, fontWeight: "500" },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  monthSummary: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    paddingVertical: SPACING.md,
  },
  miniStat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  miniLabel: { fontFamily: FONTS.body, fontSize: 11, marginBottom: 4 },
  miniValue: { fontSize: 16, fontWeight: "500" },
  miniDivider: { width: 0.5 },
  columns: { flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" },
  groupCard: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    padding: SPACING.md,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: 6 },
  groupIcon: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  groupTotals: { gap: 0, marginBottom: SPACING.sm },
  groupTotal: { fontSize: 18, fontWeight: "500" },
  groupDivider: { height: 0.5, marginBottom: 2 },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  entryDesc: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  entryAmount: { fontSize: 15, fontWeight: "500", marginTop: 2 },
  entryDelete: { padding: 4 },
  fab: {
    position: "absolute",
    right: SPACING.lg,
    width: 58,
    height: 58,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 6px 12px rgba(0,0,0,0.2)",
    elevation: 6,
  },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 22, fontWeight: "500", marginBottom: SPACING.xs },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
