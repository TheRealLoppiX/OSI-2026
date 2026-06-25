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
import { Colors } from "../../src/styles/colors";

export default function ListaUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Edição
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editUser, setEditUser] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("usuario");
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setEditNome(user.nome || "");
    setEditUser(user.usuario);
    setNovaSenha(""); // Sempre começa vazio por segurança
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editUser)
      return Alert.alert("Erro", "O login (username) é obrigatório.");

    setUpdating(true);

    const updatePayload: any = {
      nome: editNome,
      usuario: editUser.toLowerCase().trim(),
    };

    // Só altera a senha no banco se o professor digitar algo no campo
    if (novaSenha.trim().length > 0) {
      updatePayload.senha = novaSenha;
    }

    const { error } = await supabase
      .from("usuarios")
      .update(updatePayload)
      .eq("id", selectedUser.id);

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
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Monitorar Alunos</Text>
        <TouchableOpacity onPress={fetchUsers}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => openEdit(item)}
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/png?seed=${item.usuario}`,
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.usuario}</Text>
                <Text style={styles.userSchool}>
                  {item.instituicao || "Estudante"}
                </Text>
              </View>
              <View style={styles.editIcon}>
                <Ionicons name="pencil" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL DE EDIÇÃO PROFISSIONAL */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Aluno</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoText}>
              ID do Aluno:{" "}
              <Text style={{ fontWeight: "bold" }}>
                {selectedUser?.id.substring(0, 8)}...
              </Text>
            </Text>

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Nome do Aluno"
            />

            <Text style={styles.label}>Login / Usuário</Text>
            <TextInput
              style={styles.input}
              value={editUser}
              onChangeText={setEditUser}
              autoCapitalize="none"
            />

            <Text style={styles.label}>
              Redefinir Senha (Deixe vazio para manter)
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: novaSenha ? Colors.primary : "#E2E8F0" },
              ]}
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Digite a nova senha aqui"
              secureTextEntry={true}
            />

            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#F1F5F9" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: Colors.text, fontWeight: "600" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Atualizar
                  </Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  userCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  editIcon: {
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  userSchool: { fontSize: 12, color: Colors.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 28,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  infoText: { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 15,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: Colors.text,
  },
  footerRow: { flexDirection: "row", gap: 12, marginTop: 30 },
  btn: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
