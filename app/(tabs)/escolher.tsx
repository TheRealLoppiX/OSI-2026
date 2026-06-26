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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";

export default function EscolherSimulado() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorVisible, setTutorVisible] = useState(false);
  const [busca, setBusca] = useState("");

  const simuladosFiltrados = busca.trim()
    ? simulados.filter((s) =>
        s.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        s.materia?.toLowerCase().includes(busca.toLowerCase())
      )
    : simulados;

  useEffect(() => {
    fetchSimulados();
  }, []);

  const fetchSimulados = async () => {
    try {
      const { data, error } = await supabase
        .from("simulados")
        .select("*")
        .order("created_at", { ascending: false });
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Simulados OSI</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar por título ou matéria..."
          placeholderTextColor={colors.textLight}
          value={busca}
          onChangeText={setBusca}
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca("")}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={simuladosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => handleSimuladoPress(item)}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: item.url_google_forms ? "#FEF9C3" : "#DCFCE7" },
                ]}
              >
                <Ionicons
                  name={item.url_google_forms ? "logo-google" : "bulb-outline"}
                  size={26}
                  color={item.url_google_forms ? "#CA8A04" : colors.primary}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {item.titulo}
              </Text>
              <Text style={[styles.cardMateria, { color: colors.textLight }]} numberOfLines={1}>
                {item.materia || "Geral"}
              </Text>
              <View style={item.url_google_forms ? styles.formsTag : styles.nativeTag}>
                <Text style={item.url_google_forms ? styles.formsTagText : styles.nativeTagText}>
                  {item.url_google_forms ? "Google Forms" : "Nativo"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* BOTÃO FLUTUANTE OSIA */}
      <TouchableOpacity style={styles.geminiFab} onPress={() => setTutorVisible(true)}>
        <MaterialCommunityIcons name="auto-fix" size={30} color="#fff" />
      </TouchableOpacity>

      {/* MODAL DO TUTOR IA */}
      <Modal
        visible={tutorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTutorVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTutorVisible(false)}>
          <View style={[styles.tutorSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.indicator, { backgroundColor: colors.border }]} />

            <View style={styles.tutorHeaderRow}>
              <MaterialCommunityIcons name="auto-fix" size={28} color="#4F46E5" />
              <Text style={[styles.tutorTitle, { color: colors.text }]}>OSIA</Text>
            </View>

            <Text style={[styles.tutorSub, { color: colors.textLight }]}>A 'Sabedoria' da OSI</Text>

            {/* GRADE 2 COLUNAS */}
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => {
                  setTutorVisible(false);
                  router.push("/tutor/chat" as any);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#E0E7FF" }]}>
                  <Ionicons name="chatbubbles" size={26} color="#4F46E5" />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Tirar Dúvidas</Text>
                <Text style={[styles.optionDesc, { color: colors.textLight }]}>
                  Explicações sobre conceitos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => {
                  setTutorVisible(false);
                  router.push("/tutor/gerador" as any);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="sparkles" size={26} color="#16A34A" />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Gerar Simulado</Text>
                <Text style={[styles.optionDesc, { color: colors.textLight }]}>
                  Treino focado em um tema
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setTutorVisible(false)}>
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  columnWrapper: { gap: 12 },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    gap: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "bold", lineHeight: 20 },
  cardMateria: { fontSize: 12 },
  formsTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  formsTagText: { fontSize: 10, color: "#C2410C", fontWeight: "bold" },
  nativeTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
  },
  indicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 20,
    alignSelf: "center",
  },
  tutorHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  tutorTitle: { fontSize: 22, fontWeight: "bold" },
  tutorSub: { fontSize: 14, textAlign: "center", marginTop: 5, marginBottom: 24 },
  optionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: { fontSize: 14, fontWeight: "bold" },
  optionDesc: { fontSize: 12, lineHeight: 16 },
  closeBtn: { marginTop: 20, alignItems: "center" },
  closeBtnText: { color: "#94A3B8", fontWeight: "bold" },
});
