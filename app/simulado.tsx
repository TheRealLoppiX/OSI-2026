import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { SpeakButton } from "../components/SpeakButton";
import { useAccessibility } from "../src/context/AccessibilityContext";
import { aiService } from "../src/services/aiService";
import { authService } from "../src/services/auth";
import { supabase } from "../src/services/supabase";
import { useTheme, useThemedStyles, type ThemeColors } from "../src/context/ThemeContext";
import { faixaDesempenho } from "../src/utils/desempenho";
import { appAlert } from "../src/services/appAlert";
import { friendlyError } from "../src/utils/friendlyError";

// Imagem de questão com loading/erro — usada tanto na tela de resposta quanto no gabarito.
function QuestaoImagem({ uri, style }: { uri: string; style?: any }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [status, setStatus] = useState<"loading" | "error" | "loaded">("loading");

  useEffect(() => {
    setStatus("loading");
  }, [uri]);

  return (
    <View style={[styles.imagemWrapper, style]}>
      {status !== "error" && (
        <Image
          source={{ uri }}
          style={styles.questaoImagem}
          resizeMode="contain"
          accessibilityLabel="Imagem da questão"
          accessibilityIgnoresInvertColors
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <View style={styles.imagemOverlay}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      )}
      {status === "error" && (
        <View style={styles.imagemOverlay}>
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
          <Text style={styles.imagemErrorText}>Não foi possível carregar a imagem</Text>
        </View>
      )}
    </View>
  );
}

export default function SimuladoNativo() {
  const { id, dadosIA, titulo } = useLocalSearchParams();
  const { colors } = useTheme();
  const { fontScale } = useAccessibility();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

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

  // Trava síncrona contra duplo toque em "Continuar" — o state showFeedback
  // só é commitado no próximo render, então dois toques rápidos no botão
  // conseguiam passar pelo mesmo `setShowFeedback(false)` e avançar/pontuar
  // duas vezes antes do React re-renderizar.
  const avancandoRef = useRef(false);

  // Só libera a trava de "Continuar" depois que currentIdx realmente mudou —
  // resetar logo após o setCurrentIdx reabriria a mesma janela de corrida
  // que o guard existe pra fechar.
  useEffect(() => {
    avancandoRef.current = false;
  }, [currentIdx]);

  useEffect(() => {
    if (dadosIA) {
      try {
        resetQuizState();
        setQuestions(JSON.parse(dadosIA as string));
        setLoading(false);
      } catch (e) {
        appAlert.alert("Erro", "Falha ao processar questões.");
        router.back();
      }
    } else if (id) {
      fetchQuestions();
    }
  }, [id, dadosIA]);

  // Zera o estado da tentativa anterior — necessário porque "Refazer questões
  // erradas" faz router.replace na mesma rota, reaproveitando esta instância
  // do componente em vez de remontá-la.
  const resetQuizState = () => {
    setCurrentIdx(0);
    setScore(0);
    setUserAnswers([]);
    setFinished(false);
    setXpGanho(0);
    setShowReview(false);
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      resetQuizState();
      const { data: simulado, error: simError } = await supabase
        .from("simulados")
        .select("questoes_ids")
        .eq("id", id)
        .single();

      if (simError || !simulado?.questoes_ids?.length) {
        appAlert.alert("Aviso", "Este simulado não possui questões vinculadas.");
        router.back();
        return;
      }

      const { data: questoes } = await supabase
        .from("questoes")
        .select("*")
        .in("id", simulado.questoes_ids);

      if (questoes) setQuestions(questoes.sort(() => Math.random() - 0.5));
    } catch (err) {
      appAlert.alert("Erro", friendlyError(err, "Não foi possível carregar as questões."));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (letter: string) => {
    // showFeedback já sinaliza "esta questão foi respondida" — sem esse guard,
    // dois toques rápidos em alternativas diferentes registravam duas
    // respostas para a mesma questão, desalinhando userAnswers com questions.
    if (showFeedback) return;
    const correct = letter === questions[currentIdx].resposta_correta;
    setUserAnswers((prev) => [...prev, letter]);
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
    setShowFeedback(true);
    AccessibilityInfo.announceForAccessibility(
      correct ? "Acertou!" : `Errou. A resposta correta é a alternativa ${questions[currentIdx].resposta_correta}.`
    );
  };

  const nextQuestion = async () => {
    if (avancandoRef.current) return;
    avancandoRef.current = true;
    setShowFeedback(false);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      const xp = score * 10;
      setXpGanho(xp);
      setFinished(true);

      try {
        const user = await authService.getUser();
        if (user?.id) {
          if (xp > 0) await authService.adicionarXP(user.id, xp);
          // Registra no histórico — exclui revisões geradas pela própria tela de erros
          const tituloFinal = (titulo as string) || "Simulado OSI";
          if (!tituloFinal.startsWith("Revisão:")) {
            await authService.salvarTentativa({
              simuladoId: id as string | undefined,
              titulo: tituloFinal,
              acertos: score,
              total: questions.length,
            });
          }
        }
      } catch (e) {
        appAlert.alert("Aviso", "Não foi possível salvar seu XP/histórico desta tentativa. Seu resultado nesta tela continua válido.");
      }
    }
  };

  const handleAnalisarDesempenho = async () => {
    const erros = questions.filter((q, i) => userAnswers[i] !== q.resposta_correta);

    if (erros.length === 0) {
      return appAlert.alert("Gabaritou!", "OSIA identificou 100% de aproveitamento. Sem falhas para mapear!");
    }

    setLoadingIA(true);
    try {
      const listaErros = erros.map(
        (q) => `Questão: ${q.enunciado} | Matéria: ${q.materia || titulo || "Geral"}`
      );

      const superPromptOSIA = `
        Você é OSIA, sistema de IA da OSI. O estudante errou: ${JSON.stringify(listaErros)}.

        Gere uma ANÁLISE GRÁFICA usando HTML e CSS inline (sem libs JS externas).
        Use exatamente estas cores: fundo ${colors.bg}, cartões ${colors.card}, texto ${colors.text},
        texto secundário ${colors.textLight}, destaque ${colors.highlight}, erro ${colors.danger}, acerto ${colors.success}.
        Fonte base de ${Math.round(16 * fontScale)}px. Inclua <meta name="viewport" content="width=device-width, initial-scale=1">. INCLUA:
        1. "Painel de Diagnóstico OSIA" com barras visuais de calor por matéria/tópico.
        2. "MAPA MENTAL DE ERROS" em árvore CSS mostrando erro → conceitos para revisar.
        3. Plano de ação em cards modernos.

        Retorne APENAS o HTML completo começando com <html> e terminando com </html>.
      `;

      const html = await aiService.askGemini(superPromptOSIA, 2500);
      setHtmlAnaliseOSIA(html);
      setModalIAResultVisible(true);
    } catch (e) {
      appAlert.alert("Erro", "OSIA está reajustando os servidores. Tente novamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  const handleIrParaFlashcards = () => {
    const erros = questions.filter((q, i) => userAnswers[i] !== q.resposta_correta);
    if (erros.length === 0) return appAlert.alert("Parabéns!", "Conteúdo dominado.");
    router.push({
      pathname: "/tutor/flashcards",
      params: { dados: JSON.stringify(erros) },
    } as any);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const tier = faixaDesempenho(percentage, colors);
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

          <Text style={styles.resultMainTitle} accessibilityRole="header">Simulado concluído!</Text>

          {/* XP ganho */}
          {xpGanho > 0 && (
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 300 }}
              style={styles.xpBadge}
            >
              <Ionicons name="flash" size={20} color={colors.warning} />
              <Text style={styles.xpText}>+{xpGanho} XP ganhos!</Text>
            </MotiView>
          )}

          {/* Stats */}
          <View
            style={styles.statsRow}
            accessible
            accessibilityLabel={`Você acertou ${score} de ${questions.length} questões, ${percentage}%. ${questions.length - score} erradas.`}
          >
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pontuação</Text>
              <Text style={styles.statValue}>{score}/{questions.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Acertos</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{percentage}%</Text>
            </View>
            <View style={[styles.statBox, { flex: 1.4 }]}>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Corretas</Text>
                <Text style={[styles.miniValue, { color: colors.success }]}>{score}</Text>
              </View>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Erradas</Text>
                <Text style={[styles.miniValue, { color: colors.danger }]}>{questions.length - score}</Text>
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
          <View style={styles.iaAnalysisCard}>
            <View style={styles.iaIconBox}>
              <MaterialCommunityIcons name="robot" size={24} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={styles.iaCardTitle}>Diagnóstico OSIA</Text>
              <Text style={styles.iaCardSub}>Mapa mental + plano de ação para seus erros.</Text>
            </View>
            <TouchableOpacity
              style={[styles.iaBtn, loadingIA && { opacity: 0.7 }]}
              onPress={handleAnalisarDesempenho}
              disabled={loadingIA}
              accessibilityRole="button"
              accessibilityLabel="Analisar meus erros com a OSIA"
              accessibilityState={{ busy: loadingIA }}
            >
              {loadingIA ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.iaBtnText}>Analisar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Continuar aprendendo */}
          <Text style={styles.sectionTitle} accessibilityRole="header">Continuar aprendendo</Text>
          <View style={styles.studyOptionsRow}>
            <TouchableOpacity style={styles.studyCard} onPress={handleIrParaFlashcards} accessibilityRole="button">
              <View style={[styles.studyIcon, { backgroundColor: colors.highlightSoft }]}>
                <Ionicons name="copy" size={20} color={colors.highlight} />
              </View>
              <Text style={styles.studyCardTitle}>Flashcards</Text>
              <Text style={styles.studyCardSub}>Revisar erros</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.studyCard}
              onPress={() => setShowReview((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showReview }}
            >
              <View style={[styles.studyIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="list" size={20} color={colors.success} />
              </View>
              <Text style={styles.studyCardTitle}>Gabarito</Text>
              <Text style={styles.studyCardSub}>{showReview ? "Ocultar" : "Ver questões"}</Text>
            </TouchableOpacity>
          </View>

          {/* Botão de refazer apenas as questões erradas */}
          {erros.length > 0 && (
            <TouchableOpacity
              style={styles.refazerBtn}
              accessibilityRole="button"
              onPress={() => router.replace({
                pathname: "/simulado",
                params: {
                  dadosIA: JSON.stringify(erros),
                  titulo: `Revisão: ${(titulo as string) || "Simulado OSI"}`,
                },
              } as any)}
            >
              <Ionicons name="refresh-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.refazerBtnText}>Refazer {erros.length} questão(ões) errada(s)</Text>
            </TouchableOpacity>
          )}

          {/* Review por questão */}
          {showReview && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle} accessibilityRole="header">Revisão das Questões</Text>
              {questions.map((q, i) => {
                const acertou = userAnswers[i] === q.resposta_correta;
                return (
                  <View
                    key={q.id || i}
                    style={[styles.reviewItem, { borderLeftColor: acertou ? colors.success : colors.danger }]}
                    accessible
                    accessibilityLabel={`Questão ${i + 1}, ${acertou ? "acertou" : "errou"}. ${q.enunciado}${acertou ? "" : `. Sua resposta: ${userAnswers[i] || "nenhuma"}. Correta: ${q.resposta_correta}`}`}
                  >
                    <View style={styles.reviewHeaderRow}>
                      <Ionicons
                        name={acertou ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={acertou ? colors.success : colors.danger}
                      />
                      <Text style={[styles.reviewStatus, { color: acertou ? colors.success : colors.danger }]}>
                        {acertou ? "Acertou" : "Errou"}
                      </Text>
                      {q.materia && (
                        <View style={styles.materiaTag}>
                          <Text style={styles.materiaTagText}>{q.materia}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewQ} numberOfLines={3}>{q.enunciado}</Text>
                    {q.imagem_url && (
                      <QuestaoImagem uri={q.imagem_url} style={styles.reviewImagemWrapper} />
                    )}
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
            onPress={() => router.dismissTo("/(tabs)/home")}
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.finalBackBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Modal WebView OSIA */}
        <Modal
          visible={modalIAResultVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalIAResultVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <MotiView
              from={{ opacity: 0, translateY: 100 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.modalContentFull}
            >
              <View style={styles.iaModalHeader}>
                <MaterialCommunityIcons name="shield" size={28} color={colors.highlight} />
                <Text style={styles.iaModalTitle} accessibilityRole="header">Diagnóstico OSIA</Text>
                <TouchableOpacity
                  onPress={() => setModalIAResultVisible(false)}
                  style={styles.closeHeaderBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar painel de diagnóstico"
                >
                  <Ionicons name="close-circle" size={28} color={colors.textLight} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, width: "100%", borderRadius: 15, overflow: "hidden" }}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: htmlAnaliseOSIA }}
                  style={{ flex: 1, backgroundColor: colors.bg }}
                  javaScriptEnabled
                  domStorageEnabled
                />
              </View>
              <TouchableOpacity style={styles.closeIAbnt} onPress={() => setModalIAResultVisible(false)} accessibilityRole="button">
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
      <Modal visible={showFeedback} transparent animationType="fade" onRequestClose={nextQuestion}>
        <View style={styles.modalOverlayCenter}>
          <MotiView
            from={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            style={[styles.modalContentFeedback, { backgroundColor: colors.card }]}
          >
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "close-circle"}
              size={60}
              color={isCorrect ? colors.success : colors.danger}
            />
            <Text
              style={[styles.feedbackTitle, { color: isCorrect ? colors.success : colors.danger }]}
              accessibilityRole="header"
            >
              {isCorrect ? "Acertou!" : "Ops, errou!"}
            </Text>
            {!isCorrect && (
              <Text style={[styles.feedbackLabel, { color: colors.text, marginTop: 0 }]}>
                Resposta correta: alternativa {q?.resposta_correta}
              </Text>
            )}
            <ScrollView style={{ width: "100%", marginBottom: 20 }}>
              <Text style={[styles.feedbackLabel, { color: colors.textLight }]}>Justificativa:</Text>
              <Text style={[styles.feedbackText, { color: colors.text }]}>
                {q?.justificativa || "Analise a alternativa com atenção."}
              </Text>
              <View style={{ marginTop: 12 }}>
                <SpeakButton texto={q?.justificativa || ""} rotulo="justificativa" />
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={nextQuestion}
              accessibilityRole="button"
              accessibilityLabel={currentIdx + 1 < questions.length ? "Continuar para a próxima questão" : "Ver resultado"}
            >
              <Text style={styles.nextBtnText}>Continuar</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </Modal>

      <View style={[styles.progressHeader, { marginTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.progressBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Sair do simulado"
        >
          <Ionicons name="close" size={22} color={colors.textLight} />
        </TouchableOpacity>
        <View
          style={{ flex: 1, marginHorizontal: 12 }}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Progresso do simulado"
          accessibilityValue={{ min: 0, max: questions.length, now: currentIdx + 1, text: `Questão ${currentIdx + 1} de ${questions.length}` }}
        >
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${((currentIdx + 1) / questions.length) * 100}%` }]}
            />
          </View>
        </View>
        <Text style={[styles.progressText, { color: colors.textLight }]}>{currentIdx + 1}/{questions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.enunciado, { color: colors.text }]} accessibilityRole="header">{q?.enunciado}</Text>
      <View style={{ marginBottom: 14 }}>
        <SpeakButton
          rotulo="questão"
          texto={[
            q?.enunciado,
            ...["a", "b", "c", "d", "e"]
              .filter((l) => q?.[`opcao_${l}`])
              .map((l) => `Alternativa ${l.toUpperCase()}: ${q[`opcao_${l}`]}`),
          ].join(". ")}
        />
      </View>
      {q?.imagem_url ? <QuestaoImagem uri={q.imagem_url} /> : null}
      {["a", "b", "c", "d", "e"].map((l) => {
        const texto = q?.[`opcao_${l}`];
        if (!texto) return null;
        return (
          <TouchableOpacity
            key={l}
            style={[styles.optBtn, { backgroundColor: colors.card }]}
            onPress={() => handleAnswer(l.toUpperCase())}
            accessibilityRole="button"
            accessibilityLabel={`Alternativa ${l.toUpperCase()}: ${texto}`}
          >
            <View style={[styles.optLetter, { backgroundColor: colors.primary }]}>
              <Text style={styles.optLetterText}>{l.toUpperCase()}</Text>
            </View>
            <Text style={[styles.optText, { color: colors.text }]}>{texto}</Text>
          </TouchableOpacity>
        );
      })}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 25, paddingTop: 0, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.bg },
  progressHeader: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBackBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center", marginLeft: -10 },
  progressText: { fontWeight: "bold", fontSize: 13, minWidth: 36, textAlign: "right" },
  progressBarBg: { height: 6, borderRadius: 3 },
  progressBarFill: { height: "100%", borderRadius: 3 },
  enunciado: { fontSize: 18, fontWeight: "bold", marginBottom: 12, lineHeight: 26 },
  imagemWrapper: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: c.surfaceAlt,
    overflow: "hidden",
  },
  questaoImagem: { width: "100%", height: "100%" },
  imagemOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.surfaceAlt,
    gap: 6,
  },
  imagemErrorText: { color: c.textLight, fontSize: 12, textAlign: "center", paddingHorizontal: 20 },
  reviewImagemWrapper: { height: 120, marginTop: 10, marginBottom: 4 },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    minHeight: 56,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    elevation: 1,
  },
  optLetter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  optLetterText: { color: c.onPrimary, fontWeight: "bold" },
  optText: { flex: 1, fontSize: 15, lineHeight: 21 },

  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center",
    padding: 20,
  },
  modalContentFeedback: {
    backgroundColor: c.card,
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: c.border,
  },
  modalContentFull: {
    backgroundColor: c.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: "90%",
    width: "100%",
    alignItems: "center",
  },
  feedbackTitle: { fontSize: 22, fontWeight: "bold", marginVertical: 15 },
  feedbackLabel: { fontSize: 12, fontWeight: "bold", marginTop: 15, marginBottom: 5 },
  feedbackText: { fontSize: 15, lineHeight: 22 },
  nextBtn: { width: "100%", padding: 18, borderRadius: 15, alignItems: "center" },
  nextBtnText: { color: c.onPrimary, fontWeight: "bold" },

  resultContainer: { flex: 1, backgroundColor: c.bg },
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
  resultMainTitle: { fontSize: 24, fontWeight: "bold", color: c.text, marginBottom: 16 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.warningSoft,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.warning,
  },
  xpText: { color: c.warning, fontWeight: "900", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: c.card, padding: 15, borderRadius: 15, justifyContent: "center", borderWidth: 1, borderColor: c.border },
  statLabel: { color: c.textLight, fontSize: 12, marginBottom: 5 },
  statValue: { color: c.text, fontSize: 22, fontWeight: "bold" },
  miniRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  miniLabel: { color: c.textLight, fontSize: 11 },
  miniValue: { fontSize: 11, fontWeight: "bold" },
  progressTrack: {
    height: 8,
    backgroundColor: c.surfaceAlt,
    borderRadius: 4,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  iaAnalysisCard: {
    backgroundColor: c.highlightSoft,
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.highlight,
    marginBottom: 8,
  },
  iaIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: c.highlight },
  iaCardTitle: { fontSize: 14, fontWeight: "bold", color: c.highlight },
  iaCardSub: { color: c.textLight, fontSize: 11, marginTop: 4 },
  iaBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, minHeight: 44, justifyContent: "center", backgroundColor: c.highlight },
  iaBtnText: { color: c.onPrimary, fontSize: 12, fontWeight: "bold" },

  sectionTitle: { fontSize: 18, fontWeight: "bold", color: c.text, marginTop: 24, marginBottom: 14 },
  studyOptionsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  studyCard: {
    flex: 1,
    backgroundColor: c.card,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  studyIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  studyCardTitle: { color: c.text, fontSize: 13, fontWeight: "bold" },
  studyCardSub: { color: c.textLight, fontSize: 11, marginTop: 3 },

  reviewSection: { marginTop: 20 },
  reviewTitle: { color: c.textLight, fontSize: 13, fontWeight: "bold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  reviewItem: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  reviewHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reviewStatus: { fontSize: 12, fontWeight: "bold" },
  materiaTag: { backgroundColor: c.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  materiaTagText: { color: c.textLight, fontSize: 11 },
  reviewQ: { color: c.text, fontSize: 13, lineHeight: 18 },
  reviewAnswers: { flexDirection: "row", gap: 16, marginTop: 10 },
  reviewWrong: { color: c.danger, fontSize: 12, fontWeight: "bold" },
  reviewCorrect: { color: c.success, fontSize: 12, fontWeight: "bold" },

  refazerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: c.card,
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.warning,
  },
  refazerBtnText: { color: c.warning, fontWeight: "bold", fontSize: 14 },
  finalBackBtn: {
    marginTop: 30,
    backgroundColor: c.primary,
    padding: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  finalBackBtnText: { color: c.onPrimary, fontWeight: "bold" },

  iaModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 15,
  },
  iaModalTitle: { fontSize: 18, fontWeight: "bold", color: c.text, marginLeft: 10, flex: 1 },
  closeHeaderBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  closeIAbnt: {
    backgroundColor: c.highlight,
    width: "100%",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 15,
  },
  closeIAbntText: { color: c.onPrimary, fontWeight: "bold", fontSize: 15 },
});
