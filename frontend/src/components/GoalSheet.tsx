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
import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

export function GoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, user, setGoal, deleteGoal, currencySymbol } = useApp();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(user?.goal?.name || "");
      setTarget(user?.goal?.target ? String(user.goal.target) : "");
      const t = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, user?.goal]);

  const save = async () => {
    const num = parseFloat(target.replace(",", "."));
    if (!name.trim() || isNaN(num) || num <= 0) return;
    setSaving(true);
    try {
      await setGoal(name.trim(), num);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async () => {
    setSaving(true);
    try {
      await deleteGoal();
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
      title={user?.goal ? "Edit Savings Goal" : "Savings Goal"}
      testID="goal-sheet"
    >
      <Text style={[styles.hint, { color: theme.onSurfaceMuted }]}>
        Every month&apos;s leftover balance counts toward your goal.
      </Text>
      <TextInput
        ref={nameRef}
        testID="goal-name-input"
        value={name}
        onChangeText={setName}
        placeholder="Goal name (e.g. Trip to Japan)"
        placeholderTextColor={theme.onSurfaceMuted}
        maxLength={40}
        style={[
          styles.input,
          { color: theme.onSurface, backgroundColor: theme.surfaceTertiary, fontFamily: FONTS.body },
        ]}
      />
      <View style={styles.amountWrap}>
        <Text style={[styles.symbol, { color: theme.accentColor }]}>{currencySymbol}</Text>
        <TextInput
          testID="goal-target-input"
          value={target}
          onChangeText={setTarget}
          placeholder="0.00"
          placeholderTextColor={theme.onSurfaceMuted}
          keyboardType="decimal-pad"
          style={[styles.amount, { color: theme.onSurface, fontFamily: FONTS.display }]}
        />
      </View>
      <Pressable
        testID="goal-save-button"
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
          <Text style={[styles.btnText, { color: theme.onPrimary }]}>Save Goal</Text>
        )}
      </Pressable>
      {user?.goal ? (
        <Pressable testID="goal-delete-button" onPress={removeGoal} style={styles.deleteBtn}>
          <Text style={[styles.deleteText, { color: theme.danger }]}>Remove Goal</Text>
        </Pressable>
      ) : null}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: FONTS.body, fontSize: 14, textAlign: "center", marginBottom: SPACING.lg },
  input: {
    height: 54,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.lg,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  symbol: { fontFamily: FONTS.display, fontSize: 32, marginRight: SPACING.xs, fontWeight: "500" },
  amount: { fontSize: 48, fontWeight: "500", minWidth: 100, textAlign: "center" },
  btn: { height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
  deleteBtn: { alignItems: "center", paddingVertical: SPACING.md, marginTop: SPACING.xs },
  deleteText: { fontFamily: FONTS.body, fontSize: 14, fontWeight: "600" },
});
