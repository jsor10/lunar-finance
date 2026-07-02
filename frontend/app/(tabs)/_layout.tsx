import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";

import { useApp } from "@/src/context/AppContext";
import { FONTS } from "@/src/theme/fonts";

export default function TabsLayout() {
  const { theme } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentColor,
        tabBarInactiveTintColor: theme.onSurfaceMuted,
        tabBarStyle: {
          backgroundColor: theme.surfaceSecondary,
          borderTopColor: theme.border,
          borderTopWidth: StyleWidth(),
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
        },
        tabBarLabelStyle: { fontFamily: FONTS.body, fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

function StyleWidth() {
  return 0.5;
}
