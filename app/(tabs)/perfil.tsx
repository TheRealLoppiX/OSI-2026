import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/AppText";
import { authService } from "../../src/services/auth";
import { useAuth } from "../../src/context/AuthContext";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function PerfilAluno() {
  const { pageReady } = useNavigationLoading();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { setUsuario } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rankPosicao, setRankPosicao] = useState<number | string>("...");

  const loadPerfilEPlacar = async () => {
    try {
      setLoading(true);
      const localUser = await authService.getUser();

      if (!localUser || !localUser.id) {
        router.replace("/");
        return;
      }

      setUserData(localUser);

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

      const { data: todosUsuarios, error: rankErr } = await supabase
        .from("usuarios")
        .select("id")
        .order("pontuacao", { ascending: false });

      if (!rankErr && todosUsuarios) {
        const index = todosUsuarios.findIndex((u: any) => u.id === localUser.id);
        setRankPosicao(index !== -1 ? index + 1 : "-");
      }
    } catch (err: any) {
    } finally {
      setLoading(false);
      pageReady();
    }
  };

  useEffect(() => {
    loadPerfilEPlacar();
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        appAlert.alert("Permissão necessária", "Precisamos de acesso às suas fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const selectedImage = result.assets[0];
      const userId = userData?.id;

      if (!userId) {
        appAlert.alert("Erro", "ID do usuário não identificado.");
        setUploading(false);
        return;
      }

      const fileName = `${userId}/avatar_${Date.now()}.png`;
      const imageBuffer = Buffer.from(selectedImage.base64!, "base64");

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

      if (storageError) {
        throw new Error("Falha no Storage: Verifique as políticas do bucket avatars.");
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const updatedUser = { ...userData, avatar_url: publicUrl };

      const { data: updateData, error: updateError } = await supabase
        .from("usuarios")
        .update({ avatar_url: publicUrl })
        .eq("id", userId)
        .select();
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error("Não foi possível salvar a foto: nenhuma alteração foi persistida.");
      }
      setUserData(updatedUser);
      await authService.saveUser(updatedUser);

      appAlert.alert("Sucesso!", "Sua foto de perfil foi atualizada.");
    } catch (error: any) {
      appAlert.alert("Erro no Upload", friendlyError(error, "Não foi possível salvar a foto."));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut().catch(() => {});
      await authService.logout();
      setUsuario(null);
      router.replace("/");
    } catch (e) {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${userData?.usuario || "Estudante"}`;

  return (
    <View style={styles.container}>
      {/* Raiz de aba: sem "voltar", a navegação é pela barra de abas */}
      <ScreenHeader title="Meu Perfil" showBack={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* ÁREA DA FOTO */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Trocar foto de perfil"
        >
          <Image
            source={{ uri: userData?.avatar_url || defaultAvatar }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
          <View style={styles.editBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.onPrimary} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={[styles.nameText, { color: colors.text }]}>
          {userData?.usuario || "Estudante"}
        </Text>
        <Text style={[styles.subText, { color: colors.textLight }]}>
          {userData?.instituicao || "IF Sertão - Salgueiro"}
        </Text>
      </View>

      {/* CARD DE PONTUAÇÃO, RANKING E STREAK */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statBox}>
          <Ionicons name="flash" size={24} color={colors.warning} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {userData?.pontuacao || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Total de XP</Text>
        </View>

        <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>#{rankPosicao}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Ranking</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={[styles.statNumber, { color: colors.text }]}>{userData?.streak_dias || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Dias seguidos</Text>
        </View>
      </View>

      {/* MENU */}
      <View style={styles.menuContainer}>
        <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="mail-outline" size={20} color={colors.textLight} />
          <Text style={[styles.menuItemText, { color: colors.text }]}>
            {userData?.email || "E-mail não disponível"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}
          onPress={() => router.push("/configuracoes" as any)}
          accessibilityRole="button"
          accessibilityHint={`Tema atual: ${theme.nome}`}
        >
          <Ionicons name="accessibility-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuItemText, { color: colors.text, fontWeight: "bold" }]}>
              Aparência e acessibilidade
            </Text>
            <Text style={[styles.menuItemSub, { color: colors.textLight }]}>
              Tema {theme.nome.toLowerCase()} · tamanho do texto · leitura
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}
          onPress={() => router.navigate("/(tabs)/ranking")}
          accessibilityRole="button"
        >
          <Ionicons name="podium-outline" size={20} color={colors.primary} />
          <Text style={[styles.menuItemText, { color: colors.primary, fontWeight: "bold" }]}>
            Ver Leaderboard Completa
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}
          onPress={() => router.push("/historico")}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={20} color={colors.warning} />
          <Text style={[styles.menuItemText, { color: colors.text, fontWeight: "bold" }]}>
            Histórico de Simulados
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}
          onPress={() => router.push("/ajuda" as any)}
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textLight} />
          <Text style={[styles.menuItemText, { color: colors.text, fontWeight: "bold" }]}>
            Ajuda e Perguntas Frequentes
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* BOTÃO DE LOGOUT — fora do ScrollView para nunca ficar oculto por overflow */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  avatarSection: { alignItems: "center", marginTop: 30 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: c.card,
    backgroundColor: c.surfaceAlt,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: c.card,
    backgroundColor: c.primary,
  },
  nameText: { fontSize: 22, fontWeight: "bold", marginTop: 15 },
  subText: { fontSize: 14, marginTop: 4 },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 25,
    marginTop: 30,
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 1,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 4 },
  streakEmoji: { fontSize: 22 },
  statNumber: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  statLabel: { fontSize: 12 },
  menuContainer: { marginHorizontal: 25, marginTop: 30 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
  },
  menuItemText: { flex: 1, fontSize: 15 },
  menuItemSub: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
    marginHorizontal: 25,
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.danger,
  },
  logoutText: { color: c.danger, fontSize: 15, fontWeight: "bold" },
});
