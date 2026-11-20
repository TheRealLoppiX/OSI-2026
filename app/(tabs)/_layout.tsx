import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { FONTES_LEGIVEIS } from "../../components/AppText";
import { useAccessibility } from "../../src/context/AccessibilityContext";
import { useTheme } from "../../src/context/ThemeContext";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { fontScale, legibleFont, motionReduced } = useAccessibility();
  // O rótulo da aba não passa pelo AppText; limita a escala para não quebrar a barra
  const escalaRotulo = Math.min(fontScale, 1.3);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        animation: motionReduced ? "none" : "shift",
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + 11 * escalaRotulo,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: legibleFont
          ? { fontSize: 11 * escalaRotulo, fontFamily: FONTES_LEGIVEIS.bold }
          : { fontSize: 11 * escalaRotulo, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="escolher"
        options={{
          title: "Simulados",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="osia"
        options={{
          title: "OSIA",
          tabBarAccessibilityLabel: "OSIA, tutora de inteligência artificial",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ranking"
        options={{
          title: "Ranking",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
