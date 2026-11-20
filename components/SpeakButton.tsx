import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useAccessibility } from "../src/context/AccessibilityContext";
import { useTheme } from "../src/context/ThemeContext";
import { speech } from "../src/services/speech";
import { Text } from "./AppText";

type Props = {
  texto: string;
  /** Descreve o que será lido, para o leitor de tela (ex.: "questão") */
  rotulo?: string;
  cor?: string;
  compacto?: boolean;
};

// Botão "Ouvir": só aparece com a opção de leitura em voz alta ligada nas
// configurações de acessibilidade
export function SpeakButton({ texto, rotulo = "texto", cor, compacto }: Props) {
  const { readAloud } = useAccessibility();
  const { colors } = useTheme();
  const [falando, setFalando] = useState(false);

  // Para a leitura se o botão sair da tela (troca de questão, fechar modal)
  useEffect(() => () => speech.parar(), [texto]);

  if (!readAloud || !texto) return null;
  const c = cor ?? colors.primary;

  const alternar = () => {
    if (falando) {
      speech.parar();
      setFalando(false);
    } else {
      setFalando(true);
      speech.falar(texto, () => setFalando(false));
    }
  };

  return (
    <TouchableOpacity
      onPress={alternar}
      style={[styles.botao, { borderColor: c }, compacto && styles.compacto]}
      accessibilityRole="button"
      accessibilityLabel={falando ? `Parar leitura do ${rotulo}` : `Ouvir ${rotulo}`}
      hitSlop={6}
    >
      <Ionicons name={falando ? "stop-circle-outline" : "volume-high-outline"} size={compacto ? 16 : 18} color={c} />
      {!compacto && <Text style={[styles.texto, { color: c }]}>{falando ? "Parar" : "Ouvir"}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
  },
  compacto: { paddingHorizontal: 8, paddingVertical: 4, minHeight: 32 },
  texto: { fontSize: 13, fontWeight: "bold" },
});
