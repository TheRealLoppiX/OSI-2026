import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Colors } from "../src/styles/colors";

export default function FormsWebView() {
  const { url, titulo } = useLocalSearchParams();

  if (!url) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color={Colors.textLight}
        />
        <Text style={{ marginTop: 10 }}>Link do simulado não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text
            style={{ color: Colors.primary, fontWeight: "bold", marginTop: 10 }}
          >
            Voltar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {titulo || "Simulado Externo"}
          </Text>
          <Text style={styles.subtitle}>Ambiente Seguro Google Forms</Text>
        </View>
      </View>

      <WebView
        source={{ uri: url as string }}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={{ marginTop: 10, color: Colors.textLight }}>
              Carregando Simulado...
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleContainer: { marginLeft: 15, flex: 1 },
  title: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  subtitle: { fontSize: 11, color: Colors.textLight },
  loader: {
    position: "absolute",
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
