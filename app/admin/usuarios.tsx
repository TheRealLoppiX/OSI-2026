import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/context/ThemeContext";

export default function ListaUsuarios() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editUser, setEditUser] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("usuarios").select("*").order("usuario");
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setEditNome(user.nome || "");
    setEditUser(user.usuario);
    setNovaSenha("");
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editUser) return Alert.alert("Erro", "O login (username) é obrigatório.");

    setUpdating(true);
    const updatePayload: any = { nome: editNome, usuario: editUser.toLowerCase().trim() };
    if (novaSenha.trim().length > 0) updatePayload.senha = novaSenha;

    const { error } = await supabase.from("usuarios").update(updatePayload).eq("id", selectedUser.id);
    setUpdating(false);

    if (!error) {
      Alert.alert("Sucesso", "Dados do aluno atualizados!");
      setModalVisible(false);
      fetchUsers();
    } else {
      Alert.alert("Erro", "Falha ao atualizar: " + error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Monitorar Alunos</Text>
        <TouchableOpacity onPress={fetchUsers}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userCard, { backgroundColor: colors.card }]}
              onPress={() => openEdit(item)}
            >
              <Image
                source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.usuario}` }}
                style={[styles.avatar, { borderColor: colors.border }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.usuario}</Text>
                <Text style={[styles.userSchool, { color: colors.textLight }]}>{item.instituicao || "Estudante"}</Text>
              </View>
              <View style={[styles.editIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="pencil" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Gerenciar Aluno</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.infoText, { color: colors.textLight }]}>
              ID do Aluno: <Text style={{ fontWeight: "bold" }}>{selectedUser?.id.substring(0, 8)}...</Text>
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Nome Completo</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Nome do Aluno"
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.text }]}>Login / Usuário</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={editUser}
              onChangeText={setEditUser}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Redefinir Senha (Deixe vazio para manter)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: novaSenha ? colors.primary : colors.border, color: colors.text }]}
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Digite a nova senha aqui"
              placeholderTextColor={colors.textLight}
              secureTextEntry
            />

            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Atualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  userCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1 },
  editIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  userName: { fontSize: 16, fontWeight: "bold" },
  userSchool: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalContent: { padding: 25, borderRadius: 28, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  infoText: { fontSize: 12, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "bold", marginTop: 15, marginBottom: 6 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1 },
  footerRow: { flexDirection: "row", gap: 12, marginTop: 30 },
  btn: { flex: 1, padding: 16, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
