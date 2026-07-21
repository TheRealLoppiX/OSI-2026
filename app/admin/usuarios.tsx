import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function ListaUsuarios() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editUser, setEditUser] = useState("");
  const [editInstituicao, setEditInstituicao] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [instituicoes, setInstituicoes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [excluindoLote, setExcluindoLote] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("usuarios").select("*").order("usuario");
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    supabase.from("instituicoes").select("nome, sigla").order("nome").then(({ data }) => setInstituicoes(data || []));
  }, []);

  const usuariosFiltrados = busca.trim()
    ? users.filter((u) => {
        const termo = busca.trim().toLowerCase();
        return (
          u.usuario?.toLowerCase().includes(termo) ||
          u.nome?.toLowerCase().includes(termo) ||
          u.instituicao?.toLowerCase().includes(termo)
        );
      })
    : users;

  const handleToggleSelecionado = (id: string) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]));
  };

  const handleLongPressCard = (user: any) => {
    setModoSelecao(true);
    setSelecionados([user.id]);
  };

  const handleCancelarSelecao = () => {
    setModoSelecao(false);
    setSelecionados([]);
  };

  const handleExcluirSelecionados = () => {
    appAlert.alert(
      "Excluir alunos",
      `Remover permanentemente ${selecionados.length} aluno(s) do sistema? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setExcluindoLote(true);
            const { data, error } = await supabase.from("usuarios").delete().in("id", selecionados).select();
            setExcluindoLote(false);
            if (error) {
              return appAlert.alert("Erro", friendlyError(error, "Falha ao excluir os alunos selecionados."));
            }
            const removidos = data?.length || 0;
            if (removidos < selecionados.length) {
              appAlert.alert(
                "Exclusão parcial",
                `${removidos} de ${selecionados.length} aluno(s) foram removidos. Verifique as permissões de exclusão no banco de dados.`
              );
            } else {
              appAlert.alert("Sucesso", `${removidos} aluno(s) removido(s).`);
            }
            handleCancelarSelecao();
            fetchUsers();
          },
        },
      ]
    );
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setEditNome(user.nome || "");
    setEditUser(user.usuario);
    setEditInstituicao(user.instituicao || "");
    setNovaSenha("");
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editUser) return appAlert.alert("Erro", "O login (username) é obrigatório.");

    setUpdating(true);
    const updatePayload: any = {
      nome: editNome,
      usuario: editUser.toLowerCase().trim(),
      instituicao: editInstituicao || null,
    };
    if (novaSenha.trim().length > 0) updatePayload.senha = novaSenha;

    const { error } = await supabase.from("usuarios").update(updatePayload).eq("id", selectedUser.id);
    setUpdating(false);

    if (!error) {
      appAlert.alert("Sucesso", "Dados do aluno atualizados!");
      setModalVisible(false);
      fetchUsers();
    } else {
      appAlert.alert("Erro", friendlyError(error, "Falha ao atualizar o aluno."));
    }
  };

  const handleDelete = () => {
    appAlert.alert(
      "Excluir aluno",
      `Remover permanentemente "${selectedUser?.usuario}" do sistema? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const { data, error } = await supabase.from("usuarios").delete().eq("id", selectedUser.id).select();
            if (!error && data && data.length > 0) {
              setModalVisible(false);
              fetchUsers();
            } else if (error) {
              appAlert.alert("Erro", friendlyError(error, "Falha ao excluir o aluno."));
            } else {
              appAlert.alert("Erro", "Não foi possível excluir o aluno. Verifique as permissões de exclusão no banco de dados.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {modoSelecao ? (
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={handleCancelarSelecao} accessibilityRole="button" accessibilityLabel="Cancelar seleção">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{selecionados.length} selecionado(s)</Text>
          <TouchableOpacity
            onPress={handleExcluirSelecionados}
            disabled={selecionados.length === 0 || excluindoLote}
            accessibilityRole="button"
            accessibilityLabel="Excluir selecionados"
          >
            {excluindoLote ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="trash-outline" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Monitorar Alunos</Text>
          <TouchableOpacity onPress={fetchUsers} accessibilityRole="button" accessibilityLabel="Atualizar lista">
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {!loading && users.length > 0 && (
        <View style={[styles.buscaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textLight} />
          <TextInput
            style={[styles.buscaInput, { color: colors.text }]}
            placeholder="Buscar por usuário, nome ou instituição..."
            placeholderTextColor={colors.textLight}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca("")} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : usuariosFiltrados.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <Ionicons name="search-outline" size={40} color="#CBD5E1" />
          <Text style={{ color: colors.textLight, marginTop: 10 }}>Nenhum aluno encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={usuariosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingTop: 12 }}
          renderItem={({ item }) => {
            const isSelected = selecionados.includes(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.userCard,
                  { backgroundColor: colors.card },
                  isSelected && { borderWidth: 2, borderColor: colors.primary },
                ]}
                onPress={() => (modoSelecao ? handleToggleSelecionado(item.id) : openEdit(item))}
                onLongPress={() => (modoSelecao ? undefined : handleLongPressCard(item))}
                accessibilityRole="button"
                accessibilityLabel={modoSelecao ? (isSelected ? "Remover seleção do aluno" : "Selecionar aluno") : "Editar aluno"}
              >
                {modoSelecao && (
                  <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={22} color={isSelected ? colors.primary : "#94A3B8"} />
                )}
                <Image
                  source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.usuario}` }}
                  style={[styles.avatar, { borderColor: colors.border }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{item.usuario}</Text>
                  <Text style={[styles.userSchool, { color: colors.textLight }]}>{item.instituicao || "Sem instituição"}</Text>
                </View>
                {!modoSelecao && (
                  <View style={[styles.editIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de edição do aluno */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Gerenciar Aluno</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Fechar">
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.infoText, { color: colors.textLight }]}>
              ID: <Text style={{ fontWeight: "bold" }}>{selectedUser?.id.substring(0, 8)}...</Text>
              {"  "}XP: <Text style={{ fontWeight: "bold", color: colors.primary }}>{selectedUser?.pontuacao || 0}</Text>
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

            <Text style={[styles.label, { color: colors.text }]}>Instituição</Text>
            {instituicoes.length > 0 ? (
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={{ color: editInstituicao ? colors.text : colors.textLight, flex: 1 }}>
                  {editInstituicao || "Selecionar instituição"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textLight} />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={editInstituicao}
                onChangeText={setEditInstituicao}
                placeholder="Ex: IF Sertão-PE"
                placeholderTextColor={colors.textLight}
              />
            )}

            <Text style={[styles.label, { color: colors.text }]}>Redefinir Senha (vazio = manter)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: novaSenha ? colors.primary : colors.border, color: colors.text }]}
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Nova senha"
              placeholderTextColor={colors.textLight}
              secureTextEntry
            />

            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#FEE2E2" }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontWeight: "bold" }}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Picker de instituições */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecione a Instituição</Text>
            <FlatList
              data={[{ nome: "", sigla: "" }, ...instituicoes]}
              keyExtractor={(item, i) => item.nome || `_${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    editInstituicao === item.nome && { backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => { setEditInstituicao(item.nome); setPickerVisible(false); }}
                >
                  <Text style={[{ flex: 1, fontSize: 14, color: item.nome ? colors.text : colors.textLight }]}>
                    {item.nome || "Sem instituição"}
                  </Text>
                  {item.sigla ? <Text style={{ fontSize: 12, color: colors.textLight }}>{item.sigla}</Text> : null}
                  {editInstituicao === item.nome && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
  buscaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 20, marginTop: 14 },
  buscaInput: { flex: 1, fontSize: 14, padding: 0 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalScrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  modalContent: { padding: 25, borderRadius: 28, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  infoText: { fontSize: 12, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "bold", marginTop: 15, marginBottom: 6 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1 },
  pickerBtn: { flexDirection: "row", alignItems: "center" },
  footerRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "55%" },
  pickerTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 14 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
});
