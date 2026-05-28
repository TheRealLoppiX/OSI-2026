import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { authService } from "../../src/services/auth";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ alunos: 0, simulados: 0, questoes: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: alunos } = await supabase
        .from("usuarios")
        .select("*", { count: "exact", head: true });
      const { count: simulados } = await supabase
        .from("simulados")
        .select("*", { count: "exact", head: true });
      const { count: questoes } = await supabase
        .from("questoes")
        .select("*", { count: "exact", head: true });

      setStats({
        alunos: alunos || 0,
        simulados: simulados || 0,
        questoes: questoes || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja encerrar a sessão administrativa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          await authService.logout();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color={Colors.secondary} />
          <Text style={styles.logoutText}>SAIR</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Painel Docente</Text>
        <TouchableOpacity onPress={fetchStats}>
          <Ionicons name="refresh-circle" size={30} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={styles.statNumber}>
              {loading ? "..." : stats.alunos}
            </Text>
            <Text style={styles.statLabel}>Alunos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="folder-open" size={20} color={Colors.primary} />
            <Text style={styles.statNumber}>
              {loading ? "..." : stats.simulados}
            </Text>
            <Text style={styles.statLabel}>Simulados</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="help-buoy" size={20} color={Colors.primary} />
            <Text style={styles.statNumber}>
              {loading ? "..." : stats.questoes}
            </Text>
            <Text style={styles.statLabel}>Questões</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Ações Administrativas</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/admin/gerenciar" as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: Colors.primary }]}>
              <Ionicons name="create" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Conteúdo OSI</Text>
              <Text style={styles.menuSub}>Gerenciar Simulados e Questões</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          {/* BOTÃO CORRIGIDO PARA NAVEGAR PARA A TELA */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/admin/notificar" as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: Colors.accent }]}>
              <Ionicons name="megaphone" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Enviar Notificação</Text>
              <Text style={styles.menuSub}>Disparar alerta para os alunos</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/admin/usuarios" as any)}
          >
            <View
              style={[styles.iconBox, { backgroundColor: Colors.secondary }]}
            >
              <Ionicons name="list" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Lista de Inscritos</Text>
              <Text style={styles.menuSub}>Ver e monitorar alunos</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoutBtn: { alignItems: "center" },
  logoutText: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: "bold",
    marginTop: -2,
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  statsGrid: { flexDirection: "row", padding: 20, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 22,
    alignItems: "center",
    elevation: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  menuSection: { padding: 25 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: "#fff",
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
  menuText: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textLight },
});
