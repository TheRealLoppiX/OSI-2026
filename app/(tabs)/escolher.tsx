import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function EscolherSimulado() {
  const { pageReady } = useNavigationLoading();
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorVisible, setTutorVisible] = useState(false);

  useEffect(() => {
    fetchSimulados();
  }, []);

  const fetchSimulados = async () => {
    try {
      const { data, error } = await supabase.from("simulados").select("*");
      if (!error) setSimulados(data || []);
    } finally {
      setLoading(false);
      pageReady();
    }
  };

  const handleSimuladoPress = (item: any) => {
    if (item.url_google_forms) {
      router.push({
        pathname: "/webview",
        params: { url: item.url_google_forms, titulo: item.titulo },
      } as any);
    } else {
      router.push({
        pathname: "/simulado",
        params: { id: item.id },
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Simulados OSI</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={simulados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSimuladoPress(item)}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: item.url_google_forms
                      ? "#FEF9C3"
                      : "#DCFCE7",
                  },
                ]}
              >
                <Ionicons
                  name={item.url_google_forms ? "logo-google" : "bulb-outline"}
                  size={24}
                  color={item.url_google_forms ? Colors.accent : Colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.cardMateria}>
                    {item.materia || "Geral"}
                  </Text>
                  <View
                    style={
                      item.url_google_forms ? styles.formsTag : styles.nativeTag
                    }
                  >
                    <Text
                      style={
                        item.url_google_forms
                          ? styles.formsTagText
                          : styles.nativeTagText
                      }
                    >
                      {item.url_google_forms ? "Google Forms" : "Nativo"}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* BOTÃO FLUTUANTE GEMINI */}
      <TouchableOpacity
        style={styles.geminiFab}
        onPress={() => setTutorVisible(true)}
      >
        <MaterialCommunityIcons name="auto-fix" size={30} color="#fff" />
      </TouchableOpacity>

      {/* MODAL DO TUTOR IA */}
      <Modal
        visible={tutorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTutorVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTutorVisible(false)}
        >
          <View style={styles.tutorSheet}>
            <View style={styles.indicator} />

            <View style={styles.tutorHeaderRow}>
              <MaterialCommunityIcons
                name="auto-fix"
                size={28}
                color="#4F46E5"
              />
              <Text style={styles.tutorTitle}>OSIA</Text>
            </View>

            <Text style={styles.tutorSub}>A 'Sabedoria' da OSI</Text>

            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setTutorVisible(false);
                  router.push("/tutor/chat" as any);
                }}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: "#E0E7FF" }]}
                >
                  <Ionicons name="chatbubbles" size={26} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>Tirar Dúvidas</Text>
                  <Text style={styles.optionDesc}>
                    Explicações sobre conceitos
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setTutorVisible(false);
                  router.push("/tutor/gerador" as any);
                }}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: "#F0FDF4" }]}
                >
                  <Ionicons name="sparkles" size={26} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>Gerar Simulado</Text>
                  <Text style={styles.optionDesc}>
                    Treino focado em um tema
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setTutorVisible(false)}
            >
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    elevation: 3,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  cardMateria: { fontSize: 12, color: Colors.textLight },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  formsTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formsTagText: { fontSize: 10, color: "#C2410C", fontWeight: "bold" },
  nativeTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nativeTagText: { fontSize: 10, color: "#15803D", fontWeight: "bold" },
  geminiFab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  tutorSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    alignItems: "center",
  },
  indicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    marginBottom: 20,
  },
  tutorHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tutorTitle: { fontSize: 22, fontWeight: "bold", color: Colors.text },
  tutorSub: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 30,
  },
  optionsGrid: { width: "100%", gap: 15 },
  optionCard: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  optionLabel: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  optionDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  closeBtn: { marginTop: 25 },
  closeBtnText: { color: "#94A3B8", fontWeight: "bold" },
});
