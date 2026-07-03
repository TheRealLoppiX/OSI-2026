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
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";

export default function HomeAluno() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Estudante");
  const [unreadCount, setUnreadCount] = useState(0);
  const [osiaTip, setOsiaTip] = useState("Carregando dica de OSIA...");
  const [modalVisible, setModalVisible] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  const getUserData = async () => {
    const user = await authService.getUser();
    if (user) {
      const primeiroNome = (user.nome || user.usuario || "Estudante").trim().split(" ")[0];
      setUserName(primeiroNome);
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

  const loadOsiaTip = async () => {
    try {
      const tip = await aiService.getPalavraMotivacional("Tecnologia");
      setOsiaTip(tip);
    } catch (e) {
      setOsiaTip("Mantenha o foco nos estudos, a OSI 2026 está chegando!");
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
      pageReady();
    }
  };

  useEffect(() => {
    getUserData();
    getUnreadNotifications();
    loadNews();
    loadOsiaTip();

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
    loadOsiaTip();
  };

  const handleOpenInbox = async () => {
    fetchMensagens();
    setModalVisible(true);
    if (unreadCount > 0) {
      // RLS bloqueia UPDATE em notificacoes pela anon key, então a escrita
      // passa pela Edge Function (service role) em vez do client direto.
      const { error } = await supabase.functions.invoke("marcar-notificacoes-lidas");
      if (!error) setUnreadCount(0);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.logoText, { color: colors.primary }]}>OSI 2026</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleOpenInbox}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
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
            <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
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
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.inboxContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.inboxHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.inboxTitle, { color: colors.text }]}>Avisos dos Docentes</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notificacoes.length > 0 ? (
                notificacoes.map((item) => (
                  <View key={item.id} style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.notifIconArea, { backgroundColor: colors.bg }]}>
                      <Ionicons name="mail-unread" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>{item.titulo}</Text>
                      <Text style={[styles.notifMsg, { color: colors.textLight }]}>{item.mensagem}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhum aviso no momento.</Text>
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
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.textLight }]}>Bem-vindo ao Portal,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{userName} </Text>
        </View>

        {/* CARD OSIA */}
        <View style={[styles.osiaCard, { backgroundColor: colors.primary }]}>
          <View style={styles.osiaHeader}>
            <MaterialCommunityIcons name="robot-happy" size={22} color="#fff" />
            <Text style={styles.osiaTitle}>OSIA lhe diz:</Text>
          </View>
          <Text style={styles.osiaText}>{osiaTip}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.mainAction, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/escolher")}
          >
            <Ionicons name="play-circle" size={40} color="#fff" />
            <Text style={styles.actionTitle}>Simulados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainAction, { backgroundColor: "#D4AF37" }]}
            onPress={() => router.push("/(tabs)/ranking")}
          >
            <Ionicons name="trophy" size={38} color="#fff" />
            <Text style={styles.actionTitle}>Ranking</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notícias IF Sertão</Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://ifsertaope.edu.br/salgueiro/")}>
              <Text style={[styles.seeMore, { color: colors.primary }]}>Ver site</Text>
            </TouchableOpacity>
          </View>

          {loadingNews ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
          ) : news.length > 0 ? (
            news.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => item.url_original && Linking.openURL(item.url_original)}
              >
                <View style={[styles.newsHeaderRow]}>
                  <View style={[styles.tag, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>IF SALGUEIRO</Text>
                  </View>
                  <Text style={[styles.newsDate, { color: colors.textLight }]}>
                    {item.data_noticia || item.data}
                  </Text>
                </View>
                <Text style={[styles.newsTitle, { color: colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.newsSummary, { color: colors.textLight }]} numberOfLines={3}>
                  {item.resumo}
                </Text>
                <View style={styles.readMoreRow}>
                  <Text style={[styles.readMoreText, { color: colors.primary }]}>Ler notícia completa</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhuma notícia no momento.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  logoText: { fontSize: 24, fontWeight: "900" },
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
  },
  inboxTitle: { fontSize: 18, fontWeight: "bold" },
  notifItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  notifIconArea: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notifTitle: { fontSize: 15, fontWeight: "bold" },
  notifMsg: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: "#94A3B8", marginTop: 6 },
  welcomeSection: { padding: 25, paddingBottom: 10 },
  welcomeText: { fontSize: 16 },
  userName: { fontSize: 26, fontWeight: "bold" },
  osiaCard: {
    marginHorizontal: 25,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
  },
  osiaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  osiaTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  osiaText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  actionRow: { flexDirection: "row", paddingHorizontal: 25, gap: 15, marginBottom: 25 },
  mainAction: {
    flex: 1,
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
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  seeMore: { fontSize: 12, fontWeight: "bold" },
  newsCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 18,
    borderWidth: 1,
  },
  newsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: "bold" },
  newsTitle: { fontSize: 16, fontWeight: "bold" },
  newsSummary: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  newsDate: { fontSize: 11 },
  readMoreRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 15 },
  readMoreText: { fontSize: 12, fontWeight: "bold" },
  emptyText: { textAlign: "center", marginTop: 20 },
});
