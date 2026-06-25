import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../src/context/ThemeContext";

export default function FormsWebView() {
  const { url, titulo } = useLocalSearchParams();
  const { colors } = useTheme();

  if (!url) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={50} color={colors.textLight} />
        <Text style={{ marginTop: 10, color: colors.text }}>Link do simulado não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "bold", marginTop: 10 }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {titulo || "Simulado Externo"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>Ambiente Seguro Google Forms</Text>
        </View>
      </View>

      <WebView
        source={{ uri: url as string }}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loader, { backgroundColor: colors.bg }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ marginTop: 10, color: colors.textLight }}>Carregando Simulado...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  titleContainer: { marginLeft: 15, flex: 1 },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 11 },
  loader: {
    position: "absolute",
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
