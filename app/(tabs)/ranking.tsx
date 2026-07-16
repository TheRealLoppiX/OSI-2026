import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from "../../src/services/auth";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { useTheme } from "../../src/context/ThemeContext";
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
    if (index === 0) return <Ionicons name="trophy" size={24} color="#FFD700" />;
    if (index === 1) return <Ionicons name="trophy" size={24} color="#C0C0C0" />;
    if (index === 2) return <Ionicons name="trophy" size={24} color="#CD7F32" />;
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard OSI 2026</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* TABS */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, aba === "individual" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setAba("individual")}
        >
          <Text style={[styles.tabText, { color: aba === "individual" ? colors.primary : colors.textLight }]}>
            Individual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aba === "instituicao" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setAba("instituicao")}
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
            <View style={[styles.rankItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rankLeft}>
                <View style={styles.podiumContainer}>
                  {item.pos === 1 ? <Ionicons name="trophy" size={24} color="#FFD700" /> :
                   item.pos === 2 ? <Ionicons name="trophy" size={24} color="#C0C0C0" /> :
                   item.pos === 3 ? <Ionicons name="trophy" size={24} color="#CD7F32" /> :
                   <Text style={[styles.positionText, { color: colors.textLight }]}>#{item.pos}</Text>}
                </View>
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
                isMe && { backgroundColor: colors.primary + "15", borderColor: colors.primary },
              ]}
            >
              <View style={styles.rankLeft}>
                <View style={styles.podiumContainer}>{renderPodiumIcon(index)}</View>
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatar, { borderColor: colors.border }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
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
