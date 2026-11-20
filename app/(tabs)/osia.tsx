import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../../components/AppText";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";

// Hub da tutora de IA. Antes ficava escondida num botão flutuante dentro de
// Simulados; agora é uma aba própria, achável sem saber que o botão existia.
export default function OsiaHub() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const opcoes = [
    {
      rota: "/tutor/chat",
      icone: "chatbubbles" as const,
      titulo: "Tirar dúvidas",
      descricao: "Pergunte sobre programação, redes, hardware, algoritmos e outros temas da OSI.",
    },
    {
      rota: "/tutor/gerador",
      icone: "sparkles" as const,
      titulo: "Gerar simulado",
      descricao: "Escolha um tema e a OSIA monta um treino com questões e justificativas.",
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="OSIA" subtitle="Tutora de IA da OSI" showBack={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <View style={styles.introIcone}>
            <MaterialCommunityIcons name="robot-happy" size={34} color={colors.onPrimary} />
          </View>
          <Text style={styles.introTexto}>
            Oi! Eu sou a OSIA. Posso explicar conteúdos e criar simulados sob medida para você treinar.
          </Text>
        </View>

        {opcoes.map((o) => (
          <TouchableOpacity
            key={o.rota}
            style={styles.opcao}
            onPress={() => router.push(o.rota as any)}
            accessibilityRole="button"
            accessibilityLabel={`${o.titulo}. ${o.descricao}`}
          >
            <View style={styles.opcaoIcone}>
              <Ionicons name={o.icone} size={26} color={colors.highlight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcaoTitulo}>{o.titulo}</Text>
              <Text style={styles.opcaoDescricao}>{o.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.dica}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning} />
          <Text style={styles.dicaTexto}>
            Depois de um simulado, a tela de resultado oferece flashcards e um diagnóstico da OSIA com base nos seus
            erros.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 20, paddingBottom: 40, gap: 14 },
    intro: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.primary, borderRadius: 20, padding: 18 },
    introIcone: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.12)", justifyContent: "center", alignItems: "center" },
    introTexto: { flex: 1, color: c.onPrimary, fontSize: 15, lineHeight: 21, fontWeight: "600" },
    opcao: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, minHeight: 88 },
    opcaoIcone: { width: 52, height: 52, borderRadius: 14, backgroundColor: c.highlightSoft, justifyContent: "center", alignItems: "center" },
    opcaoTitulo: { fontSize: 16, fontWeight: "bold", color: c.text, marginBottom: 4 },
    opcaoDescricao: { fontSize: 13, color: c.textLight, lineHeight: 18 },
    dica: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 14, backgroundColor: c.warningSoft, borderWidth: 1, borderColor: c.border },
    dicaTexto: { flex: 1, fontSize: 13, color: c.text, lineHeight: 18 },
  });
