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
import { aiService } from "../src/services/aiService";
import { supabase } from "../src/services/supabase";
import { Colors } from "../src/styles/colors";

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
  const [loadingIA, setLoadingIA] = useState(false);

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
      const { data, error } = await supabase
        .from("questoes")
        .select("*")
        .eq("simulado_id", id);
      if (data) setQuestions(data.sort(() => Math.random() - 0.5));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (letter: string) => {
    const correct = letter === questions[currentIdx].resposta_correta;
    // IMPORTANTE: Salva a resposta do usuário para análise posterior
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

  // --- LÓGICA DOS BOTÕES DE RESULTADO ---

  const handleAnalisarDesempenho = async () => {
    const erros = questions.filter(
      (q, i) => userAnswers[i] !== q.resposta_correta,
    );

    if (erros.length === 0) {
      return Alert.alert(
        "Excelente!",
        "Você gabaritou tudo. Não há erros para analisar!",
      );
    }

    setLoadingIA(true);
    try {
      // Pega apenas os enunciados para a IA entender o contexto do erro
      const listaErros = erros.map((q) => q.enunciado);
      const analise = await aiService.analisarErros(listaErros);

      Alert.alert("Análise da Gemini", analise);
    } catch (e) {
      Alert.alert("Erro", "Não consegui contatar o Tutor agora.");
    } finally {
      setLoadingIA(false);
    }
  };

  const handleIrParaFlashcards = () => {
    const erros = questions.filter(
      (q, i) => userAnswers[i] !== q.resposta_correta,
    );

    if (erros.length === 0) {
      return Alert.alert(
        "Parabéns!",
        "Você dominou todo o conteúdo deste simulado.",
      );
    }

    router.push({
      pathname: "/tutor/flashcards",
      params: { dados: JSON.stringify(erros) },
    } as any);
  };

  const handleGerarGuiaEstudo = async () => {
    setLoadingIA(true);
    try {
      const prompt = `Com base no simulado de ${titulo || "Informática"}, crie um mini guia de estudo com os 3 pontos mais importantes para eu revisar.`;
      const guia = await aiService.askGemini(prompt, 500);
      Alert.alert("Guia de Estudo", guia);
    } finally {
      setLoadingIA(false);
    }
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
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Ignoradas</Text>
                <Text style={styles.miniValue}>0</Text>
              </View>
            </View>
          </View>

          <View style={styles.iaAnalysisCard}>
            <View style={styles.iaIconBox}>
              <MaterialCommunityIcons name="auto-fix" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={styles.iaCardTitle}>Pontos fortes e melhorias</Text>
              <Text style={styles.iaCardSub}>
                Gemini analisará seus erros para gerar um plano de estudos.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.iaBtn, loadingIA && { opacity: 0.7 }]}
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
              <Text style={styles.studyCardSub}>
                Domine o que você errou neste teste.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.studyCard}
              onPress={handleGerarGuiaEstudo}
            >
              <View style={[styles.studyIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="book" size={20} color="#16A34A" />
              </View>
              <Text style={styles.studyCardTitle}>Guia de estudo</Text>
              <Text style={styles.studyCardSub}>
                Resumo técnico do simulado.
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.finalBackBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.finalBackBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    );
  }

  const q = questions[currentIdx];

  return (
    <View style={styles.container}>
      {/* MODAL DE FEEDBACK DURANTE O TESTE */}
      <Modal visible={showFeedback} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            style={styles.modalContent}
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
                {q.justificativa || "Sem justificativa."}
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

      <Text style={styles.enunciado}>{q.enunciado}</Text>
      {["a", "b", "c", "d"].map((l) => (
        <TouchableOpacity
          key={l}
          style={styles.optBtn}
          onPress={() => handleAnswer(l.toUpperCase())}
        >
          <View style={styles.optLetter}>
            <Text style={styles.optLetterText}>{l.toUpperCase()}</Text>
          </View>
          <Text style={styles.optText}>{q[`opcao_${l}`]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // MANTENHA OS STYLES QUE JÁ DEFINIMOS ANTERIORMENTE
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 25,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    maxHeight: "80%",
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
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iaCardTitle: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  iaCardSub: { color: "#94A3B8", fontSize: 11, marginTop: 4 },
  iaBtn: {
    backgroundColor: "#0369A1",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
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
  studyCardSub: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 14,
  },
  finalBackBtn: {
    marginTop: 30,
    backgroundColor: "#334155",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  finalBackBtnText: { color: "#fff", fontWeight: "bold" },
});
