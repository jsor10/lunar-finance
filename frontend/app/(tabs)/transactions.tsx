import React, { useMemo, useState } from "react";
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

type Filter = "all" | "expense" | "income";

export default function Transactions() {
  const { theme, transactions, deleteTransaction, fmt } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const filtered = useMemo(
    () => transactions.filter((t) => (filter === "all" ? true : t.type === filter)),
    [transactions, filter],
  );

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

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Expenses" },
    { key: "income", label: "Extra Income" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top + SPACING.md, backgroundColor: theme.surface }}>
        <Text style={[styles.title, { color: theme.onSurface, fontFamily: FONTS.display }]}>
          Activity
        </Text>
        <View style={styles.chipRow}>
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`filter-${c.key}`}
                onPress={() => setFilter(c.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.accentColor : theme.surfaceSecondary,
                    borderColor: active ? theme.accentColor : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? theme.onPrimary : theme.onSurfaceSecondary },
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
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
        defaultType={filter === "income" ? "income" : "expense"}
      />
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
        <Feather name={isExpense ? "arrow-down-left" : "arrow-up-right"} size={18} color={tint} />
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.rowTitle, { color: theme.onSurface }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[styles.rowType, { color: theme.onSurfaceMuted }]}>
          {isExpense ? "Expense" : "Extra Income"}
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
  title: {
    fontSize: 32,
    fontWeight: "500",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chipRow: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  chip: {
    height: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  chipText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
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
