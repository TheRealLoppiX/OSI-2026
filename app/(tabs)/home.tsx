import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { aiService } from "../../src/services/aiService";
import { authService } from "../../src/services/auth";
import { newsService } from "../../src/services/newsService";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function HomeAluno() {
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Estudante");
  const [unreadCount, setUnreadCount] = useState(0);
  const [salTip, setSalTip] = useState("Carregando dica da OSIA...");

  // Estados para o Modal de Notificações
  const [modalVisible, setModalVisible] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  const getUserData = async () => {
    const user = await authService.getUser();
    if (user) {
      setUserName(user.usuario);
    } else {
      router.replace("/");
    }
  };

  const getUnreadNotifications = async () => {
    const { count, error } = await supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("lida", false);

    if (!error) setUnreadCount(count || 0);
  };

  const fetchMensagens = async () => {
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setNotificacoes(data);
  };

  const loadSalTip = async () => {
    try {
      const tip = await aiService.getPalavraMotivacional("Tecnologia");
      setSalTip(tip);
    } catch (e) {
      setSalTip("Mantenha o foco nos estudos, a OSI 2026 está chegando!");
    }
  };

  const loadNews = async () => {
    try {
      const data = await newsService.getIFNews();
      setNews(Array.isArray(data) ? data : []);
    } catch (e) {
      setNews([]);
    } finally {
      setLoadingNews(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getUserData();
    getUnreadNotifications();
    loadNews();
    loadSalTip();

    const channel = supabase
      .channel("notificacoes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        () => getUnreadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    getUnreadNotifications();
    loadNews();
    loadSalTip();
  };

  const handleOpenInbox = () => {
    fetchMensagens();
    setModalVisible(true);
    setUnreadCount(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logoText}>OSI 2026</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleOpenInbox}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color={Colors.text}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/perfil")}
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL DE NOTIFICAÇÕES */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.inboxContainer}>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Avisos dos Docentes</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons
                  name="close-circle"
                  size={26}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notificacoes.length > 0 ? (
                notificacoes.map((item) => (
                  <View key={item.id} style={styles.notifItem}>
                    <View style={styles.notifIconArea}>
                      <Ionicons
                        name="mail-unread"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{item.titulo}</Text>
                      <Text style={styles.notifMsg}>{item.mensagem}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Nenhum aviso no momento.</Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Bem-vindo ao Portal,</Text>
          <Text style={styles.userName}>{userName} </Text>
        </View>

        {/* BOX DO SAL (IA) */}
        <View style={styles.salCard}>
          <View style={styles.salHeader}>
            <MaterialCommunityIcons name="robot-happy" size={22} color="#fff" />
            <Text style={styles.salTitle}>OSIA lhe diz:</Text>
          </View>
          <Text style={styles.salText}>{salTip}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.mainAction}
            onPress={() => router.push("/(tabs)/escolher")}
          >
            <Ionicons name="play-circle" size={40} color="#fff" />
            <Text style={styles.actionTitle}>Simulados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainAction, { backgroundColor: "#D4AF37" }]} // Cor Dourada Premium para o Ranking
            onPress={() => router.push("/(tabs)/ranking")}
          >
            <Ionicons name="trophy" size={38} color="#fff" />
            <Text style={styles.actionTitle}>Ranking</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notícias IF Sertão</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://ifsertaope.edu.br/salgueiro/")
              }
            >
              <Text style={styles.seeMore}>Ver site</Text>
            </TouchableOpacity>
          </View>

          {loadingNews ? (
            <ActivityIndicator
              color={Colors.primary}
              size="large"
              style={{ marginTop: 20 }}
            />
          ) : news.length > 0 ? (
            news.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.newsCard}
                onPress={() =>
                  item.url_original && Linking.openURL(item.url_original)
                }
              >
                <View style={styles.newsHeaderRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>IF SALGUEIRO</Text>
                  </View>
                  <Text style={styles.newsDate}>
                    {item.data_noticia || item.data}
                  </Text>
                </View>
                <Text style={styles.newsTitle}>{item.titulo}</Text>
                <Text style={styles.newsSummary} numberOfLines={3}>
                  {item.resumo}
                </Text>
                <View style={styles.readMoreRow}>
                  <Text style={styles.readMoreText}>Ler notícia completa</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={Colors.primary}
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma notícia no momento.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Mantido os seus estilos originais intactos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoText: { fontSize: 24, fontWeight: "900", color: Colors.primary },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 15 },
  iconBtn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    backgroundColor: "red",
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 100,
  },
  inboxContainer: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 20,
  },
  inboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  inboxTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  notifItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  notifIconArea: {
    width: 40,
    height: 40,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notifTitle: { fontSize: 15, fontWeight: "bold", color: Colors.text },
  notifMsg: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  notifTime: { fontSize: 11, color: "#94A3B8", marginTop: 6 },
  welcomeSection: { padding: 25, paddingBottom: 10 },
  welcomeText: { fontSize: 16, color: Colors.textLight },
  userName: { fontSize: 26, fontWeight: "bold", color: Colors.text },
  salCard: {
    marginHorizontal: 25,
    marginBottom: 20,
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 24,
  },
  salHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  salTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  salText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 25,
    gap: 15,
    marginBottom: 25,
  },
  mainAction: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionTitle: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  newsSection: { paddingHorizontal: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  seeMore: { color: Colors.primary, fontSize: 12, fontWeight: "bold" },
  newsCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  newsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: Colors.primary, fontSize: 10, fontWeight: "bold" },
  newsTitle: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  newsSummary: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 8,
    lineHeight: 18,
  },
  newsDate: { fontSize: 11, color: Colors.textLight },
  readMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 15,
  },
  readMoreText: { fontSize: 12, fontWeight: "bold", color: Colors.primary },
  emptyText: { textAlign: "center", color: Colors.textLight, marginTop: 20 },
});
