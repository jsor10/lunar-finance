import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SheetModal } from "@/src/components/SheetModal";
import { useApp, Transaction } from "@/src/context/AppContext";
import { PRESET_CATEGORIES, categoryIcon } from "@/src/constants/categories";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultType?: "expense" | "income";
};

type Chip = { name: string; icon: string; custom: boolean; id?: string };

export function TransactionSheet({ visible, onClose, editing, defaultType = "expense" }: Props) {
  const {
    theme,
    user,
    templates,
    addTransaction,
    updateTransaction,
    addCategory,
    deleteCategory,
    hideCategory,
    addTemplate,
    deleteTemplate,
    currencySymbol,
    t,
  } = useApp();
  const [type, setType] = useState<"expense" | "income">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [saveTpl, setSaveTpl] = useState(false);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setType(editing.type);
        setAmount(String(editing.amount));
        setDescription(editing.description);
        setCategory(editing.category || "Other");
      } else {
        setType(defaultType);
        setAmount("");
        setDescription("");
        setCategory("Other");
      }
      setAddingCat(false);
      setNewCat("");
      setSaveTpl(false);
      const t = setTimeout(() => amountRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, editing, defaultType]);

  const chips = useMemo<Chip[]>(() => {
    const hidden = user?.hidden_categories || [];
    const isHidden = (name: string) =>
      hidden.some((h) => h.name === name && h.type === type);
    const presets = PRESET_CATEGORIES[type]
      .filter((c) => !isHidden(c.name))
      .map((c) => ({ name: c.name, icon: c.icon, custom: false }));
    const customs = (user?.custom_categories || [])
      .filter((c) => c.type === type)
      .map((c) => ({ name: c.name, icon: categoryIcon(c.name), custom: true, id: c.id }));
    return [...presets, ...customs];
  }, [type, user?.custom_categories, user?.hidden_categories]);

  const switchType = (t: "expense" | "income") => {
    if (t === type) return;
    setType(t);
    setCategory("Other");
    setAddingCat(false);
  };

  const submitNewCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    try {
      await addCategory(name, type);
      setCategory(name);
      setAddingCat(false);
      setNewCat("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const removeChip = async (c: Chip) => {
    if (c.name === "Other") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (c.custom && c.id) await deleteCategory(c.id);
    else await hideCategory(c.name, type);
    if (category === c.name) setCategory("Other");
  };

  const quickAdd = async (tpl: (typeof templates)[number]) => {
    if (saving) return;
    setSaving(true);
    try {
      await addTransaction({
        type: tpl.type,
        amount: tpl.amount,
        description: tpl.description,
        category: tpl.category || "Other",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await deleteTemplate(id);
  };

  const save = async () => {
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const payload = { type, amount: num, description: description.trim(), category };
      if (editing) await updateTransaction(editing.id, payload);
      else {
        await addTransaction(payload);
        if (saveTpl) {
          try {
            await addTemplate(payload);
          } catch {}
        }
      }
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
      title={editing ? t("edit_entry") : t("new_entry")}
      testID="transaction-sheet"
    >
      {!editing && templates.length > 0 ? (
        <>
          <Text style={[styles.catLabel, { color: theme.onSurfaceMuted }]}>{t("quick_add")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.catScroll}
            contentContainerStyle={styles.catRow}
          >
            {templates.map((tpl) => (
              <Pressable
                key={tpl.id}
                testID={`template-chip-${tpl.id}`}
                onPress={() => quickAdd(tpl)}
                onLongPress={() => removeTemplate(tpl.id)}
                style={[
                  styles.tplChip,
                  { backgroundColor: theme.brandTertiary, borderColor: theme.border },
                ]}
              >
                <Feather
                  name={tpl.type === "expense" ? "arrow-down-left" : "arrow-up-right"}
                  size={12}
                  color={tpl.type === "expense" ? theme.danger : theme.success}
                />
                <Text style={[styles.tplChipText, { color: theme.onSurface }]} numberOfLines={1}>
                  {tpl.description}
                </Text>
                <Text style={[styles.tplChipAmt, { color: theme.accentColor, fontFamily: FONTS.display }]}>
                  {currencySymbol}
                  {tpl.amount}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={[styles.segment, { backgroundColor: theme.surfaceTertiary }]}>
        {(["expense", "income"] as const).map((opt) => {
          const active = type === opt;
          return (
            <Pressable
              key={opt}
              testID={`type-toggle-${opt}`}
              onPress={() => switchType(opt)}
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
                {opt === "expense" ? t("expense_word") : t("extra_income_word")}
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
        placeholder={t("desc_placeholder")}
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

      <Text style={[styles.catLabel, { color: theme.onSurfaceMuted }]}>{t("category_label")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.catScroll}
        contentContainerStyle={styles.catRow}
      >
        {chips.map((c) => {
          const active = category === c.name;
          return (
            <Pressable
              key={c.custom ? c.id : c.name}
              testID={`category-chip-${c.name}`}
              onPress={() => setCategory(c.name)}
              onLongPress={c.name !== "Other" ? () => removeChip(c) : undefined}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? theme.accentColor : theme.surfaceTertiary,
                  borderColor: active ? theme.accentColor : theme.border,
                },
              ]}
            >
              <Feather
                name={c.icon as any}
                size={13}
                color={active ? theme.onPrimary : theme.onSurfaceMuted}
              />
              <Text
                style={[
                  styles.catChipText,
                  { color: active ? theme.onPrimary : theme.onSurfaceSecondary },
                ]}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          testID="category-add-chip"
          onPress={() => setAddingCat(true)}
          style={[
            styles.catChip,
            {
              backgroundColor: "transparent",
              borderColor: theme.accentColor,
              borderStyle: "dashed",
            },
          ]}
        >
          <Feather name="plus" size={13} color={theme.accentColor} />
          <Text style={[styles.catChipText, { color: theme.accentColor }]}>{t("new_chip")}</Text>
        </Pressable>
      </ScrollView>

      {addingCat ? (
        <View style={styles.newCatRow}>
          <TextInput
            testID="new-category-input"
            value={newCat}
            onChangeText={setNewCat}
            placeholder={t("cat_name_placeholder")}
            placeholderTextColor={theme.onSurfaceMuted}
            autoFocus
            maxLength={30}
            onSubmitEditing={submitNewCat}
            style={[
              styles.newCatInput,
              {
                color: theme.onSurface,
                backgroundColor: theme.surfaceTertiary,
                fontFamily: FONTS.body,
              },
            ]}
          />
          <Pressable
            testID="new-category-save"
            onPress={submitNewCat}
            style={[styles.newCatBtn, { backgroundColor: theme.primaryBg }]}
          >
            <Feather name="check" size={18} color={theme.onPrimary} />
          </Pressable>
          <Pressable
            testID="new-category-cancel"
            onPress={() => {
              setAddingCat(false);
              setNewCat("");
            }}
            style={[styles.newCatBtn, { backgroundColor: theme.surfaceTertiary }]}
          >
            <Feather name="x" size={18} color={theme.onSurfaceMuted} />
          </Pressable>
        </View>
      ) : null}

      {!editing ? (
        <Pressable
          testID="save-as-template-toggle"
          onPress={() => setSaveTpl((v) => !v)}
          style={styles.tplToggle}
          hitSlop={6}
        >
          <Feather
            name={saveTpl ? "check-square" : "square"}
            size={18}
            color={saveTpl ? theme.accentColor : theme.onSurfaceMuted}
          />
          <Text style={[styles.tplToggleText, { color: theme.onSurfaceSecondary }]}>
            {t("save_as_template")}
          </Text>
        </Pressable>
      ) : null}

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
            {editing ? t("save_changes") : t("add_entry")}
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
  catLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  catScroll: { marginBottom: SPACING.lg, flexGrow: 0 },
  catRow: { gap: SPACING.sm, paddingRight: SPACING.md },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 0.5,
  },
  catChipText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  tplChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 0.5,
    maxWidth: 220,
  },
  tplChipText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  tplChipAmt: { fontSize: 14, fontWeight: "500" },
  tplToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tplToggleText: { fontFamily: FONTS.body, fontSize: 14, fontWeight: "500" },
  newCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  newCatInput: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
  },
  newCatBtn: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: { height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
});
