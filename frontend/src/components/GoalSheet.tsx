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
import { useApp, Goal } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  editing?: Goal | null;
};

export function GoalSheet({ visible, onClose, editing }: Props) {
  const { theme, createGoal, updateGoal, removeGoal, currencySymbol, t } = useApp();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(editing?.name || "");
      setTarget(editing?.target ? String(editing.target) : "");
      const timer = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [visible, editing]);

  const save = async () => {
    const num = parseFloat(target.replace(",", "."));
    if (!name.trim() || isNaN(num) || num <= 0) return;
    setSaving(true);
    try {
      if (editing) await updateGoal(editing.id, name.trim(), num);
      else await createGoal(name.trim(), num);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await removeGoal(editing.id);
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
      title={editing ? t("edit_goal_title") : t("new_goal_title")}
      testID="goal-sheet"
    >
      <Text style={[styles.hint, { color: theme.onSurfaceMuted }]}>{t("goal_hint")}</Text>
      <TextInput
        ref={nameRef}
        testID="goal-name-input"
        value={name}
        onChangeText={setName}
        placeholder={t("goal_name_ph")}
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
          <Text style={[styles.btnText, { color: theme.onPrimary }]}>{t("save_goal")}</Text>
        )}
      </Pressable>
      {editing ? (
        <Pressable testID="goal-delete-button" onPress={remove} style={styles.deleteBtn}>
          <Text style={[styles.deleteText, { color: theme.danger }]}>{t("remove_goal")}</Text>
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
