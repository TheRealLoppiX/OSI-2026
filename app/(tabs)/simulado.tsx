import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview"; // Nossos gráficos e mapas mentais rodam aqui
import { aiService } from "../../src/services/aiService";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function SimuladoNativo() {
  const { id, dadosIA, titulo } = useLocalSearchParams();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);

  // Estados para a Análise Gráfica do Ciel
  const [loadingIA, setLoadingIA] = useState(false);
  const [modalIAResultVisible, setModalIAResultVisible] = useState(false);
  const [htmlAnaliseCiel, setHtmlAnaliseCiel] = useState("");

  useEffect(() => {
    if (dadosIA) {
      try {
        setQuestions(JSON.parse(dadosIA as string));
        setLoading(false);
      } catch (e) {
        Alert.alert("Erro", "Falha ao processar questões.");
        router.back();
      }
    } else if (id) {
      fetchQuestions();
    }
  }, [id, dadosIA]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: simulado, error: simError } = await supabase
        .from("simulados")
        .select("questoes_ids")
        .eq("id", id)
        .single();

      if (
        simError ||
        !simulado ||
        !simulado.questoes_ids ||
        simulado.questoes_ids.length === 0
      ) {
        Alert.alert("Aviso", "Este simulado não possui questões vinculadas.");
        router.back();
        return;
      }

      const { data: questoes, error: qError } = await supabase
        .from("questoes")
        .select("*")
        .in("id", simulado.questoes_ids);

      if (questoes) {
        setQuestions(questoes.sort(() => Math.random() - 0.5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (letter: string) => {
    const correct = letter === questions[currentIdx].resposta_correta;
    setUserAnswers((prev) => [...prev, letter]);
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  // ⚡ AQUI ESTÁ A ARTIMANHA: Forçamos o Ciel a agir como Designer Front-end
  const handleAnalisarDesempenho = async () => {
    const erros = questions.filter(
      (q, i) => userAnswers[i] !== q.resposta_correta,
    );

    if (erros.length === 0) {
      return Alert.alert(
        "Gabaritou!",
        "OSIA identificou 100% de aproveitamento. Sem falhas estruturais para mapear!",
      );
    }

    setLoadingIA(true);
    try {
      const listaErros = erros.map(
        (q) =>
          `Questão: ${q.enunciado} | Matéria correspondente: ${q.materia || titulo || "Geral"}`,
      );

      // Montamos um super-prompt exigindo que o Ciel retorne APENAS o código HTML/CSS pronto para renderizar gráficos
      const superPromptDoCiel = `
        Você é OSIA, a inteligência artificial avançada da OSI. O estudante acabou de errar as seguintes questões em um simulado: ${JSON.stringify(listaErros)}.
        
        Gere uma ANÁLISE ABSURDAMENTE GRÁFICA e visual usando estritamente código HTML e CSS inline (não use bibliotecas externas de JS, use CSS puro, Flexbox, Grids, etc.).
        
        O layout deve ser dark mode moderno (#0F172A), futurista e focado na experiência do estudante. 
        Você DEVE incluir obrigatoriamente:
        1. Um "Painel de Diagnóstico OSIA" com barras de calor visuais mostrando quais matérias/tópicos estão críticos baseado nos erros.
        2. Um "MAPA MENTAL DE ERROS" interativo ou visual, feito com árvores estruturadas em CSS (blocos interligados por linhas ou fluxogramas) conectando o ERRO PRINCIPAL aos CONCEITOS CHAVE que ele precisa revisar para consertar a falha.
        3. Um plano de ação ninja em blocos visuais (cards modernos).

        Importante: Retorne APENAS o código HTML completo dentro da estrutura de string, começando com <html> e terminando com </html>. Não coloque textos explicativos fora do código.
      `;

      const codigoHtmlGerado = await aiService.askGemini(
        superPromptDoCiel,
        2500,
      );

      setHtmlAnaliseCiel(codigoHtmlGerado);
      setModalIAResultVisible(true);
    } catch (e) {
      Alert.alert(
        "Erro",
        "OSIA está reajustando os servidores. Tente novamente.",
      );
    } finally {
      setLoadingIA(false);
    }
  };

  const handleIrParaFlashcards = () => {
    const erros = questions.filter(
      (q, i) => userAnswers[i] !== q.resposta_correta,
    );
    if (erros.length === 0)
      return Alert.alert("Parabéns!", "Conteúdo dominado.");
    router.push({
      pathname: "/tutor/flashcards",
      params: { dados: JSON.stringify(erros) },
    } as any);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <ScrollView
        style={styles.resultContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultHeader}
        >
          <Text style={styles.resultMainTitle}>
            Você conseguiu! Teste concluído.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pontuação</Text>
              <Text style={styles.statValue}>
                {score}/{questions.length}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>de acerto</Text>
              <Text style={styles.statValue}>{percentage}%</Text>
            </View>
            <View style={[styles.statBox, { flex: 1.4 }]}>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Corretas</Text>
                <Text style={styles.miniValue}>{score}</Text>
              </View>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Erradas</Text>
                <Text style={styles.miniValue}>{questions.length - score}</Text>
              </View>
            </View>
          </View>

          {/* CARD DO CIEL INTEGRAÇÃO PREMIUM */}
          <View
            style={[
              styles.iaAnalysisCard,
              { borderColor: "#4F46E5", backgroundColor: "#1E1B4B" },
            ]}
          >
            <View style={[styles.iaIconBox, { backgroundColor: "#4F46E5" }]}>
              <MaterialCommunityIcons name="robot" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={[styles.iaCardTitle, { color: "#A5B4FC" }]}>
                Diagnóstico Gráfico OSIA
              </Text>
              <Text style={styles.iaCardSub}>
                Mapeamento analítico de falhas e geração de mapa mental
                customizado.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.iaBtn,
                { backgroundColor: "#4F46E5" },
                loadingIA && { opacity: 0.7 },
              ]}
              onPress={handleAnalisarDesempenho}
              disabled={loadingIA}
            >
              {loadingIA ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.iaBtnText}>Diagnosticar</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Continuar aprendendo</Text>
          <View style={styles.studyOptionsRow}>
            <TouchableOpacity
              style={styles.studyCard}
              onPress={handleIrParaFlashcards}
            >
              <View style={[styles.studyIcon, { backgroundColor: "#E0E7FF" }]}>
                <Ionicons name="copy" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.studyCardTitle}>Flashcards</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.finalBackBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.finalBackBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </MotiView>

        {/* 🎨 O SUPREMO MODAL WEBVIEW: ONDE O HTML/MAPA MENTAL DO CIEL É RENDERIZADO COM CSS PURO */}
        <Modal visible={modalIAResultVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <MotiView
              from={{ opacity: 0, translateY: 100 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.modalContentFull}
            >
              <View style={styles.iaModalHeader}>
                <MaterialCommunityIcons
                  name="shield"
                  size={28}
                  color="#4F46E5"
                />
                <Text style={styles.iaModalTitle}>
                  Ciel Analytics • Sistema OSI
                </Text>
                <TouchableOpacity
                  onPress={() => setModalIAResultVisible(false)}
                  style={styles.closeHeaderBtn}
                >
                  <Ionicons name="close-circle" size={28} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* WebView injetando dinamicamente a estrutura gráfica gerada pelo Ciel */}
              <View
                style={{
                  flex: 1,
                  width: "100%",
                  borderRadius: 15,
                  overflow: "hidden",
                }}
              >
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: htmlAnaliseCiel }}
                  style={{ flex: 1, backgroundColor: "#0F172A" }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </View>

              <TouchableOpacity
                style={styles.closeIAbnt}
                onPress={() => setModalIAResultVisible(false)}
              >
                <Text style={styles.closeIAbntText}>Fechar Painel Tático</Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  const q = questions[currentIdx];

  return (
    <View style={styles.container}>
      <Modal visible={showFeedback} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <MotiView
            from={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            style={styles.modalContentFeedback}
          >
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "close-circle"}
              size={60}
              color={isCorrect ? Colors.accent : "#EF4444"}
            />
            <Text
              style={[
                styles.feedbackTitle,
                { color: isCorrect ? Colors.accent : "#EF4444" },
              ]}
            >
              {isCorrect ? "Acertou!" : "Ops, errou!"}
            </Text>
            <ScrollView style={{ width: "100%", marginBottom: 20 }}>
              <Text style={styles.feedbackLabel}>Justificativa:</Text>
              <Text style={styles.feedbackText}>
                {q?.justificativa || "Analise a alternativa com atenção."}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
              <Text style={styles.nextBtnText}>Continuar</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </Modal>

      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {titulo || "Simulado"} - {currentIdx + 1}/{questions.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIdx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.enunciado}>{q?.enunciado}</Text>
      {["a", "b", "c", "d"].map((l) => (
        <TouchableOpacity
          key={l}
          style={styles.optBtn}
          onPress={() => handleAnswer(l.toUpperCase())}
        >
          <View style={styles.optLetter}>
            <Text style={styles.optLetterText}>{l.toUpperCase()}</Text>
          </View>
          <Text style={styles.optText}>{q?.[`opcao_${l}`]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 25 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  progressHeader: { marginTop: 40, marginBottom: 30 },
  progressText: { fontWeight: "bold", color: Colors.textLight, fontSize: 13 },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    marginTop: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  enunciado: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 25,
  },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 12,
    elevation: 1,
  },
  optLetter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  optLetterText: { color: "#fff", fontWeight: "bold" },
  optText: { flex: 1, color: Colors.text },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },

  modalContentFeedback: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    maxHeight: "80%",
  },
  modalContentFull: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: "90%",
    width: "100%",
    alignItems: "center",
  },

  feedbackTitle: { fontSize: 22, fontWeight: "bold", marginVertical: 15 },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.textLight,
    marginTop: 15,
    marginBottom: 5,
  },
  feedbackText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  nextBtn: {
    backgroundColor: Colors.primary,
    width: "100%",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontWeight: "bold" },

  resultContainer: { flex: 1, backgroundColor: "#0F172A" },
  resultHeader: { padding: 25, paddingTop: 60 },
  resultMainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 25,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 15,
    justifyContent: "center",
  },
  statLabel: { color: "#94A3B8", fontSize: 12, marginBottom: 5 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  miniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  miniLabel: { color: "#94A3B8", fontSize: 11 },
  miniValue: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  iaAnalysisCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  iaIconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iaCardTitle: { fontSize: 14, fontWeight: "bold" },
  iaCardSub: { color: "#94A3B8", fontSize: 11, marginTop: 4 },
  iaBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  iaBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 30,
    marginBottom: 15,
  },
  studyOptionsRow: { flexDirection: "row", gap: 12 },
  studyCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  studyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  studyCardTitle: { color: "#fff", fontSize: 13, fontWeight: "bold" },

  finalBackBtn: {
    marginTop: 30,
    backgroundColor: "#334155",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  finalBackBtnText: { color: "#fff", fontWeight: "bold" },

  iaModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    marginBottom: 15,
  },
  iaModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
    flex: 1,
  },
  closeHeaderBtn: { padding: 5 },
  closeIAbnt: {
    backgroundColor: "#4F46E5",
    width: "100%",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 15,
  },
  closeIAbntText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
