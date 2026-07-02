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

export function SalarySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, stats, setSalary, currencySymbol } = useApp();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(stats.salary ? String(stats.salary) : "");
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, stats.salary]);

  const save = async () => {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      await setSalary(num);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Monthly Salary" testID="salary-sheet">
      <Text style={[styles.hint, { color: theme.onSurfaceMuted }]}>
        Set your net monthly income. Everything recalculates instantly.
      </Text>
      <View style={styles.inputWrap}>
        <Text style={[styles.symbol, { color: theme.accentColor }]}>{currencySymbol}</Text>
        <TextInput
          ref={inputRef}
          testID="salary-input"
          value={value}
          onChangeText={setValue}
          placeholder="0.00"
          placeholderTextColor={theme.onSurfaceMuted}
          keyboardType="decimal-pad"
          style={[styles.input, { color: theme.onSurface, fontFamily: FONTS.display }]}
        />
      </View>
      <Pressable
        testID="salary-save-button"
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
          <Text style={[styles.btnText, { color: theme.onPrimary }]}>Save Salary</Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: FONTS.body, fontSize: 14, textAlign: "center", marginBottom: SPACING.xl },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  symbol: { fontFamily: FONTS.display, fontSize: 40, marginRight: SPACING.xs, fontWeight: "500" },
  input: { fontSize: 56, fontWeight: "500", minWidth: 120, textAlign: "center" },
  btn: {
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
});
