import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../src/context/ThemeContext";

const ONBOARDING_KEY = "@osi_onboarding_seen";

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; texto: string }[] = [
  {
    icon: "sparkles",
    title: "Bem-vindo à OSIA",
    texto: "OSIA é a assistente de IA da OSI 2026. Ela tira suas dúvidas de TI e gera questões personalizadas para você treinar.",
  },
  {
    icon: "play-circle",
    title: "Simulados e Tutor IA",
    texto: "Faça simulados prontos ou peça pra OSIA gerar um treino sobre qualquer tema. Questões erradas viram flashcards automáticos de revisão.",
  },
  {
    icon: "trophy",
    title: "XP e Ranking",
    texto: "Cada questão certa dá XP. Acompanhe sua posição no ranking geral e por instituição direto no seu perfil.",
  },
];

export function OnboardingModal() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  const fechar = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  };

  const avancar = () => {
    if (step < SLIDES.length - 1) setStep((s) => s + 1);
    else fechar();
  };

  if (!visible) return null;
  const slide = SLIDES[step];
  const ultimo = step === SLIDES.length - 1;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={fechar}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={fechar}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Pular introdução"
          >
            <Text style={[styles.skipText, { color: colors.textLight }]}>Pular</Text>
          </TouchableOpacity>

          <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
            <Ionicons name={slide.icon} size={40} color="#fff" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
          <Text style={[styles.text, { color: colors.textLight }]}>{slide.texto}</Text>

          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.border }]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={avancar}
            accessibilityRole="button"
            accessibilityLabel={ultimo ? "Começar a usar o app" : "Próximo"}
          >
            <Text style={styles.nextBtnText}>{ultimo ? "Começar" : "Próximo"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 28, alignItems: "center" },
  skipBtn: { position: "absolute", top: 16, right: 20, padding: 4 },
  skipText: { fontSize: 13, fontWeight: "600" },
  iconBox: { width: 76, height: 76, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 20, marginTop: 10 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  text: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 24 },
  dotsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: { width: "100%", padding: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
