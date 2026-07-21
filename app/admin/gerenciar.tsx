import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useTheme } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function GerenciarSimulados() {
  const { colors } = useTheme();
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaMateria, setNovaMateria] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [modalQuestoesVisible, setModalQuestoesVisible] = useState(false);
  const [questoesBanco, setQuestoesBanco] = useState<any[]>([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([]);
  const [simuladoSelecionado, setSimuladoSelecionado] = useState<any>(null);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [buscaQuestao, setBuscaQuestao] = useState("");

  const fetchSimulados = async () => {
    setLoading(true);
    const { data } = await supabase.from("simulados").select("*").order("created_at", { ascending: false });
    setSimulados(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSimulados(); }, []);

  const handleCriarSimulado = async () => {
    if (!novoTitulo || !novaMateria) return appAlert.alert("Erro", "Título e Matéria são obrigatórios.");
    const { error } = await supabase.from("simulados").insert([{ titulo: novoTitulo, materia: novaMateria, url_google_forms: novaUrl || null }]);
    if (!error) {
      setModalVisible(false);
      setNovoTitulo(""); setNovaMateria(""); setNovaUrl("");
      fetchSimulados();
      appAlert.alert("Sucesso", "Simulado criado!");
    } else {
      appAlert.alert("Erro", friendlyError(error, "Não foi possível criar o simulado."));
    }
  };

  const abrirVinculoQuestoes = async (simulado: any) => {
    setSimuladoSelecionado(simulado);
    setQuestoesSelecionadas(simulado.questoes_ids || []);
    setBuscaQuestao("");
    setModalQuestoesVisible(true);
    setLoadingQuestoes(true);
    try {
      const { data, error } = await supabase.from("questoes").select("id, enunciado, materia, dificuldade").order("created_at", { ascending: false });
      if (!error && data) setQuestoesBanco(data);
    } finally {
      setLoadingQuestoes(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setQuestoesSelecionadas((prev) => prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]);
  };

  const handleEditarQuestao = (questao: any) => {
    setModalQuestoesVisible(false);
    router.push({
      pathname: "/admin/cadastrar-questao",
      params: { questaoId: questao.id, questaoData: JSON.stringify(questao) },
    } as any);
  };

  const handleDeletarQuestao = async (questao: any) => {
    // Evita apagar uma questão que ainda está vinculada a algum simulado —
    // deixaria o array questoes_ids desse simulado com um id inválido.
    const { data: vinculados } = await supabase
      .from("simulados")
      .select("id, titulo")
      .contains("questoes_ids", [questao.id]);

    if (vinculados && vinculados.length > 0) {
      return appAlert.alert(
        "Não é possível excluir",
        `Esta questão está vinculada a: ${vinculados.map((s: any) => s.titulo).join(", ")}. Desvincule-a desses simulados antes de excluir.`
      );
    }

    appAlert.alert("Excluir questão", `Remover esta questão do banco?\n\n"${questao.enunciado.substring(0, 80)}..."`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir", style: "destructive",
        onPress: async () => {
          const { data, error } = await supabase.from("questoes").delete().eq("id", questao.id).select();
          if (error) return appAlert.alert("Erro", friendlyError(error, "Falha ao excluir a questão."));
          if (!data || data.length === 0) {
            return appAlert.alert("Erro", "Não foi possível excluir a questão. Verifique as permissões de exclusão no banco de dados.");
          }
          // Remove dos vínculos do simulado atual se estava selecionada
          setQuestoesSelecionadas((prev) => prev.filter((id) => id !== questao.id));
          setQuestoesBanco((prev) => prev.filter((q) => q.id !== questao.id));
        },
      },
    ]);
  };

  const questoesFiltradas = buscaQuestao.trim()
    ? questoesBanco.filter((q) => {
        const termo = buscaQuestao.trim().toLowerCase();
        return (
          q.enunciado?.toLowerCase().includes(termo) ||
          q.materia?.toLowerCase().includes(termo) ||
          q.dificuldade?.toLowerCase().includes(termo)
        );
      })
    : questoesBanco;

  const handleSelecionarFiltradas = () => {
    setQuestoesSelecionadas((prev) => {
      const ids = questoesFiltradas.map((q) => q.id);
      const todasJaSelecionadas = ids.every((id) => prev.includes(id));
      return todasJaSelecionadas ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])];
    });
  };

  // Estatísticas simples derivadas do banco de questões já carregado
  const statsQuestoes = {
    total: questoesBanco.length,
    facil: questoesBanco.filter((q) => q.dificuldade === "Fácil").length,
    media: questoesBanco.filter((q) => q.dificuldade === "Média").length,
    dificil: questoesBanco.filter((q) => q.dificuldade === "Difícil").length,
    materias: new Set(questoesBanco.map((q) => q.materia).filter(Boolean)).size,
  };

  const handleSalvarQuestoesNoSimulado = async () => {
    try {
      setSalvandoVinculo(true);
      const { data, error } = await supabase
        .from("simulados")
        .update({ questoes_ids: questoesSelecionadas, total_questoes: questoesSelecionadas.length })
        .eq("id", simuladoSelecionado.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Não foi possível confirmar o vínculo. Verifique as permissões de escrita no banco de dados.");
      }
      appAlert.alert("Sucesso!", `${questoesSelecionadas.length} questões vinculadas.`);
      setModalQuestoesVisible(false);
      fetchSimulados();
    } catch (error: any) {
      appAlert.alert("Erro ao Vincular", friendlyError(error, "Não foi possível vincular as questões."));
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const handleDeletarSimulado = async (simulado: any) => {
    // Evita apagar um simulado que já tem tentativas de alunos registradas —
    // perderia o histórico/gabarito referenciado por essas tentativas.
    const { count } = await supabase
      .from("tentativas")
      .select("id", { count: "exact", head: true })
      .eq("simulado_id", simulado.id);

    if (count && count > 0) {
      return appAlert.alert(
        "Não é possível excluir",
        `${count} aluno(s) já têm tentativas registradas neste simulado. Excluir agora apagaria esse histórico.`
      );
    }

    appAlert.alert("Excluir Simulado", `Deseja excluir "${simulado.titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir", style: "destructive",
        onPress: async () => {
          const { data, error } = await supabase.from("simulados").delete().eq("id", simulado.id).select();
          if (error) return appAlert.alert("Erro", friendlyError(error, "Falha ao excluir o simulado."));
          if (!data || data.length === 0) {
            return appAlert.alert("Erro", "Não foi possível excluir o simulado. Verifique as permissões de exclusão no banco de dados.");
          }
          fetchSimulados();
        },
      },
    ]);
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Simulados</Text>
        <TouchableOpacity onPress={fetchSimulados} accessibilityRole="button" accessibilityLabel="Atualizar lista">
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.atalhos}>
        <TouchableOpacity
          style={[styles.atalhoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/admin/cadastrar-questao" as any)}
        >
          <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.atalhoBtnText, { color: colors.primary }]}>Banco de Questões</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Simulado</Text>
            <TextInput style={inputStyle} placeholder="Título do Simulado" placeholderTextColor={colors.textLight} value={novoTitulo} onChangeText={setNovoTitulo} />
            <TextInput style={inputStyle} placeholder="Matéria (Ex: Redes, Hardware)" placeholderTextColor={colors.textLight} value={novaMateria} onChangeText={setNovaMateria} />
            <TextInput style={inputStyle} placeholder="URL Google Forms (Opcional)" placeholderTextColor={colors.textLight} value={novaUrl} onChangeText={setNovaUrl} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleCriarSimulado}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: VINCULAR QUESTÕES */}
      <Modal visible={modalQuestoesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: "85%" }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Vincular Questões</Text>
            <Text style={[styles.subtextModal, { color: colors.textLight }]}>
              {simuladoSelecionado?.titulo} · {questoesSelecionadas.length} selecionadas
            </Text>

            <TouchableOpacity
              style={[styles.criarQuestaoBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setModalQuestoesVisible(false);
                router.push({ pathname: "/admin/cadastrar-questao", params: { simuladoId: simuladoSelecionado?.id } } as any);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.criarQuestaoBtnText}>Criar Nova Questão</Text>
            </TouchableOpacity>

            {/* Estatísticas rápidas do banco */}
            {!loadingQuestoes && questoesBanco.length > 0 && (
              <View style={[styles.statsRow, { backgroundColor: colors.bg }]}>
                <View style={styles.statChip}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{statsQuestoes.total}</Text>
                  <Text style={styles.statLbl}>Total</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statNum, { color: "#10B981" }]}>{statsQuestoes.facil}</Text>
                  <Text style={styles.statLbl}>Fáceis</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statNum, { color: "#F59E0B" }]}>{statsQuestoes.media}</Text>
                  <Text style={styles.statLbl}>Médias</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statNum, { color: "#EF4444" }]}>{statsQuestoes.dificil}</Text>
                  <Text style={styles.statLbl}>Difíceis</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statNum, { color: colors.textLight }]}>{statsQuestoes.materias}</Text>
                  <Text style={styles.statLbl}>Matérias</Text>
                </View>
              </View>
            )}

            {!loadingQuestoes && questoesBanco.length > 0 && (
              <View style={[styles.buscaRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textLight} />
                <TextInput
                  style={[styles.buscaInput, { color: colors.text }]}
                  placeholder="Buscar por enunciado, matéria ou dificuldade..."
                  placeholderTextColor={colors.textLight}
                  value={buscaQuestao}
                  onChangeText={setBuscaQuestao}
                />
                {buscaQuestao.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscaQuestao("")} accessibilityRole="button" accessibilityLabel="Limpar busca">
                    <Ionicons name="close-circle" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!loadingQuestoes && buscaQuestao.trim().length > 0 && (
              <TouchableOpacity onPress={handleSelecionarFiltradas} style={styles.selecionarFiltradasBtn}>
                <Text style={[styles.selecionarFiltradasText, { color: colors.primary }]}>
                  {questoesFiltradas.every((q) => questoesSelecionadas.includes(q.id)) && questoesFiltradas.length > 0
                    ? `Desmarcar ${questoesFiltradas.length} resultado(s)`
                    : `Selecionar ${questoesFiltradas.length} resultado(s)`}
                </Text>
              </TouchableOpacity>
            )}

            {loadingQuestoes ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : questoesBanco.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-buoy-outline" size={40} color="#CBD5E1" />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhuma questão no banco ainda.</Text>
              </View>
            ) : questoesFiltradas.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhuma questão encontrada para "{buscaQuestao}".</Text>
              </View>
            ) : (
              <FlatList
                data={questoesFiltradas}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const isChecked = questoesSelecionadas.includes(item.id);
                  return (
                    <View style={[styles.questaoRow, { backgroundColor: colors.bg, borderColor: colors.border }, isChecked && { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}>
                      <TouchableOpacity
                        onPress={() => handleToggleSelect(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={isChecked ? "Remover seleção da questão" : "Selecionar questão"}
                      >
                        <Ionicons name={isChecked ? "checkbox" : "square-outline"} size={22} color={isChecked ? colors.primary : "#94A3B8"} />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleToggleSelect(item.id)}>
                        <Text style={[styles.questaoTextoForm, { color: colors.text }]} numberOfLines={2}>{item.enunciado}</Text>
                        <View style={styles.questaoMeta}>
                          {item.materia && <Text style={styles.questaoTag}>{item.materia}</Text>}
                          {item.dificuldade && (
                            <Text style={[
                              styles.questaoTag,
                              item.dificuldade === "Fácil" && { backgroundColor: "#DCFCE7", color: "#166534" },
                              item.dificuldade === "Difícil" && { backgroundColor: "#FEE2E2", color: "#991B1B" },
                            ]}>{item.dificuldade}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      {/* Ações de edição e exclusão da questão */}
                      <TouchableOpacity
                        onPress={() => handleEditarQuestao(item)}
                        style={styles.questaoAction}
                        accessibilityRole="button"
                        accessibilityLabel="Editar questão"
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletarQuestao(item)}
                        style={styles.questaoAction}
                        accessibilityRole="button"
                        accessibilityLabel="Excluir questão"
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => setModalQuestoesVisible(false)} disabled={salvandoVinculo}>
                <Text style={{ color: colors.text }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleSalvarQuestoesNoSimulado} disabled={salvandoVinculo}>
                {salvandoVinculo ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : simulados.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={50} color="#CBD5E1" />
          <Text style={[styles.emptyText, { color: colors.textLight }]}>Nenhum simulado criado.</Text>
        </View>
      ) : (
        <FlatList
          data={simulados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.cardMateria, { color: colors.textLight }]}>{item.materia}</Text>
                <Text style={[styles.cardQtd, { color: colors.primary }]}>{item.questoes_ids?.length || 0} questões vinculadas</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#EFF6FF" }]}
                  onPress={() => router.push({ pathname: "/admin/cadastrar-questao", params: { simuladoId: item.id } } as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Criar questão para este simulado"
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#F0FDF4" }]}
                  onPress={() => abrirVinculoQuestoes(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Vincular questões"
                >
                  <Ionicons name="link-outline" size={18} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#FFF5F5" }]}
                  onPress={() => handleDeletarSimulado(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir simulado"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Criar novo simulado"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, padding: 25, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: "bold" },
  atalhos: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginVertical: 12 },
  atalhoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  atalhoBtnText: { fontWeight: "600", fontSize: 13 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 2, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "bold" },
  cardMateria: { fontSize: 12, marginTop: 2 },
  cardQtd: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  fab: { position: "absolute", right: 25, bottom: 25, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtextModal: { fontSize: 13, marginBottom: 12 },
  criarQuestaoBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 14, justifyContent: "center" },
  criarQuestaoBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 12 },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  questaoRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8, gap: 10 },
  questaoAction: { padding: 4 },
  buscaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  buscaInput: { flex: 1, fontSize: 13, padding: 0 },
  selecionarFiltradasBtn: { alignSelf: "flex-start", marginBottom: 8 },
  selecionarFiltradasText: { fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", borderRadius: 12, padding: 10, marginBottom: 10, gap: 4, flexWrap: "wrap" },
  statChip: { flex: 1, minWidth: 50, alignItems: "center", padding: 6 },
  statNum: { fontSize: 16, fontWeight: "900" },
  statLbl: { fontSize: 9, color: "#94A3B8", fontWeight: "600", marginTop: 1 },
  questaoTextoForm: { fontSize: 13, marginBottom: 6 },
  questaoMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  questaoTag: { fontSize: 10, fontWeight: "600", backgroundColor: "#F1F5F9", color: "#64748B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 16, fontWeight: "bold", marginTop: 12 },
});
