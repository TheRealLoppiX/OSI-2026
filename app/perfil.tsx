import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from "../src/services/auth";
import { supabase } from "../src/services/supabase";
import { Colors } from "../src/styles/colors";

export default function PerfilAluno() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rankPosicao, setRankPosicao] = useState<number | string>("...");

  // 1. CARREGA PERFIL LENDO SEU AUTH SERVICE CUSTOMIZADO
  const loadPerfilEPlacar = async () => {
    try {
      setLoading(true);

      // Pegando o usuário salvo no seu AsyncStorage local
      const localUser = await authService.getUser();

      if (!localUser || !localUser.id) {
        router.replace("/");
        return;
      }

      // Seta provisoriamente o que tem no celular para carregar a tela instantaneamente
      setUserData(localUser);

      // Busca dados atualizados (como pontos e imagem nova) direto na tabela do banco
      const { data: perfil, error: perfilErr } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", localUser.id)
        .single();

      if (!perfilErr && perfil) {
        setUserData(perfil);
        await authService.saveUser(perfil);
      } else if (perfilErr) {
        console.log(perfilErr.message);
      }

      // CALCULA O RANKING EM TEMPO REAL
      const { data: todosUsuarios, error: rankErr } = await supabase
        .from("usuarios")
        .select("id")
        .order("pontuacao", { ascending: false });

      if (!rankErr && todosUsuarios) {
        const index = todosUsuarios.findIndex(
          (u: any) => u.id === localUser.id,
        );
        if (index !== -1) {
          setRankPosicao(index + 1);
        } else {
          setRankPosicao("-");
        }
      }
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerfilEPlacar();
  }, []);

  // 2. FUNÇÃO DE UPLOAD TOTALMENTE COMPATÍVEL
  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de acesso às suas fotos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const selectedImage = result.assets[0];
      const userId = userData?.id;

      if (!userId) {
        Alert.alert("Erro", "ID do usuário não identificado.");
        setUploading(false);
        return;
      }

      const fileName = `${userId}/avatar_${Date.now()}.png`;
      const imageBuffer = Buffer.from(selectedImage.base64!, "base64");

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (storageError) {
        throw new Error(
          "Falha no Storage: Verifique as políticas do bucket avatars.",
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const updatedUser = { ...userData, avatar_url: publicUrl };

      // Atualiza a tabela pública
      await supabase
        .from("usuarios")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      setUserData(updatedUser);
      await authService.saveUser(updatedUser);

      Alert.alert("Sucesso!", "Sua foto de perfil foi atualizada.");
    } catch (error: any) {
      Alert.alert(
        "Erro no Upload",
        error.message || "Não foi possível salvar a foto.",
      );
    } finally {
      setUploading(false);
    }
  };

  // 3. LOGOUT LIMPA O SEU SERVIÇO LOCAL E FECHA A PORTA
  const handleLogout = async () => {
    try {
      setLoading(true);

      // Desloga o Supabase por desencargo de consciência
      await supabase.auth.signOut().catch(() => {});

      // Destrói o AsyncStorage local (o que importa para o seu fluxo)
      await authService.logout();

      router.replace("/");
    } catch (e) {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${userData?.usuario || "Estudante"}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ÁREA DA FOTO */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
          <Image
            source={{ uri: userData?.avatar_url || defaultAvatar }}
            style={styles.avatar}
          />
          <View style={styles.editBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.nameText}>{userData?.usuario || "Estudante"}</Text>
        <Text style={styles.subText}>
          {userData?.instituicao || "IF Sertão - Salgueiro"}
        </Text>
      </View>

      {/* CARD DE PONTUAÇÃO E RANKING REAL */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="flash" size={24} color="#FFD700" />
          <Text style={styles.statNumber}>{userData?.pontuacao || 0}</Text>
          <Text style={styles.statLabel}>Total de XP</Text>
        </View>

        <View
          style={[
            styles.statBox,
            { borderLeftWidth: 1, borderLeftColor: "#F1F5F9" },
          ]}
        >
          <Ionicons name="trophy" size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>#{rankPosicao}</Text>
          <Text style={styles.statLabel}>Posição no Ranking</Text>
        </View>
      </View>

      {/* LISTA DE INFORMAÇÕES / AÇÕES */}
      <View style={styles.menuContainer}>
        <View style={styles.menuItem}>
          <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
          <Text style={styles.menuItemText}>
            {userData?.email || "E-mail não disponível"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.menuItem, { marginTop: 20 }]}
          onPress={() => router.push("/ranking" as any)}
        >
          <Ionicons name="podium-outline" size={20} color={Colors.primary} />
          <Text
            style={[
              styles.menuItemText,
              { color: Colors.primary, fontWeight: "bold" },
            ]}
          >
            Ver Leaderboard Completa
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* BOTÃO DE LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="red" />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Estilos mantidos originais
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  avatarSection: { alignItems: "center", marginTop: 30 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#E2E8F0",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 15,
  },
  subText: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 25,
    marginTop: 30,
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: { fontSize: 12, color: Colors.textLight },
  menuContainer: { marginHorizontal: 25, marginTop: 30 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuItemText: { flex: 1, fontSize: 15, color: Colors.text },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "auto",
    marginBottom: 30,
    marginHorizontal: 25,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFE2E2",
  },
  logoutText: { color: "red", fontSize: 15, fontWeight: "bold" },
});
