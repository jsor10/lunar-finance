import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp, Goal } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";
import { GoalSheet } from "@/src/components/GoalSheet";
import { SheetModal } from "@/src/components/SheetModal";

export default function Savings() {
  const { theme, goals, fmt, t } = useApp();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setSheetOpen(true);
  };

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
          <Text style={[styles.kicker, { color: theme.accentColor }]}>{t("savings_kicker")}</Text>
          <Text style={[styles.title, { color: theme.onSurface, fontFamily: FONTS.display }]}>
            {t("savings_title")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceMuted }]}>{t("savings_sub")}</Text>
        </View>

        {goals.length > 0 ? (
          <View style={[styles.totalCard, { backgroundColor: theme.primaryBg }]}>
            <Text style={[styles.totalLabel, { color: theme.onPrimaryMuted ?? "rgba(255,255,255,0.7)" }]}>
              {t("total_saved")}
            </Text>
            <Text
              testID="savings-total"
              style={[styles.totalValue, { color: theme.onPrimary, fontFamily: FONTS.display }]}
            >
              {fmt(totalSaved)}
            </Text>
          </View>
        ) : null}

        {goals.length === 0 ? (
          <View style={styles.empty} testID="savings-empty">
            <View style={[styles.emptyIcon, { backgroundColor: theme.brandTertiary }]}>
              <Feather name="target" size={26} color={theme.accentColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
              {t("no_goals_title")}
            </Text>
            <Text style={[styles.emptyText, { color: theme.onSurfaceMuted }]}>
              {t("no_goals_text")}
            </Text>
          </View>
        ) : (
          goals.map((g) => {
            const pct = Math.min(g.saved / g.target, 1);
            return (
              <View
                key={g.id}
                testID={`savings-goal-${g.id}`}
                style={[styles.goalCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              >
                <View style={styles.goalTop}>
                  <View style={[styles.goalIcon, { backgroundColor: theme.brandTertiary }]}>
                    <Feather name="target" size={16} color={theme.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: theme.onSurface }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={[styles.goalSub, { color: theme.onSurfaceMuted }]}>
                      {fmt(g.saved)} {t("saved_of")} {fmt(g.target)}
                    </Text>
                  </View>
                  <Text style={[styles.goalPct, { color: theme.accentColor, fontFamily: FONTS.display }]}>
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme.surfaceTertiary }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: theme.accentColor, width: `${pct * 100}%` },
                    ]}
                  />
                </View>
                <View style={styles.goalActions}>
                  <Pressable
                    testID={`contribute-button-${g.id}`}
                    onPress={() => setContributing(g)}
                    style={({ pressed }) => [
                      styles.addMoneyBtn,
                      { backgroundColor: theme.primaryBg },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="plus" size={14} color={theme.onPrimary} />
                    <Text style={[styles.addMoneyText, { color: theme.onPrimary }]}>
                      {t("add_money")}
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`edit-goal-${g.id}`}
                    onPress={() => openEdit(g)}
                    hitSlop={8}
                    style={[styles.editBtn, { backgroundColor: theme.surfaceTertiary }]}
                  >
                    <Feather name="edit-2" size={15} color={theme.onSurfaceSecondary} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        testID="add-goal-fab"
        onPress={openNew}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primaryBg, bottom: insets.bottom + 78 },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Feather name="plus" size={26} color={theme.onPrimary} />
      </Pressable>

      <GoalSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} />
      <ContributeSheet goal={contributing} onClose={() => setContributing(null)} />
    </View>
  );
}

function ContributeSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { theme, contributeToGoal, currencySymbol, t } = useApp();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (goal) {
      setAmount("");
      const timer = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [goal]);

  const confirm = async () => {
    if (!goal) return;
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0) return;
    setBusy(true);
    try {
      await contributeToGoal(goal.id, num);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal
      visible={!!goal}
      onClose={onClose}
      title={goal?.name || ""}
      testID="contribute-sheet"
    >
      <Text style={[styles.hint, { color: theme.onSurfaceMuted }]}>{t("contribute_hint")}</Text>
      <View style={styles.amountWrap}>
        <Text style={[styles.symbol, { color: theme.accentColor }]}>{currencySymbol}</Text>
        <TextInput
          ref={ref}
          testID="contribute-amount-input"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.onSurfaceMuted}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: theme.onSurface, fontFamily: FONTS.display }]}
        />
      </View>
      <Pressable
        testID="contribute-confirm-button"
        onPress={confirm}
        disabled={busy}
        style={({ pressed }) => [
          styles.confirmBtn,
          { backgroundColor: theme.primaryBg },
          pressed && { opacity: 0.85 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.confirmText, { color: theme.onPrimary }]}>{t("add_funds_btn")}</Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { marginBottom: SPACING.lg },
  kicker: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: { fontSize: 34, fontWeight: "500" },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, marginTop: 4 },
  totalCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  totalLabel: { fontFamily: FONTS.body, fontSize: 11, letterSpacing: 2, fontWeight: "700", marginBottom: 4 },
  totalValue: { fontSize: 34, fontWeight: "500" },
  goalCard: {
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  goalTop: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  goalName: { fontFamily: FONTS.body, fontSize: 15, fontWeight: "700" },
  goalSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  goalPct: { fontSize: 22, fontWeight: "500" },
  track: { height: 8, borderRadius: RADIUS.pill, overflow: "hidden", marginBottom: SPACING.md },
  fill: { height: "100%", borderRadius: RADIUS.pill },
  goalActions: { flexDirection: "row", gap: SPACING.sm },
  addMoneyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: RADIUS.pill,
  },
  addMoneyText: { fontFamily: FONTS.body, fontSize: 14, fontWeight: "600" },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
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
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: SPACING.xl },
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
  hint: { fontFamily: FONTS.body, fontSize: 14, textAlign: "center", marginBottom: SPACING.lg },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  symbol: { fontFamily: FONTS.display, fontSize: 32, marginRight: SPACING.xs, fontWeight: "500" },
  amountInput: { fontSize: 48, fontWeight: "500", minWidth: 100, textAlign: "center" },
  confirmBtn: { height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
});
