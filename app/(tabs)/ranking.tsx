import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function RankingCompleto() {
  const { pageReady } = useNavigationLoading();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchRanking = async () => {
    try {
      setLoading(true);

      // 1. Busca os dados dos usuários ordenados por pontuação descrescente
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, usuario, pontuacao, instituicao, avatar_url")
        .order("pontuacao", { ascending: false });

      if (!error && data) setRanking(data);

      // 2. Identifica quem é o usuário logado no momento para destacá-lo
      const localUser = await authService.getUser();
      if (localUser) setCurrentUser(localUser);
    } catch (err) {
      console.error("Erro ao buscar ranking:", err);
    } finally {
      setLoading(false);
      pageReady();
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  const renderPodiumIcon = (index: number) => {
    if (index === 0)
      return <Ionicons name="trophy" size={24} color="#FFD700" />;
    if (index === 1)
      return <Ionicons name="trophy" size={24} color="#C0C0C0" />;
    if (index === 2)
      return <Ionicons name="trophy" size={24} color="#CD7F32" />;
    return <Text style={styles.positionText}>#{index + 1}</Text>;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard OSI 2026</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* LISTA DE COMPETEIDORES */}
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
            <View style={[styles.rankItem, isMe && styles.myRankItem]}>
              <View style={styles.rankLeft}>
                <View style={styles.podiumContainer}>
                  {renderPodiumIcon(index)}
                </View>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                <View>
                  <Text style={[styles.itemUser, isMe && styles.myText]}>
                    {item.usuario} {isMe && "(Você)"}
                  </Text>
                  <Text style={styles.itemSub}>
                    {item.instituicao || "IF Sertão"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemXp, isMe && styles.myText]}>
                {item.pontuacao || 0} XP
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  rankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  myRankItem: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  rankLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  podiumContainer: {
    width: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  positionText: { fontSize: 14, fontWeight: "bold", color: Colors.textLight },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemUser: { fontSize: 15, fontWeight: "bold", color: Colors.text },
  myText: { color: Colors.primary, fontWeight: "900" },
  itemSub: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  itemXp: { fontSize: 15, fontWeight: "bold", color: Colors.text },
});
