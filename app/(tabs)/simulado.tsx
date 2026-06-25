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
import { WebView } from "react-native-webview";
import { aiService } from "../../src/services/aiService";
import { authService } from "../../src/services/auth";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

function getPerformanceTier(pct: number) {
  if (pct >= 80) return { label: "Excelente!", cor: "#10B981", bg: "#ECFDF5" };
  if (pct >= 60) return { label: "Bom Desempenho", cor: "#3B82F6", bg: "#EFF6FF" };
  if (pct >= 40) return { label: "Em Desenvolvimento", cor: "#F59E0B", bg: "#FFFBEB" };
  return { label: "Precisa Revisar", cor: "#EF4444", bg: "#FEF2F2" };
}

export default function SimuladoNativo() {
  const { id, dadosIA, titulo } = useLocalSearchParams();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [xpGanho, setXpGanho] = useState(0);

  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);

  const [loadingIA, setLoadingIA] = useState(false);
  const [modalIAResultVisible, setModalIAResultVisible] = useState(false);
  const [htmlAnaliseOSIA, setHtmlAnaliseOSIA] = useState("");

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

      if (simError || !simulado?.questoes_ids?.length) {
        Alert.alert("Aviso", "Este simulado não possui questões vinculadas.");
        router.back();
        return;
      }

      const { data: questoes } = await supabase
        .from("questoes")
        .select("*")
        .in("id", simulado.questoes_ids);

      if (questoes) setQuestions(questoes.sort(() => Math.random() - 0.5));
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

  const nextQuestion = async () => {
    setShowFeedback(false);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      const finalScore = score + (isCorrect ? 0 : 0); // score já foi incrementado
      const xp = score * 10;
      setXpGanho(xp);
      setFinished(true);

      // Salva XP no banco
      try {
        const user = await authService.getUser();
        if (user?.id && xp > 0) {
          await authService.adicionarXP(user.id, xp);
        }
      } catch (e) {
        console.error("Erro ao salvar XP", e);
      }
    }
  };

  const handleAnalisarDesempenho = async () => {
    const erros = questions.filter((q, i) => userAnswers[i] !== q.resposta_correta);

    if (erros.length === 0) {
      return Alert.alert("Gabaritou!", "OSIA identificou 100% de aproveitamento. Sem falhas para mapear!");
    }

    setLoadingIA(true);
    try {
      const listaErros = erros.map(
        (q) => `Questão: ${q.enunciado} | Matéria: ${q.materia || titulo || "Geral"}`
      );

      const superPromptOSIA = `
        Você é OSIA, a IA da OSI. O estudante errou: ${JSON.stringify(listaErros)}.

        Gere uma ANÁLISE GRÁFICA usando HTML e CSS inline (sem libs JS externas).
        Dark mode (#0F172A), futurista. INCLUA:
        1. "Painel de Diagnóstico OSIA" com barras visuais de calor por matéria/tópico.
        2. "MAPA MENTAL DE ERROS" em árvore CSS mostrando erro → conceitos para revisar.
        3. Plano de ação em cards modernos.

        Retorne APENAS o HTML completo começando com <html> e terminando com </html>.
      `;

      const html = await aiService.askGemini(superPromptOSIA, 2500);
      setHtmlAnaliseOSIA(html);
      setModalIAResultVisible(true);
    } catch (e) {
      Alert.alert("Erro", "OSIA está reajustando os servidores. Tente novamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  const handleIrParaFlashcards = () => {
    const erros = questions.filter((q, i) => userAnswers[i] !== q.resposta_correta);
    if (erros.length === 0) return Alert.alert("Parabéns!", "Conteúdo dominado.");
    router.push({
      pathname: "/tutor/flashcards",
      params: { dados: JSON.stringify(erros) },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const tier = getPerformanceTier(percentage);
    const erros = questions.filter((q, i) => userAnswers[i] !== q.resposta_correta);

    return (
      <ScrollView style={styles.resultContainer} contentContainerStyle={{ paddingBottom: 50 }}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultHeader}
        >
          {/* Badge de desempenho */}
          <View style={[styles.tierBadge, { backgroundColor: tier.bg, borderColor: tier.cor }]}>
            <Text style={[styles.tierText, { color: tier.cor }]}>{tier.label}</Text>
          </View>

          <Text style={styles.resultMainTitle}>Simulado concluído!</Text>

          {/* XP ganho */}
          {xpGanho > 0 && (
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 300 }}
              style={styles.xpBadge}
            >
              <Ionicons name="flash" size={20} color="#FFD700" />
              <Text style={styles.xpText}>+{xpGanho} XP ganhos!</Text>
            </MotiView>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pontuação</Text>
              <Text style={styles.statValue}>{score}/{questions.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Acertos</Text>
              <Text style={[styles.statValue, { color: "#10B981" }]}>{percentage}%</Text>
            </View>
            <View style={[styles.statBox, { flex: 1.4 }]}>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Corretas</Text>
                <Text style={[styles.miniValue, { color: "#10B981" }]}>{score}</Text>
              </View>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Erradas</Text>
                <Text style={[styles.miniValue, { color: "#EF4444" }]}>{questions.length - score}</Text>
              </View>
            </View>
          </View>

          {/* Barra de progresso visual */}
          <View style={styles.progressTrack}>
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: "timing", duration: 800, delay: 200 }}
              style={[styles.progressFill, { backgroundColor: tier.cor }]}
            />
          </View>

          {/* Ações IA */}
          <View style={[styles.iaAnalysisCard, { borderColor: "#4F46E5", backgroundColor: "#1E1B4B" }]}>
            <View style={[styles.iaIconBox, { backgroundColor: "#4F46E5" }]}>
              <MaterialCommunityIcons name="robot" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={[styles.iaCardTitle, { color: "#A5B4FC" }]}>Diagnóstico OSIA</Text>
              <Text style={styles.iaCardSub}>Mapa mental + plano de ação para seus erros.</Text>
            </View>
            <TouchableOpacity
              style={[styles.iaBtn, { backgroundColor: "#4F46E5" }, loadingIA && { opacity: 0.7 }]}
              onPress={handleAnalisarDesempenho}
              disabled={loadingIA}
            >
              {loadingIA ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.iaBtnText}>Analisar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Continuar aprendendo */}
          <Text style={styles.sectionTitle}>Continuar aprendendo</Text>
          <View style={styles.studyOptionsRow}>
            <TouchableOpacity style={styles.studyCard} onPress={handleIrParaFlashcards}>
              <View style={[styles.studyIcon, { backgroundColor: "#E0E7FF" }]}>
                <Ionicons name="copy" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.studyCardTitle}>Flashcards</Text>
              <Text style={styles.studyCardSub}>Revisar erros</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.studyCard} onPress={() => setShowReview((v) => !v)}>
              <View style={[styles.studyIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="list" size={20} color="#10B981" />
              </View>
              <Text style={styles.studyCardTitle}>Gabarito</Text>
              <Text style={styles.studyCardSub}>{showReview ? "Ocultar" : "Ver questões"}</Text>
            </TouchableOpacity>
          </View>

          {/* Review por questão */}
          {showReview && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Revisão das Questões</Text>
              {questions.map((q, i) => {
                const acertou = userAnswers[i] === q.resposta_correta;
                return (
                  <View
                    key={q.id || i}
                    style={[styles.reviewItem, { borderLeftColor: acertou ? "#10B981" : "#EF4444" }]}
                  >
                    <View style={styles.reviewHeaderRow}>
                      <Ionicons
                        name={acertou ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={acertou ? "#10B981" : "#EF4444"}
                      />
                      {q.materia && (
                        <View style={styles.materiaTag}>
                          <Text style={styles.materiaTagText}>{q.materia}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewQ} numberOfLines={3}>{q.enunciado}</Text>
                    {!acertou && (
                      <View style={styles.reviewAnswers}>
                        <Text style={styles.reviewWrong}>Sua resp.: {userAnswers[i] || "—"}</Text>
                        <Text style={styles.reviewCorrect}>Correta: {q.resposta_correta}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.finalBackBtn}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Text style={styles.finalBackBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Modal WebView OSIA */}
        <Modal visible={modalIAResultVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <MotiView
              from={{ opacity: 0, translateY: 100 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.modalContentFull}
            >
              <View style={styles.iaModalHeader}>
                <MaterialCommunityIcons name="shield" size={28} color="#4F46E5" />
                <Text style={styles.iaModalTitle}>OSIA Analytics · OSI 2026</Text>
                <TouchableOpacity onPress={() => setModalIAResultVisible(false)} style={styles.closeHeaderBtn}>
                  <Ionicons name="close-circle" size={28} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, width: "100%", borderRadius: 15, overflow: "hidden" }}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: htmlAnaliseOSIA }}
                  style={{ flex: 1, backgroundColor: "#0F172A" }}
                  javaScriptEnabled
                  domStorageEnabled
                />
              </View>
              <TouchableOpacity style={styles.closeIAbnt} onPress={() => setModalIAResultVisible(false)}>
                <Text style={styles.closeIAbntText}>Fechar Painel</Text>
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
            <Text style={[styles.feedbackTitle, { color: isCorrect ? Colors.accent : "#EF4444" }]}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.progressBackBtn}>
          <Ionicons name="close" size={22} color={Colors.textLight} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]}
            />
          </View>
        </View>
        <Text style={styles.progressText}>{currentIdx + 1}/{questions.length}</Text>
      </View>

      <Text style={styles.enunciado}>{q?.enunciado}</Text>
      {["a", "b", "c", "d", "e"].map((l) => {
        const texto = q?.[`opcao_${l}`];
        if (!texto) return null;
        return (
          <TouchableOpacity key={l} style={styles.optBtn} onPress={() => handleAnswer(l.toUpperCase())}>
            <View style={styles.optLetter}>
              <Text style={styles.optLetterText}>{l.toUpperCase()}</Text>
            </View>
            <Text style={styles.optText}>{texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 25 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  progressHeader: {
    marginTop: 40,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBackBtn: { padding: 4 },
  progressText: { fontWeight: "bold", color: Colors.textLight, fontSize: 13, minWidth: 36, textAlign: "right" },
  progressBarBg: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3 },
  progressBarFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 3 },
  enunciado: { fontSize: 18, fontWeight: "bold", color: Colors.text, marginBottom: 25 },
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
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
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
  feedbackLabel: { fontSize: 12, fontWeight: "bold", color: Colors.textLight, marginTop: 15, marginBottom: 5 },
  feedbackText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  nextBtn: { backgroundColor: Colors.primary, width: "100%", padding: 18, borderRadius: 15, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "bold" },

  resultContainer: { flex: 1, backgroundColor: "#0F172A" },
  resultHeader: { padding: 25, paddingTop: 60 },
  tierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  tierText: { fontWeight: "bold", fontSize: 13 },
  resultMainTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E293B",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  xpText: { color: "#FFD700", fontWeight: "900", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: "#1E293B", padding: 15, borderRadius: 15, justifyContent: "center" },
  statLabel: { color: "#94A3B8", fontSize: 12, marginBottom: 5 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  miniRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  miniLabel: { color: "#94A3B8", fontSize: 11 },
  miniValue: { fontSize: 11, fontWeight: "bold" },
  progressTrack: {
    height: 8,
    backgroundColor: "#1E293B",
    borderRadius: 4,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  iaAnalysisCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  iaIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  iaCardTitle: { fontSize: 14, fontWeight: "bold" },
  iaCardSub: { color: "#94A3B8", fontSize: 11, marginTop: 4 },
  iaBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  iaBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginTop: 24, marginBottom: 14 },
  studyOptionsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  studyCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  studyIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  studyCardTitle: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  studyCardSub: { color: "#64748B", fontSize: 11, marginTop: 3 },

  reviewSection: { marginTop: 20 },
  reviewTitle: { color: "#94A3B8", fontSize: 13, fontWeight: "bold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  reviewItem: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  reviewHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  materiaTag: { backgroundColor: "#334155", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  materiaTagText: { color: "#94A3B8", fontSize: 11 },
  reviewQ: { color: "#CBD5E1", fontSize: 13, lineHeight: 18 },
  reviewAnswers: { flexDirection: "row", gap: 16, marginTop: 10 },
  reviewWrong: { color: "#EF4444", fontSize: 12, fontWeight: "bold" },
  reviewCorrect: { color: "#10B981", fontSize: 12, fontWeight: "bold" },

  finalBackBtn: {
    marginTop: 30,
    backgroundColor: "#334155",
    padding: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
  iaModalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginLeft: 10, flex: 1 },
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
