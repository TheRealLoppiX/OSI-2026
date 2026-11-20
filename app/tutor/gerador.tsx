import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { aiService } from "../../src/services/aiService";
import { authService } from "../../src/services/auth";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

const UMA_HORA_MS = 60 * 60 * 1000;

export default function GeradorSimulado() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tema, setTema] = useState("");
  const [nQts, setNQts] = useState(5);
  const [loading, setLoading] = useState(false);
  const [cooldownMin, setCooldownMin] = useState(0);
  const isMountedRef = useRef(true);
  const emGeracaoRef = useRef(false);

  useEffect(() => {
    verificarCooldown();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const verificarCooldown = async () => {
    const user = await authService.getUser();
    if (!user?.id) return;
    const key = `@OSI_ai_gen_${user.id}`;
    const lastStr = await AsyncStorage.getItem(key);
    if (!isMountedRef.current) return;
    if (lastStr) {
      const elapsed = Date.now() - Number(lastStr);
      if (elapsed < UMA_HORA_MS) {
        setCooldownMin(Math.ceil((UMA_HORA_MS - elapsed) / 60000));
      } else {
        setCooldownMin(0);
      }
    }
  };

  const gerarSimuladoIA = async () => {
    if (!tema.trim()) return appAlert.alert("Ops", "Qual o tema?");
    // Guard síncrono (ref, não state) contra duplo toque rápido: o `loading`
    // via useState só desabilita o botão depois do primeiro re-render, o que
    // deixa uma janela para dois toques dispararem duas gerações e furarem
    // o cooldown de 1/hora.
    if (emGeracaoRef.current) return;
    emGeracaoRef.current = true;

    const user = await authService.getUser();
    const key = `@OSI_ai_gen_${user?.id || "guest"}`;
    const lastStr = await AsyncStorage.getItem(key);

    if (lastStr) {
      const elapsed = Date.now() - Number(lastStr);
      if (elapsed < UMA_HORA_MS) {
        const restante = Math.ceil((UMA_HORA_MS - elapsed) / 60000);
        emGeracaoRef.current = false;
        return appAlert.alert(
          "Aguarde um pouco",
          `Para não sobrecarregar OSIA, cada usuário pode gerar 1 simulado por hora.\n\nPróximo disponível em ${restante} min.`
        );
      }
    }

    setLoading(true);
    try {
      const questoesGeradas = await aiService.gerarQuestoesIA(tema, nQts);
      await AsyncStorage.setItem(key, String(Date.now()));

      // O usuário pode ter saído da tela (ex: botão voltar) enquanto a IA
      // gerava as questões — nesse caso não navega para não "redirecionar"
      // o usuário de volta para um simulado que ele não pediu mais.
      if (!isMountedRef.current) return;

      setCooldownMin(60);
      router.replace({
        pathname: "/simulado",
        params: { dadosIA: JSON.stringify(questoesGeradas), titulo: `Treino IA: ${tema}` },
      } as any);
    } catch (error: any) {
      if (isMountedRef.current) {
        appAlert.alert(
          "Erro",
          friendlyError(error, "O limite de requisições gratuitas foi atingido. Tente em 1 minuto.")
        );
      }
    } finally {
      emGeracaoRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
    <ScreenHeader title="Simulado com IA" />
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

      <View style={styles.content}>
        <View style={styles.aiBanner}>
          <MaterialCommunityIcons name="auto-fix" size={50} color={colors.onPrimary} />
          <Text style={styles.bannerTitle}>OSIA</Text>
          <Text style={styles.bannerSub}>Especifique para OSIA como você quer o Simulado</Text>
        </View>

        {cooldownMin > 0 && (
          <View style={styles.cooldownBanner} accessibilityLiveRegion="polite">
            <Ionicons name="time-outline" size={20} color={colors.warning} />
            <Text style={styles.cooldownText}>
              Próximo simulado disponível em{" "}
              <Text style={{ fontWeight: "bold" }}>{cooldownMin} min</Text>
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]} nativeID="rotuloTema">Tema do Simulado</Text>
        <TextInput
          accessibilityLabel="Tema do simulado"
          accessibilityLabelledBy="rotuloTema"
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          placeholder="Ex: Redes, Python, Hardware..."
          value={tema}
          onChangeText={setTema}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.text }]}>Quantidade de Questões ({nQts})</Text>
        <View style={styles.qtsSelector} accessibilityRole="radiogroup" accessibilityLabel="Quantidade de questões">
          {[3, 5, 10, 15].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.qtsBtn,
                { backgroundColor: colors.card },
                nQts === num && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setNQts(num)}
              accessibilityRole="radio"
              accessibilityState={{ checked: nQts === num }}
              accessibilityLabel={`${num} questões`}
            >
              <Text style={[styles.qtsBtnText, { color: colors.text }, nQts === num && { color: colors.onPrimary }]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.primary }, (loading || cooldownMin > 0) && { opacity: 0.6 }]}
          onPress={gerarSimuladoIA}
          disabled={loading || cooldownMin > 0}
          accessibilityRole="button"
          accessibilityState={{ busy: loading, disabled: loading || cooldownMin > 0 }}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : cooldownMin > 0 ? (
            <>
              <Ionicons name="time" size={20} color={colors.onPrimary} />
              <Text style={styles.mainBtnText}>Disponível em {cooldownMin} min</Text>
            </>
          ) : (
            <>
              <Text style={styles.mainBtnText}>Gerar Simulado</Text>
              <Ionicons name="sparkles" size={20} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 25 },
  aiBanner: {
    backgroundColor: c.highlight,
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 24,
  },
  bannerTitle: { color: c.onPrimary, fontSize: 24, fontWeight: "bold", marginTop: 10 },
  bannerSub: { color: c.onPrimary, textAlign: "center" },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.warningSoft,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.warning,
  },
  cooldownText: { color: c.text, fontSize: 14, flex: 1 },
  label: { fontWeight: "bold", marginBottom: 10, fontSize: 16, marginTop: 10 },
  input: { padding: 18, borderRadius: 15, fontSize: 16, marginBottom: 20, borderWidth: 1 },
  qtsSelector: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  qtsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  qtsBtnText: { fontWeight: "bold" },
  mainBtn: {
    padding: 20,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  mainBtnText: { color: c.onPrimary, fontWeight: "bold", fontSize: 16 },
});
