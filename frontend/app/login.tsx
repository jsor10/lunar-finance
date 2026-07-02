import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { FONTS, SPACING, RADIUS } from "@/src/theme/fonts";

const HERO =
  "https://images.unsplash.com/photo-1637625854255-d893202554f4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGx1eHVyeSUyMG1pbmltYWxpc3QlMjBiYWNrZ3JvdW5kfGVufDB8fHx3aGl0ZXwxNzgzMDI3MjA4fDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login, authenticating, user, loading } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (!loading && user) router.replace("/(tabs)");
  }, [user, loading, router]);

  return (
    <View style={styles.container} testID="login-screen">
      <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient
        colors={["rgba(5,5,5,0)", "rgba(5,5,5,0.35)", "rgba(5,5,5,0.92)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom + SPACING.xl, minHeight: height }]}>
        <View style={styles.brandRow}>
          <View style={styles.badge}>
            <AntDesign name="wallet" size={22} color="#0B1F3B" />
          </View>
        </View>
        <Text style={styles.kicker}>PERSONAL FINANCE, REFINED</Text>
        <Text style={styles.title}>Salary{"\n"}Manager</Text>
        <Text style={styles.subtitle}>
          A calm, private space to master your monthly money with elegance.
        </Text>

        <Pressable
          testID="google-login-button"
          onPress={login}
          disabled={authenticating}
          style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }]}
        >
          {authenticating ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <>
              <AntDesign name="google" size={20} color="#121212" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.legal}>Secured by Google. We never see your password.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  content: { flex: 1, justifyContent: "flex-end", paddingHorizontal: SPACING.lg },
  brandRow: { marginBottom: SPACING.lg },
  badge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: FONTS.body,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 58,
    fontWeight: "500",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: FONTS.body,
    fontSize: 16,
    lineHeight: 24,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: "#FFFFFF",
    height: 56,
    borderRadius: RADIUS.pill,
  },
  googleText: { color: "#121212", fontFamily: FONTS.body, fontSize: 16, fontWeight: "600" },
  legal: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.md,
  },
});
