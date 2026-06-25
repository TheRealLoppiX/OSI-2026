import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

  // Estados para Criar Simulado
  const [modalVisible, setModalVisible] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaMateria, setNovaMateria] = useState("");
  const [novaUrl, setNovaUrl] = useState("");

  // Estados para Vincular Questões do Banco
  const [modalQuestoesVisible, setModalQuestoesVisible] = useState(false);
  const [questoesBanco, setQuestoesBanco] = useState<any[]>([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<number[]>(
    [],
  );
  const [simuladoSelecionadoId, setSimuladoSelecionadoId] = useState<any>(null);
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

  const handleCriarSimulado = async () => {
    if (!novoTitulo || !novaMateria)
      return Alert.alert("Erro", "Título e Matéria são obrigatórios.");

    const { error } = await supabase.from("simulados").insert([
      {
        titulo: novoTitulo,
        materia: novaMateria,
        url_google_forms: novaUrl || null,
      },
    ]);

    if (!error) {
      setModalVisible(false);
      setNovoTitulo("");
      setNovaMateria("");
      setNovaUrl("");
      fetchSimulados();
      Alert.alert("Sucesso", "Simulado criado!");
    } else {
      Alert.alert("Erro", error.message);
    }
  };

  // 1. Abre o modal de questões e puxa os registros existentes do banco
  const abrirVinculoQuestoes = async (simulado: any) => {
    setSimuladoSelecionadoId(simulado.id);
    setModalQuestoesVisible(true);
    setLoadingQuestoes(true);

    try {
      const { data, error } = await supabase
        .from("questoes")
        .select("id, enunciado")
        .order("id", { ascending: false });

      if (!error && data) {
        setQuestoesBanco(data);
      }
    } catch (err) {
      console.error("Erro ao carregar banco de questões", err);
    } finally {
      setLoadingQuestoes(false);
    }
  };

  // 2. Controla o liga/desliga do checkbox de IDs
  const handleToggleSelect = (id: number) => {
    if (questoesSelecionadas.includes(id)) {
      setQuestoesSelecionadas(questoesSelecionadas.filter((qId) => qId !== id));
    } else {
      setQuestoesSelecionadas([...questoesSelecionadas, id]);
    }
  };

  // 3. Grava o array atualizado de ids selecionados na linha do simulado
  const handleSalvarQuestoesNoSimulado = async () => {
    try {
      setSalvandoVinculo(true);

      const { error } = await supabase
        .from("simulados")
        .update({
          questoes_ids: questoesSelecionadas,
          total_questoes: questoesSelecionadas.length,
        })
        .eq("id", simuladoSelecionadoId);

      if (error) throw error;

      Alert.alert("Sucesso!", "Banco de questões vinculado ao simulado.");
      setModalQuestoesVisible(false);
      fetchSimulados(); // Recarrega a listagem de simulados da tela principal
    } catch (error: any) {
      Alert.alert("Erro ao Vincular", error.message);
    } finally {
      setSalvandoVinculo(false);
    }
  };

  useEffect(() => {
    fetchSimulados();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Simulados e Pastas</Text>
        <TouchableOpacity onPress={fetchSimulados}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* MODAL 1: PARA CRIAR NOVO SIMULADO */}
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
                style={[styles.btn, { backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleCriarSimulado}
              >
                <Text style={{ color: "#fff" }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: SELECIONAR QUESTÕES DO BANCO */}
      <Modal visible={modalQuestoesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Vincular Questões Cadastradas</Text>
            <Text style={styles.subtextModal}>
              Marque as questões que farão parte deste simulado (
              {questoesSelecionadas.length} selecionadas).
            </Text>

            {loadingQuestoes ? (
              <ActivityIndicator
                size="large"
                color={Colors.primary}
                style={{ marginVertical: 30 }}
              />
            ) : (
              <FlatList
                data={questoesBanco}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 15 }}
                renderItem={({ item }) => {
                  const isChecked = questoesSelecionadas.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.questaoRow,
                        isChecked && styles.questaoRowSelected,
                      ]}
                      onPress={() => handleToggleSelect(item.id)}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={22}
                        color={isChecked ? Colors.primary : "#94A3B8"}
                      />
                      <Text style={styles.questaoTextoForm} numberOfLines={2}>
                        {item.enunciado}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#ccc" }]}
                onPress={() => setModalQuestoesVisible(false)}
                disabled={salvandoVinculo}
              >
                <Text>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.primary }]}
                onPress={handleSalvarQuestoesNoSimulado}
                disabled={salvandoVinculo}
              >
                {salvandoVinculo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Salvar Vínculos
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LISTA PRINCIPAL DE SIMULADOS */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={simulados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <Text style={styles.cardMateria}>
                  {item.materia} {item.url_google_forms && "🔗"}
                </Text>
              </View>
              {/* Botão modificado para abrir a lista do banco de questões */}
              <TouchableOpacity onPress={() => abrirVinculoQuestoes(item)}>
                <Ionicons name="add-circle" size={34} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
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
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  cardMateria: { fontSize: 12, color: Colors.textLight },
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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  subtextModal: { fontSize: 13, color: "#64748B", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
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
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    backgroundColor: "#FAFAFA",
  },
  questaoRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  questaoTextoForm: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
});
