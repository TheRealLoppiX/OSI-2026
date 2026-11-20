import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/AppText";
import { authService } from "../../src/services/auth";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";

// Cores de medalha são fixas em todos os temas; o número da posição vai junto
// porque cor sozinha não pode ser a única forma de distinguir 1º/2º/3º
const MEDALHAS = ["#FFD700", "#C0C0C0", "#CD7F32"];
import { supabase } from "../../src/services/supabase";

// Fallback usado apenas se a instituição não estiver cadastrada na tabela "instituicoes"
function siglaFallback(nome: string): string {
  const ignorar = new Set(["de", "da", "do", "dos", "das", "e", "a", "o", "em", "no", "na"]);
  const sigla = nome
    .split(" ")
    .filter((w) => w.length > 0 && !ignorar.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");

  return sigla || nome;
}

export default function RankingCompleto() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [aba, setAba] = useState<"individual" | "instituicao">("individual");
  const [siglasPorNome, setSiglasPorNome] = useState<Record<string, string>>({});

  const siglaInstituicao = (nome: string): string =>
    siglasPorNome[nome] || siglaFallback(nome);

  // Agrupa usuários por instituição somando os pontos de cada uma
  const rankingInstituicoes = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const u of ranking) {
      const inst = u.instituicao || "Sem instituição";
      mapa[inst] = (mapa[inst] || 0) + (u.pontuacao || 0);
    }
    return Object.entries(mapa)
      .sort(([, a], [, b]) => b - a)
      .map(([nome, total], i) => ({ nome, total, pos: i + 1 }));
  }, [ranking]);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, usuario, pontuacao, instituicao, avatar_url")
        .order("pontuacao", { ascending: false });

      if (!error && data) setRanking(data);

      const localUser = await authService.getUser();
      if (localUser) setCurrentUser(localUser);
    } catch (err) {
      console.error("Erro ao buscar ranking:", err);
    } finally {
      setLoading(false);
      pageReady();
    }
  };

  const fetchInstituicoes = async () => {
    const { data, error } = await supabase.from("instituicoes").select("nome, sigla");
    if (!error && data) {
      const mapa: Record<string, string> = {};
      for (const inst of data) {
        if (inst.sigla) mapa[inst.nome] = inst.sigla;
      }
      setSiglasPorNome(mapa);
    }
  };

  useEffect(() => {
    fetchRanking();
    fetchInstituicoes();
  }, []);

  const renderPodiumIcon = (index: number) => {
    if (index < 3) {
      return (
        <View style={styles.medalha}>
          <Ionicons name="trophy" size={22} color={MEDALHAS[index]} />
          <Text style={styles.medalhaNumero}>{index + 1}º</Text>
        </View>
      );
    }
    return <Text style={[styles.positionText, { color: colors.textLight }]}>#{index + 1}</Text>;
  };

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ranking OSI 2026" showBack={false} />

      {/* TABS */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tabBtn, aba === "individual" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setAba("individual")}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === "individual" }}
        >
          <Text style={[styles.tabText, { color: aba === "individual" ? colors.primary : colors.textLight }]}>
            Individual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aba === "instituicao" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setAba("instituicao")}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === "instituicao" }}
        >
          <Text style={[styles.tabText, { color: aba === "instituicao" ? colors.primary : colors.textLight }]}>
            Por Instituição
          </Text>
        </TouchableOpacity>
      </View>

      {aba === "instituicao" ? (
        <FlatList
          data={rankingInstituicoes}
          keyExtractor={(item) => item.nome}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View
              style={[styles.rankItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessible
              accessibilityLabel={`${item.pos}º lugar, ${item.nome}, ${item.total} XP`}
            >
              <View style={styles.rankLeft}>
                <View style={styles.podiumContainer}>{renderPodiumIcon(item.pos - 1)}</View>
                <View style={[styles.instIconBox, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="school" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.itemUser, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{siglaInstituicao(item.nome)}</Text>
              </View>
              <Text style={[styles.itemXp, { color: colors.text }]}>{item.total} XP</Text>
            </View>
          )}
        />
      ) : (
      <FlatList
        data={ranking}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item, index }) => {
          const isMe = currentUser?.id === item.id;
          const avatarUrl =
            item.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/png?seed=${item.usuario}`;

          return (
            <View
              style={[
                styles.rankItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                isMe && { backgroundColor: colors.primary + "15", borderColor: colors.primary, borderWidth: 2 },
              ]}
              accessible
              accessibilityLabel={`${index + 1}º lugar, ${item.usuario}${isMe ? ", você" : ""}, ${siglaInstituicao(item.instituicao || "IF Sertão")}, ${item.pontuacao || 0} XP`}
            >
              <View style={styles.rankLeft}>
                <View style={styles.podiumContainer}>{renderPodiumIcon(index)}</View>
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatar, { borderColor: colors.border }]}
                  accessibilityIgnoresInvertColors
                />
                <View>
                  <Text style={[styles.itemUser, { color: colors.text }, isMe && { color: colors.primary, fontWeight: "900" }]}>
                    {item.usuario} {isMe && "(Você)"}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textLight }]}>
                    {siglaInstituicao(item.instituicao || "IF Sertão")}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemXp, { color: colors.text }, isMe && { color: colors.primary, fontWeight: "900" }]}>
                {item.pontuacao || 0} XP
              </Text>
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
  center: { justifyContent: "center", alignItems: "center" },
  medalha: { alignItems: "center" },
  medalhaNumero: { fontSize: 10, fontWeight: "bold", color: c.textLight, marginTop: -1 },
  rankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  rankLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  podiumContainer: { width: 35, alignItems: "center", justifyContent: "center" },
  positionText: { fontSize: 14, fontWeight: "bold" },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1 },
  itemUser: { fontSize: 15, fontWeight: "bold", flexShrink: 1 },
  itemSub: { fontSize: 12, marginTop: 1 },
  itemXp: { fontSize: 15, fontWeight: "bold" },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: { fontWeight: "700", fontSize: 14 },
  instIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
