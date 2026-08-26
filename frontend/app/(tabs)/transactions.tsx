import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function Transactions() {
  const { theme, transactions, deleteTransaction, deleteMonth, fmt, stats } = useApp();
  const insets = useSafeAreaInsets();
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
          title: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
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
      .map((m) => ({
        key: m.key,
        title: m.title,
        year: m.year,
        month1: m.month1,
        salary: stats.salary,
        income: m.income,
        expenses: m.expenses,
        balance: stats.salary + m.income - m.expenses,
        breakdown: Array.from(m.cats.values()).sort(
          (a, b) => b.expense + b.income - (a.expense + a.income),
        ),
        allItems: m.all,
      }));
  }, [transactions, stats.salary]);

  const trend = useMemo(
    () =>
      months.map((m) => ({
        key: m.key,
        label: new Date(m.year, m.month1 - 1, 1).toLocaleString("en-US", { month: "short" }),
        balance: m.balance,
      })),
    [months],
  );

  let idx = selectedKey ? months.findIndex((m) => m.key === selectedKey) : -1;
  if (idx === -1) idx = months.length - 1; // default: latest month
  const current = idx >= 0 ? months[idx] : null;

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

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top + SPACING.md, backgroundColor: theme.surface }}>
        <View style={styles.pageHeader}>
          <Text style={[styles.kicker, { color: theme.accentColor }]}>YOUR MONEY</Text>
          <Text style={[styles.title, { color: theme.onSurface, fontFamily: FONTS.display }]}>
            Activity
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceMuted }]}>
            Expenses & extra income, month by month
          </Text>
        </View>
      </View>

      <FlatList
        data={current ? current.allItems : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {trend.length >= 2 ? <BalanceTrend trend={trend} theme={theme} fmt={fmt} /> : null}
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
                />
                <MonthHeader theme={theme} section={current} fmt={fmt} />
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !current ? (
            <View style={styles.empty} testID="transactions-empty">
              <View style={[styles.emptyIcon, { backgroundColor: theme.brandTertiary }]}>
                <Feather name="inbox" size={26} color={theme.accentColor} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
                No entries yet
              </Text>
              <Text style={[styles.emptyText, { color: theme.onSurfaceMuted }]}>
                Tap the + button to add your first expense or extra income.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Row theme={theme} item={item} fmt={fmt} onEdit={openEdit} onDelete={remove} />
        )}
      />

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

function MonthNav({ theme, title, canPrev, canNext, onPrev, onNext, onReset, monthKey }: any) {
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
        <ResetMonthButton theme={theme} onReset={onReset} monthKey={monthKey} />
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

function ResetMonthButton({ theme, onReset, monthKey }: any) {
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
      {armed ? <Text style={styles.resetBtnText}>Erase?</Text> : null}
    </Pressable>
  );
}

function MonthHeader({ theme, section, fmt }: any) {
  const positive = section.balance >= 0;
  const [showBreakdown, setShowBreakdown] = useState(false);

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
        <MiniStat theme={theme} label="Salary" value={fmt(section.salary)} tint={theme.onSurface} />
        <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />
        <MiniStat theme={theme} label="Income" value={fmt(section.income)} tint={theme.success} />
        <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />
        <MiniStat theme={theme} label="Expenses" value={fmt(section.expenses)} tint={theme.danger} />
      </View>
      {section.breakdown.length > 0 ? (
        <>
          <Pressable
            testID={`breakdown-toggle-${section.key}`}
            onPress={() => setShowBreakdown((v) => !v)}
            style={styles.breakdownToggle}
            hitSlop={6}
          >
            <Text style={[styles.breakdownToggleText, { color: theme.onSurfaceMuted }]}>
              Category breakdown
            </Text>
            <Feather
              name={showBreakdown ? "chevron-up" : "chevron-down"}
              size={15}
              color={theme.onSurfaceMuted}
            />
          </Pressable>
          {showBreakdown ? (
            <View
              testID={`breakdown-card-${section.key}`}
              style={[styles.breakdownCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            >
              {section.breakdown.map((c: any) => (
                <View key={c.name} style={styles.breakdownRow}>
                  <View style={[styles.breakdownIcon, { backgroundColor: theme.brandTertiary }]}>
                    <Feather name={categoryIcon(c.name) as any} size={13} color={theme.accentColor} />
                  </View>
                  <Text style={[styles.breakdownName, { color: theme.onSurfaceSecondary }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.income > 0 ? (
                    <Text style={[styles.breakdownAmt, { color: theme.success, fontFamily: FONTS.display }]}>
                      +{fmt(c.income)}
                    </Text>
                  ) : null}
                  {c.expense > 0 ? (
                    <Text style={[styles.breakdownAmt, { color: theme.danger, fontFamily: FONTS.display }]}>
                      -{fmt(c.expense)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
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

function Row({ theme, item, fmt, onEdit, onDelete }: any) {
  const isExpense = item.type === "expense";
  const tint = isExpense ? theme.danger : theme.success;
  return (
    <Pressable
      testID={`transaction-row-${item.id}`}
      onPress={() => onEdit(item)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.brandTertiary }]}>
        <Feather name={categoryIcon(item.category) as any} size={18} color={tint} />
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.rowTitle, { color: theme.onSurface }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[styles.rowType, { color: theme.onSurfaceMuted }]}>
          {item.category || "Other"} · {isExpense ? "Expense" : "Extra Income"}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: tint, fontFamily: FONTS.display }]}>
        {isExpense ? "-" : "+"}
        {fmt(item.amount).replace("-", "")}
      </Text>
      <Pressable
        testID={`delete-transaction-${item.id}`}
        onPress={() => onDelete(item)}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <Feather name="trash-2" size={17} color={theme.onSurfaceMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs },
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
  monthHeader: { marginBottom: SPACING.sm },
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
  breakdownToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  breakdownToggleText: { fontFamily: FONTS.body, fontSize: 12, fontWeight: "600" },
  breakdownCard: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: 7,
  },
  breakdownIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownName: { flex: 1, fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  breakdownAmt: { fontSize: 15, fontWeight: "500", marginLeft: SPACING.sm },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, gap: SPACING.md },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMid: { flex: 1 },
  rowTitle: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
  rowType: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 20, fontWeight: "500" },
  deleteBtn: { padding: SPACING.xs },
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
