import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

import { useApp } from "@/src/context/AppContext";

export default function Index() {
  const { loading, user, theme } = useApp();

  if (loading) {
    return (
      <View
        testID="boot-loading"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface }}
      >
        <ActivityIndicator color={theme.accentColor} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
