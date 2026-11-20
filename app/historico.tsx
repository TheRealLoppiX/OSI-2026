import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import { authService } from "../src/services/auth";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../src/context/ThemeContext";
import { supabase } from "../src/services/supabase";

import { faixaDesempenho } from "../src/utils/desempenho";

export default function Historico() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tentativas, setTentativas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const user = await authService.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("tentativas")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Erro ao carregar histórico:", error);
      setTentativas(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalAcertos = tentativas.reduce((s, t) => s + t.acertos, 0);
  const totalQuestoes = tentativas.reduce((s, t) => s + t.total, 0);
  const mediaGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Histórico" />

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
                  <Text style={[styles.resumoNum, { color: faixaDesempenho(mediaGeral, colors).cor }]}>{mediaGeral}%</Text>
                  <Text style={[styles.resumoLabel, { color: colors.textLight }]}>Média geral</Text>
                </View>
                <View style={[styles.resumoItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <Text style={[styles.resumoNum, { color: colors.success }]}>{totalAcertos}</Text>
                  <Text style={[styles.resumoLabel, { color: colors.textLight }]}>Acertos</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum simulado ainda</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Complete um simulado para ver seu histórico aqui.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pct = Math.round((item.acertos / item.total) * 100);
            const faixa = faixaDesempenho(pct, colors);
            const cor = faixa.cor;
            const data = new Date(item.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric",
            });
            return (
              <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessible
                accessibilityLabel={`${item.titulo}. ${pct}% de acerto, ${item.acertos} de ${item.total} questões. ${faixa.label}. ${data}`}
              >
                <View style={[styles.scoreBadge, { backgroundColor: faixa.bg, borderColor: cor }]}>
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

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: { fontWeight: "900", fontSize: 16 },
  cardTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 6 },
  barraFundo: { height: 4, backgroundColor: c.surfaceAlt, borderRadius: 2 },
  barraPreenchimento: { height: "100%", borderRadius: 2 },
  empty: { alignItems: "center", marginTop: 80, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
