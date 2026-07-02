import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

import { SheetModal } from "@/src/components/SheetModal";
import { useApp, Transaction } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultType?: "expense" | "income";
};

export function TransactionSheet({ visible, onClose, editing, defaultType = "expense" }: Props) {
  const { theme, addTransaction, updateTransaction, currencySymbol } = useApp();
  const [type, setType] = useState<"expense" | "income">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setType(editing.type);
        setAmount(String(editing.amount));
        setDescription(editing.description);
      } else {
        setType(defaultType);
        setAmount("");
        setDescription("");
      }
      const t = setTimeout(() => amountRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, editing, defaultType]);

  const save = async () => {
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const payload = { type, amount: num, description: description.trim() };
      if (editing) await updateTransaction(editing.id, payload);
      else await addTransaction(payload);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={editing ? "Edit Entry" : "New Entry"}
      testID="transaction-sheet"
    >
      <View style={[styles.segment, { backgroundColor: theme.surfaceTertiary }]}>
        {(["expense", "income"] as const).map((t) => {
          const active = type === t;
          return (
            <Pressable
              key={t}
              testID={`type-toggle-${t}`}
              onPress={() => setType(t)}
              style={[
                styles.segmentItem,
                active && { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? theme.accentColor : theme.onSurfaceMuted },
                ]}
              >
                {t === "expense" ? "Expense" : "Extra Income"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inputWrap}>
        <Text style={[styles.symbol, { color: theme.accentColor }]}>{currencySymbol}</Text>
        <TextInput
          ref={amountRef}
          testID="amount-input"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.onSurfaceMuted}
          keyboardType="decimal-pad"
          style={[styles.amount, { color: theme.onSurface, fontFamily: FONTS.display }]}
        />
      </View>

      <TextInput
        testID="description-input"
        value={description}
        onChangeText={setDescription}
        placeholder="Description (e.g. Groceries, Freelance)"
        placeholderTextColor={theme.onSurfaceMuted}
        style={[
          styles.desc,
          {
            color: theme.onSurface,
            backgroundColor: theme.surfaceTertiary,
            fontFamily: FONTS.body,
          },
        ]}
      />

      <Pressable
        testID="transaction-save-button"
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: theme.primaryBg },
          pressed && { opacity: 0.85 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.btnText, { color: theme.onPrimary }]}>
            {editing ? "Save Changes" : "Add Entry"}
          </Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.xl,
  },
  segmentItem: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontFamily: FONTS.body, fontSize: 14, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  symbol: { fontFamily: FONTS.display, fontSize: 32, marginRight: SPACING.xs, fontWeight: "500" },
  amount: { fontSize: 48, fontWeight: "500", minWidth: 100, textAlign: "center" },
  desc: {
    height: 54,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.lg,
  },
  btn: { height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
});
