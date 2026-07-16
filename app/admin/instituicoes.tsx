import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function GerenciarInstituicoes() {
  const { colors } = useTheme();
  const [instituicoes, setInstituicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [salvando, setSalvando] = useState(false);

  const fetchInstituicoes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("instituicoes")
      .select("*")
      .order("nome");
    setInstituicoes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchInstituicoes(); }, []);

  const handleSalvar = async () => {
    if (!nome.trim()) return appAlert.alert("Atenção", "Informe o nome da instituição.");
    setSalvando(true);
    const { error } = await supabase
      .from("instituicoes")
      .insert([{ nome: nome.trim(), sigla: sigla.trim() }]);
    setSalvando(false);
    if (error) {
      return appAlert.alert("Erro", error.code === "23505" ? "Instituição já cadastrada." : friendlyError(error, "Não foi possível salvar."));
    }
    setNome(""); setSigla("");
    setModalVisible(false);
    fetchInstituicoes();
  };

  const handleDeletar = async (inst: any) => {
    const { count } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("instituicao", inst.nome);

    if (count && count > 0) {
      return appAlert.alert(
        "Não é possível excluir",
        `Há ${count} aluno(s) vinculado(s) a "${inst.nome}". Reatribua-os a outra instituição antes de excluir, para evitar vínculos inválidos.`
      );
    }

    appAlert.alert(
      "Excluir instituição",
      `Remover "${inst.nome}"? Nenhum aluno está vinculado a ela.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir", style: "destructive",
          onPress: async () => {
            await supabase.from("instituicoes").delete().eq("id", inst.id);
            fetchInstituicoes();
          },
        },
      ]
    );
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Instituições</Text>
        <TouchableOpacity onPress={fetchInstituicoes} accessibilityRole="button" accessibilityLabel="Atualizar lista">
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Instituição</Text>
            <TextInput
              style={inputStyle}
              placeholder="Nome completo (Ex: IF Sertão-PE)"
              placeholderTextColor={colors.textLight}
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={inputStyle}
              placeholder="Sigla (Ex: IFSP)"
              placeholderTextColor={colors.textLight}
              value={sigla}
              onChangeText={setSigla}
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.border }]}
                onPress={() => { setModalVisible(false); setNome(""); setSigla(""); }}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }, salvando && { opacity: 0.7 }]}
                onPress={handleSalvar}
                disabled={salvando}
              >
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={instituicoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={48} color="#CBD5E1" />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhuma instituição cadastrada.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.siglaBox, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.sigla, { color: colors.primary }]}>
                  {item.sigla || item.nome.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.nome, { color: colors.text }]} numberOfLines={2}>{item.nome}</Text>
              <TouchableOpacity
                onPress={() => handleDeletar(item)}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={`Excluir instituição ${item.nome}`}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Adicionar instituição"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  siglaBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sigla: { fontWeight: "900", fontSize: 13 },
  nome: { flex: 1, fontSize: 14, fontWeight: "600" },
  deleteBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { padding: 25, borderRadius: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  input: { borderWidth: 1, padding: 14, borderRadius: 12 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 25, bottom: 25, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "600" },
});
