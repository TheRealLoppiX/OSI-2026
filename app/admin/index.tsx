import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/AppText";
import { useAuth } from "../../src/context/AuthContext";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { authService } from "../../src/services/auth";
import { supabase } from "../../src/services/supabase";
import { appAlert } from "../../src/services/appAlert";


export default function AdminDashboard() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { setUsuario } = useAuth();
  const [stats, setStats] = useState({ alunos: 0, simulados: 0, questoes: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: alunos, error: erroAlunos } = await supabase
        .from("usuarios")
        .select("*", { count: "exact", head: true });
      if (erroAlunos) console.error("Erro ao contar alunos:", erroAlunos);
      const { count: simulados, error: erroSimulados } = await supabase
        .from("simulados")
        .select("*", { count: "exact", head: true });
      if (erroSimulados) console.error("Erro ao contar simulados:", erroSimulados);
      const { count: questoes, error: erroQuestoes } = await supabase
        .from("questoes")
        .select("*", { count: "exact", head: true });
      if (erroQuestoes) console.error("Erro ao contar questões:", erroQuestoes);
      setStats({
        alunos: alunos || 0,
        simulados: simulados || 0,
        questoes: questoes || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
      pageReady();
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    appAlert.alert("Sair", "Deseja encerrar a sessão administrativa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut().catch(() => {});
          await authService.logout();
          setUsuario(null);
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair da sessão administrativa"
        >
          <Ionicons name="log-out-outline" size={26} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>SAIR</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>
          Painel Docente
        </Text>

        <TouchableOpacity
          onPress={fetchStats}
          accessibilityRole="button"
          accessibilityLabel="Atualizar estatísticas"
        >
          <Ionicons name="refresh-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {[
            { icon: "people", label: "Alunos", value: stats.alunos },
            { icon: "folder-open", label: "Simulados", value: stats.simulados },
            { icon: "help-buoy", label: "Questões", value: stats.questoes },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: colors.card }]}
            >
              <Ionicons name={s.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {loading ? "..." : s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ações Administrativas
          </Text>

          {[
            {
              route: "/admin/analytics",
              icon: "stats-chart",
              color: colors.info,
              title: "Analytics",
              sub: "Desempenho e engajamento dos alunos",
            },
            {
              route: "/admin/cadastrar-docente",
              icon: "person-add",
              color: colors.success,
              title: "Cadastrar Docente",
              sub: "Adicionar novo administrador à OSI",
            },
            {
              route: "/admin/gerenciar",
              icon: "create",
              color: colors.primary,
              title: "Conteúdo OSI",
              sub: "Gerenciar Simulados e Questões",
            },
            {
              route: "/admin/instituicoes",
              icon: "school",
              color: colors.highlight,
              title: "Instituições",
              sub: "Gerenciar Instituições",
            },
            {
              route: "/admin/notificar",
              icon: "megaphone",
              color: colors.warning,
              title: "Enviar Notificação",
              sub: "Disparar alerta para os alunos",
            },
            {
              route: "/admin/usuarios",
              icon: "list",
              color: colors.danger,
              title: "Lista de Inscritos",
              sub: "Ver e monitorar alunos",
            },
            {
              route: "/configuracoes",
              icon: "accessibility",
              color: colors.textLight,
              title: "Aparência e acessibilidade",
              sub: "Tema, tamanho do texto e leitura",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => router.push(item.route as any)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.sub}`}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textLight }]}>
                  {item.sub}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  logoutBtn: { alignItems: "center" },
  logoutText: { fontSize: 10, fontWeight: "bold", marginTop: -2 },
  title: { fontSize: 20, fontWeight: "bold" },
  statsGrid: { flexDirection: "row", padding: 20, gap: 10 },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 22,
    alignItems: "center",
    elevation: 4,
  },
  statNumber: { fontSize: 22, fontWeight: "bold", marginVertical: 4 },
  statLabel: { fontSize: 10, textTransform: "uppercase", fontWeight: "600" },
  menuSection: { padding: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  menuItem: {
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: { fontSize: 16, fontWeight: "bold" },
  menuSub: { fontSize: 12 },
});
