import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
};

export function SheetModal({ visible, onClose, title, children, testID }: Props) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.backdrop} onPress={onClose} testID="sheet-backdrop" />
        <View
          testID={testID}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surfaceSecondary,
              paddingBottom: insets.bottom + SPACING.lg,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          {title ? (
            <Text style={[styles.title, { color: theme.onSurface, fontFamily: FONTS.display }]}>
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 0.5,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: RADIUS.pill,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 26, fontWeight: "500", marginBottom: SPACING.lg },
});
