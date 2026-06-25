import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function GerenciarSimulados() {
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Criar Simulado
  const [modalVisible, setModalVisible] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaMateria, setNovaMateria] = useState("");
  const [novaUrl, setNovaUrl] = useState("");

  // Modal: Vincular Questões
  const [modalQuestoesVisible, setModalQuestoesVisible] = useState(false);
  const [questoesBanco, setQuestoesBanco] = useState<any[]>([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<number[]>([]);
  const [simuladoSelecionado, setSimuladoSelecionado] = useState<any>(null);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);

  const fetchSimulados = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("simulados")
      .select("*")
      .order("created_at", { ascending: false });
    setSimulados(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSimulados(); }, []);

  const handleCriarSimulado = async () => {
    if (!novoTitulo || !novaMateria)
      return Alert.alert("Erro", "Título e Matéria são obrigatórios.");

    const { error } = await supabase.from("simulados").insert([{
      titulo: novoTitulo,
      materia: novaMateria,
      url_google_forms: novaUrl || null,
    }]);

    if (!error) {
      setModalVisible(false);
      setNovoTitulo(""); setNovaMateria(""); setNovaUrl("");
      fetchSimulados();
      Alert.alert("Sucesso", "Simulado criado!");
    } else {
      Alert.alert("Erro", error.message);
    }
  };

  const abrirVinculoQuestoes = async (simulado: any) => {
    setSimuladoSelecionado(simulado);
    // Pré-seleciona as questões já vinculadas
    setQuestoesSelecionadas(simulado.questoes_ids || []);
    setModalQuestoesVisible(true);
    setLoadingQuestoes(true);

    try {
      const { data, error } = await supabase
        .from("questoes")
        .select("id, enunciado, materia, dificuldade")
        .order("created_at", { ascending: false });

      if (!error && data) setQuestoesBanco(data);
    } catch (err) {
      console.error("Erro ao carregar questões", err);
    } finally {
      setLoadingQuestoes(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    setQuestoesSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleSalvarQuestoesNoSimulado = async () => {
    try {
      setSalvandoVinculo(true);
      const { error } = await supabase
        .from("simulados")
        .update({
          questoes_ids: questoesSelecionadas,
          total_questoes: questoesSelecionadas.length,
        })
        .eq("id", simuladoSelecionado.id);

      if (error) throw error;
      Alert.alert("Sucesso!", `${questoesSelecionadas.length} questões vinculadas.`);
      setModalQuestoesVisible(false);
      fetchSimulados();
    } catch (error: any) {
      Alert.alert("Erro ao Vincular", error.message);
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const handleDeletarSimulado = (simulado: any) => {
    Alert.alert(
      "Excluir Simulado",
      `Deseja excluir "${simulado.titulo}"? As questões do banco não serão removidas.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await supabase.from("simulados").delete().eq("id", simulado.id);
            fetchSimulados();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Simulados</Text>
        <TouchableOpacity onPress={fetchSimulados}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Atalhos rápidos */}
      <View style={styles.atalhos}>
        <TouchableOpacity
          style={styles.atalhoBtn}
          onPress={() => router.push("/admin/cadastrar-questao" as any)}
        >
          <Ionicons name="help-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.atalhoBtnText}>Banco de Questões</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.atalhoBtn, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
          onPress={() => router.push("/admin/importar-questoes" as any)}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#10B981" />
          <Text style={[styles.atalhoBtnText, { color: "#10B981" }]}>Importar Planilha</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: CRIAR SIMULADO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Simulado</Text>
            <TextInput
              style={styles.input}
              placeholder="Título do Simulado"
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />
            <TextInput
              style={styles.input}
              placeholder="Matéria (Ex: Redes, Hardware)"
              value={novaMateria}
              onChangeText={setNovaMateria}
            />
            <TextInput
              style={styles.input}
              placeholder="URL Google Forms (Opcional)"
              value={novaUrl}
              onChangeText={setNovaUrl}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#E2E8F0" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: Colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleCriarSimulado}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: VINCULAR QUESTÕES */}
      <Modal visible={modalQuestoesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>
              Vincular Questões
            </Text>
            <Text style={styles.subtextModal}>
              {simuladoSelecionado?.titulo} · {questoesSelecionadas.length} selecionadas
            </Text>

            {/* Botão para criar nova questão direto daqui */}
            <TouchableOpacity
              style={styles.criarQuestaoBtn}
              onPress={() => {
                setModalQuestoesVisible(false);
                router.push({
                  pathname: "/admin/cadastrar-questao",
                  params: { simuladoId: simuladoSelecionado?.id },
                } as any);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.criarQuestaoBtnText}>Criar Nova Questão</Text>
            </TouchableOpacity>

            {loadingQuestoes ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 30 }} />
            ) : questoesBanco.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-buoy-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>Nenhuma questão no banco ainda.</Text>
                <Text style={styles.emptySubText}>Use o botão acima para criar a primeira.</Text>
              </View>
            ) : (
              <FlatList
                data={questoesBanco}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const isChecked = questoesSelecionadas.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.questaoRow, isChecked && styles.questaoRowSelected]}
                      onPress={() => handleToggleSelect(item.id)}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={22}
                        color={isChecked ? Colors.primary : "#94A3B8"}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questaoTextoForm} numberOfLines={2}>
                          {item.enunciado}
                        </Text>
                        <View style={styles.questaoMeta}>
                          {item.materia && (
                            <Text style={styles.questaoTag}>{item.materia}</Text>
                          )}
                          {item.dificuldade && (
                            <Text style={[
                              styles.questaoTag,
                              item.dificuldade === "Fácil" && { backgroundColor: "#DCFCE7", color: "#166534" },
                              item.dificuldade === "Difícil" && { backgroundColor: "#FEE2E2", color: "#991B1B" },
                            ]}>
                              {item.dificuldade}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#E2E8F0" }]}
                onPress={() => setModalQuestoesVisible(false)}
                disabled={salvandoVinculo}
              >
                <Text style={{ color: Colors.text }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleSalvarQuestoesNoSimulado}
                disabled={salvandoVinculo}
              >
                {salvandoVinculo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LISTA DE SIMULADOS */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : simulados.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={50} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nenhum simulado criado.</Text>
          <Text style={styles.emptySubText}>Toque no + para criar o primeiro.</Text>
        </View>
      ) : (
        <FlatList
          data={simulados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <Text style={styles.cardMateria}>{item.materia}</Text>
                <Text style={styles.cardQtd}>
                  {item.questoes_ids?.length || 0} questões vinculadas
                </Text>
              </View>
              <View style={styles.cardActions}>
                {/* Criar nova questão para este simulado */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#EFF6FF" }]}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/cadastrar-questao",
                      params: { simuladoId: item.id },
                    } as any)
                  }
                >
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
                {/* Vincular questões existentes */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#F0FDF4" }]}
                  onPress={() => abrirVinculoQuestoes(item)}
                >
                  <Ionicons name="link-outline" size={18} color="#10B981" />
                </TouchableOpacity>
                {/* Excluir simulado */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#FFF5F5" }]}
                  onPress={() => handleDeletarSimulado(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  atalhos: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  atalhoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  atalhoBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: Colors.text },
  cardMateria: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  cardQtd: { fontSize: 11, color: Colors.primary, marginTop: 4, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 25,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text, marginBottom: 4 },
  subtextModal: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  criarQuestaoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    justifyContent: "center",
  },
  criarQuestaoBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  questaoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    backgroundColor: "#FAFAFA",
  },
  questaoRowSelected: { borderColor: Colors.primary, backgroundColor: "#EFF6FF" },
  questaoTextoForm: { fontSize: 13, color: "#334155", marginBottom: 6 },
  questaoMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  questaoTag: {
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: "#94A3B8", marginTop: 12 },
  emptySubText: { fontSize: 13, color: "#CBD5E1", marginTop: 4, textAlign: "center" },
});
