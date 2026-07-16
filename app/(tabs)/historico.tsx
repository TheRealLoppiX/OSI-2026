import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { authService } from "../../src/services/auth";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";

function corPorcentagem(pct: number) {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#3B82F6";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

export default function Historico() {
  const { colors } = useTheme();
  const [tentativas, setTentativas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const user = await authService.getUser();
      if (!user?.id) return;

      const { data } = await supabase
        .from("tentativas")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });

      setTentativas(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalAcertos = tentativas.reduce((s, t) => s + t.acertos, 0);
  const totalQuestoes = tentativas.reduce((s, t) => s + t.total, 0);
  const mediaGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Histórico</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tentativas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          ListHeaderComponent={
            tentativas.length > 0 ? (
              <View style={[styles.resumoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.resumoItem}>
                  <Text style={[styles.resumoNum, { color: colors.primary }]}>{tentativas.length}</Text>
                  <Text style={[styles.resumoLabel, { color: colors.textLight }]}>Simulados</Text>
                </View>
                <View style={[styles.resumoItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <Text style={[styles.resumoNum, { color: corPorcentagem(mediaGeral) }]}>{mediaGeral}%</Text>
                  <Text style={[styles.resumoLabel, { color: colors.textLight }]}>Média geral</Text>
                </View>
                <View style={[styles.resumoItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <Text style={[styles.resumoNum, { color: "#10B981" }]}>{totalAcertos}</Text>
                  <Text style={[styles.resumoLabel, { color: colors.textLight }]}>Acertos</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={56} color="#CBD5E1" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum simulado ainda</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Complete um simulado para ver seu histórico aqui.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pct = Math.round((item.acertos / item.total) * 100);
            const cor = corPorcentagem(pct);
            const data = new Date(item.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric",
            });
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.scoreBadge, { backgroundColor: cor + "20" }]}>
                  <Text style={[styles.scoreText, { color: cor }]}>{pct}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.titulo}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.textLight }]}>
                    {item.acertos}/{item.total} acertos · {data}
                  </Text>
                  <View style={styles.barraFundo}>
                    <View style={[styles.barraPreenchimento, { width: `${pct}%`, backgroundColor: cor }]} />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  resumoCard: {
    flexDirection: "row",
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  resumoItem: { flex: 1, padding: 18, alignItems: "center" },
  resumoNum: { fontSize: 22, fontWeight: "900" },
  resumoLabel: { fontSize: 11, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
  },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: { fontWeight: "900", fontSize: 16 },
  cardTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 6 },
  barraFundo: { height: 4, backgroundColor: "#E2E8F0", borderRadius: 2 },
  barraPreenchimento: { height: "100%", borderRadius: 2 },
  empty: { alignItems: "center", marginTop: 80, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
