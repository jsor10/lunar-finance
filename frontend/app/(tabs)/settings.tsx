import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";
import { SheetModal } from "@/src/components/SheetModal";
import { ACCENT_LIST, ACCENT_META, CURRENCIES, CurrencyCode, Accent } from "@/src/theme/colors";
import { useCountdown, formatDuration } from "@/src/hooks/useCountdown";

export default function Settings() {
  const {
    theme,
    user,
    setMode,
    setAccent,
    setCurrency,
    updateName,
    logout,
    deleteAccount,
    setDeleteLock,
  } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [nameOpen, setNameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const lockRemaining = useCountdown(user?.delete_lock_until);

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: SPACING.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.onSurface, fontFamily: FONTS.display }]}>
          Settings
        </Text>

        {lockRemaining > 0 ? (
          <View style={[styles.lockBanner, { backgroundColor: theme.brandTertiary }]} testID="settings-lock-banner">
            <Feather name="lock" size={16} color={theme.danger} />
            <Text style={[styles.lockText, { color: theme.onSurface }]}>
              Deletion locked · {formatDuration(lockRemaining)}
            </Text>
          </View>
        ) : null}

        {/* Personal Information */}
        <SectionLabel theme={theme}>Personal Information</SectionLabel>
        <Card theme={theme}>
          <RowItem
            theme={theme}
            icon="user"
            label="Name"
            value={user?.name || "—"}
            action={
              <Pressable testID="edit-name-button" onPress={() => setNameOpen(true)} hitSlop={8}>
                <Feather name="edit-2" size={16} color={theme.accentColor} />
              </Pressable>
            }
          />
          <Divider theme={theme} />
          <RowItem theme={theme} icon="mail" label="Email" value={user?.email || "—"} />
          <Divider theme={theme} />
          <RowItem theme={theme} icon="lock" label="Password" value="•••••••• · Google" />
        </Card>

        {/* Interface Design */}
        <SectionLabel theme={theme}>Interface Design</SectionLabel>
        <Card theme={theme}>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: theme.brandTertiary }]}>
                <Feather name="moon" size={16} color={theme.accentColor} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.onSurface }]}>Dark Mode</Text>
            </View>
            <Switch
              testID="dark-mode-switch"
              value={theme.mode === "dark"}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode(v ? "dark" : "light");
              }}
              trackColor={{ true: theme.accentColor, false: theme.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Divider theme={theme} />
          <View style={styles.accentBlock}>
            <Text style={[styles.rowLabel, { color: theme.onSurface, marginBottom: SPACING.md }]}>
              Accent Color
            </Text>
            <View style={styles.accentRow}>
              {ACCENT_LIST.map((a: Accent) => {
                const active = theme.accent === a;
                const meta = ACCENT_META[a];
                return (
                  <Pressable
                    key={a}
                    testID={`accent-${a}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAccent(a);
                    }}
                    style={styles.accentItem}
                  >
                    <View
                      style={[
                        styles.accentCircle,
                        { backgroundColor: meta.swatch, borderColor: active ? theme.onSurface : "transparent" },
                      ]}
                    >
                      {active ? <Feather name="check" size={20} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={[styles.accentLabel, { color: theme.onSurfaceMuted }]} numberOfLines={1}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Currency */}
        <SectionLabel theme={theme}>Currency</SectionLabel>
        <Card theme={theme}>
          <View style={styles.currencyRow}>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => {
              const active = user?.currency === c;
              return (
                <Pressable
                  key={c}
                  testID={`currency-${c}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrency(c);
                  }}
                  style={[
                    styles.currencyItem,
                    {
                      backgroundColor: active ? theme.accentColor : theme.surfaceTertiary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: active ? theme.onPrimary : theme.onSurface, fontFamily: FONTS.display },
                    ]}
                  >
                    {CURRENCIES[c].symbol}
                  </Text>
                  <Text
                    style={[styles.currencyCode, { color: active ? theme.onPrimary : theme.onSurfaceMuted }]}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Account */}
        <SectionLabel theme={theme}>Account</SectionLabel>
        <Card theme={theme}>
          <Pressable testID="logout-button" onPress={doLogout} style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: theme.brandTertiary }]}>
                <Feather name="log-out" size={16} color={theme.accentColor} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.onSurface }]}>Log Out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.onSurfaceMuted} />
          </Pressable>
          <Divider theme={theme} />
          <Pressable
            testID="delete-account-button"
            disabled={lockRemaining > 0}
            onPress={() => setDeleteOpen(true)}
            style={[styles.rowItem, lockRemaining > 0 && { opacity: 0.5 }]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(192,69,59,0.12)" }]}>
                <Feather name="trash-2" size={16} color={theme.danger} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.danger }]}>
                {lockRemaining > 0 ? `Locked · ${formatDuration(lockRemaining)}` : "Delete Account"}
              </Text>
            </View>
            {lockRemaining > 0 ? (
              <Feather name="lock" size={16} color={theme.danger} />
            ) : (
              <Feather name="chevron-right" size={18} color={theme.onSurfaceMuted} />
            )}
          </Pressable>
        </Card>
      </ScrollView>

      <NameSheet
        visible={nameOpen}
        onClose={() => setNameOpen(false)}
        current={user?.name || ""}
        onSave={updateName}
      />
      <DeleteSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onLock={() => setDeleteLock(new Date(Date.now() + 10 * 60 * 1000).toISOString())}
        onConfirm={async () => {
          await deleteAccount();
          router.replace("/login");
        }}
      />
    </View>
  );
}

function NameSheet({ visible, onClose, current, onSave }: any) {
  const { theme } = useApp();
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(current);
      const t = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, current]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Edit Name" testID="name-sheet">
      <TextInput
        ref={ref}
        testID="name-input"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={theme.onSurfaceMuted}
        style={[
          styles.sheetInput,
          { color: theme.onSurface, backgroundColor: theme.surfaceTertiary, fontFamily: FONTS.body },
        ]}
      />
      <Pressable
        testID="name-save-button"
        onPress={save}
        disabled={saving}
        style={[styles.sheetBtn, { backgroundColor: theme.primaryBg }]}
      >
        {saving ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.sheetBtnText, { color: theme.onPrimary }]}>Save</Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

function DeleteSheet({ visible, onClose, onLock, onConfirm }: any) {
  const { theme } = useApp();
  const [text, setText] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [step, setStep] = useState<"verify" | "confirm">("verify");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setText("");
      setAttempts(0);
      setStep("verify");
    }
  }, [visible]);

  const verify = () => {
    if (text.trim().toUpperCase() === "DELETE") {
      setStep("confirm");
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (next >= 4) {
      onLock();
      onClose();
    }
    setText("");
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const remainingAttempts = Math.max(0, 3 - attempts);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={step === "verify" ? "Delete Account" : "Are you sure?"}
      testID="delete-sheet"
    >
      {step === "verify" ? (
        <>
          <Text style={[styles.deleteHint, { color: theme.onSurfaceMuted }]}>
            This permanently erases your salary, entries and settings. Type{" "}
            <Text style={{ color: theme.danger, fontWeight: "700" }}>DELETE</Text> to continue.
          </Text>
          <TextInput
            testID="delete-confirm-input"
            value={text}
            onChangeText={setText}
            autoCapitalize="characters"
            placeholder="DELETE"
            placeholderTextColor={theme.onSurfaceMuted}
            style={[
              styles.sheetInput,
              { color: theme.onSurface, backgroundColor: theme.surfaceTertiary, fontFamily: FONTS.body },
            ]}
          />
          {attempts > 0 ? (
            <Text style={[styles.attemptsText, { color: theme.danger }]} testID="delete-attempts">
              Incorrect. {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left before a 10-minute lock.
            </Text>
          ) : null}
          <Pressable
            testID="delete-verify-button"
            onPress={verify}
            style={[styles.sheetBtn, { backgroundColor: theme.danger }]}
          >
            <Text style={[styles.sheetBtnText, { color: "#FFFFFF" }]}>Verify</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.deleteHint, { color: theme.onSurfaceMuted }]}>
            This cannot be undone. All your data will be permanently deleted.
          </Text>
          <Pressable
            testID="delete-final-button"
            onPress={confirm}
            disabled={busy}
            style={[styles.sheetBtn, { backgroundColor: theme.danger }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.sheetBtnText, { color: "#FFFFFF" }]}>Delete Permanently</Text>
            )}
          </Pressable>
          <Pressable testID="delete-cancel-button" onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.onSurfaceSecondary }]}>Cancel</Text>
          </Pressable>
        </>
      )}
    </SheetModal>
  );
}

function SectionLabel({ theme, children }: any) {
  return <Text style={[styles.sectionLabel, { color: theme.onSurfaceMuted }]}>{children}</Text>;
}
function Card({ theme, children }: any) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
      {children}
    </View>
  );
}
function Divider({ theme }: any) {
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}
function RowItem({ theme, icon, label, value, action }: any) {
  return (
    <View style={styles.rowItem}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, { backgroundColor: theme.brandTertiary }]}>
          <Feather name={icon} size={16} color={theme.accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.onSurface }]}>{label}</Text>
          <Text style={[styles.rowValue, { color: theme.onSurfaceMuted }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 32, fontWeight: "500", marginBottom: SPACING.lg },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  lockText: { fontFamily: FONTS.body, fontSize: 13, fontWeight: "600" },
  sectionLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  card: { borderRadius: RADIUS.md, borderWidth: 0.5, paddingHorizontal: SPACING.md },
  divider: { height: 0.5, marginLeft: 52 },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flex: 1 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontFamily: FONTS.body, fontSize: 15, fontWeight: "600" },
  rowValue: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  accentBlock: { paddingVertical: SPACING.md },
  accentRow: { flexDirection: "row", justifyContent: "space-between" },
  accentItem: { alignItems: "center", flex: 1 },
  accentCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: SPACING.sm,
  },
  accentLabel: { fontFamily: FONTS.body, fontSize: 11 },
  currencyRow: { flexDirection: "row", gap: SPACING.sm, paddingVertical: SPACING.md },
  currencyItem: {
    flex: 1,
    height: 72,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: { fontSize: 26, fontWeight: "500" },
  currencyCode: { fontFamily: FONTS.body, fontSize: 12, fontWeight: "600", marginTop: 2 },
  sheetInput: {
    height: 54,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.lg,
  },
  sheetBtn: { height: 56, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  sheetBtnText: { fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
  deleteHint: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, marginBottom: SPACING.lg },
  attemptsText: { fontFamily: FONTS.body, fontSize: 13, marginBottom: SPACING.md },
  cancelBtn: { alignItems: "center", paddingVertical: SPACING.md, marginTop: SPACING.sm },
  cancelText: { fontFamily: FONTS.body, fontSize: 15, fontWeight: "600" },
});
