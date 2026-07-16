import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../src/context/ThemeContext";

const PERGUNTAS = [
  {
    pergunta: "Como funciona o XP?",
    resposta: "Você ganha 10 XP para cada questão que acerta em um simulado. O XP total aparece no seu perfil e define sua posição no ranking geral.",
  },
  {
    pergunta: "Como funciona o simulado com IA (OSIA)?",
    resposta: "Na tela \"Tutor\", escolha um tema e a quantidade de questões e a OSIA gera um simulado personalizado na hora. Depois de gerar um simulado, é preciso aguardar 1 hora para gerar outro, para não sobrecarregar o serviço.",
  },
  {
    pergunta: "Como funciona o ranking por instituição?",
    resposta: "O ranking por instituição soma o XP de todos os alunos cadastrados na mesma instituição. Você pode ver os dois rankings (individual e por instituição) na tela de Leaderboard, acessível pelo perfil.",
  },
  {
    pergunta: "Errei uma questão, e agora?",
    resposta: "Ao final de um simulado, toque em \"Refazer questão(ões) errada(s)\" para treinar só o que você errou, ou em \"Flashcards\" para gerar cartões de revisão com a justificativa de cada erro.",
  },
  {
    pergunta: "Como troco minha instituição ou meus dados?",
    resposta: "No momento, a troca de instituição, usuário ou senha é feita por um administrador/docente da OSI. Procure a coordenação da sua instituição para solicitar a alteração.",
  },
  {
    pergunta: "Encontrei um erro em uma questão. Como reportar?",
    resposta: "Entre em contato com um docente/administrador da OSI informando o enunciado da questão e qual parte está incorreta, para que ela seja corrigida no banco de questões.",
  },
];

export default function Ajuda() {
  const { colors } = useTheme();
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ajuda e Perguntas Frequentes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {PERGUNTAS.map((item, i) => {
          const expandida = aberta === i;
          return (
            <View
              key={i}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.perguntaRow}
                onPress={() => setAberta(expandida ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={item.pergunta}
                accessibilityState={{ expanded: expandida }}
              >
                <Text style={[styles.pergunta, { color: colors.text }]}>{item.pergunta}</Text>
                <Ionicons
                  name={expandida ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textLight}
                />
              </TouchableOpacity>
              {expandida && (
                <Text style={[styles.resposta, { color: colors.textLight }]}>{item.resposta}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "bold", flex: 1, textAlign: "center", marginHorizontal: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  perguntaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pergunta: { flex: 1, fontSize: 15, fontWeight: "bold" },
  resposta: { fontSize: 13, lineHeight: 20, marginTop: 12 },
});
