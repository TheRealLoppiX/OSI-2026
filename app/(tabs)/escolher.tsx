import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";

export default function EscolherSimulado() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    <View style={styles.container}>
      <ScreenHeader title="Simulados OSI" showBack={false} />

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar por título ou matéria..."
          placeholderTextColor={colors.textMuted}
          value={busca}
          onChangeText={setBusca}
          accessibilityLabel="Buscar simulado por título ou matéria"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca("")} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={12}>
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
              accessibilityRole="button"
              accessibilityLabel={`${item.titulo}. ${item.materia || "Geral"}. ${item.url_google_forms ? "Abre no Google Forms" : "Simulado no app"}`}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: item.url_google_forms ? colors.warningSoft : colors.successSoft },
                ]}
              >
                <Ionicons
                  name={item.url_google_forms ? "logo-google" : "bulb-outline"}
                  size={26}
                  color={item.url_google_forms ? colors.warning : colors.primary}
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

    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
    borderWidth: 1,
    borderColor: c.border,
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
    backgroundColor: c.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  formsTagText: { fontSize: 10, color: c.warning, fontWeight: "bold" },
  nativeTag: {
    backgroundColor: c.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  nativeTagText: { fontSize: 10, color: c.success, fontWeight: "bold" },
});
