import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/context/ThemeContext";

export default function CadastrarQuestao() {
  const { simuladoId, questaoId, questaoData } = useLocalSearchParams();
  const { colors } = useTheme();
  const modoEdicao = !!questaoId;

  // Pré-popula o formulário quando for edição
  const dadosIniciais = questaoData ? (() => { try { return JSON.parse(questaoData as string); } catch { return null; } })() : null;

  const [enunciado, setEnunciado] = useState(dadosIniciais?.enunciado || "");
  const [materia, setMateria] = useState(dadosIniciais?.materia || "");
  const [opcoes, setOpcoes] = useState({
    A: dadosIniciais?.opcao_a || "",
    B: dadosIniciais?.opcao_b || "",
    C: dadosIniciais?.opcao_c || "",
    D: dadosIniciais?.opcao_d || "",
    E: dadosIniciais?.opcao_e || "",
  });
  const [correta, setCorreta] = useState(dadosIniciais?.resposta_correta || "A");
  const [justificativa, setJustificativa] = useState(dadosIniciais?.justificativa || "");
  const [referencia, setReferencia] = useState(dadosIniciais?.referencias || "");
  const [dificuldade, setDificuldade] = useState(dadosIniciais?.dificuldade || "Média");
  const [loading, setLoading] = useState(false);

  const salvarQuestao = async () => {
    if (!enunciado || !justificativa || !opcoes.A || !opcoes.B) {
      Alert.alert("Erro", "Preencha o enunciado, alternativas A e B, e a justificativa.");
      return;
    }

    setLoading(true);
    const payload = {
      enunciado,
      materia: materia.trim() || null,
      opcao_a: opcoes.A,
      opcao_b: opcoes.B,
      opcao_c: opcoes.C,
      opcao_d: opcoes.D,
      opcao_e: opcoes.E || null,
      resposta_correta: correta,
      justificativa,
      referencias: referencia,
      dificuldade,
    };

    let error;
    if (modoEdicao) {
      ({ error } = await supabase.from("questoes").update(payload).eq("id", questaoId));
    } else {
      ({ error } = await supabase.from("questoes").insert([{
        ...payload,
        simulado_id: simuladoId ? Number(simuladoId) : null,
      }]));
    }

    setLoading(false);
    if (error) {
      Alert.alert("Erro ao salvar", error.message);
    } else {
      Alert.alert("Sucesso", modoEdicao ? "Questão atualizada!" : "Questão adicionada à base da OSI!");
      router.back();
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {modoEdicao ? "Editar Questão" : `Nova Questão${simuladoId ? ` (#${simuladoId})` : ""}`}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Nível de Dificuldade</Text>
        <View style={styles.difficultyContainer}>
          {["Fácil", "Média", "Difícil"].map((nivel) => (
            <TouchableOpacity
              key={nivel}
              style={[styles.diffBtn, { borderColor: colors.primary }, dificuldade === nivel && { backgroundColor: colors.primary }]}
              onPress={() => setDificuldade(nivel)}
            >
              <Text style={[styles.diffBtnText, { color: colors.primary }, dificuldade === nivel && { color: "#fff" }]}>
                {nivel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Matéria / Tópico</Text>
        <TextInput style={inputStyle} placeholder="Ex: Redes de Computadores, Hardware, Python..." placeholderTextColor={colors.textLight} value={materia} onChangeText={setMateria} />

        <Text style={[styles.label, { color: colors.text }]}>Enunciado da Questão</Text>
        <TextInput style={[...inputStyle, styles.textArea]} multiline placeholder="Ex: Qual o protocolo de transferência de hipertexto?" placeholderTextColor={colors.textLight} value={enunciado} onChangeText={setEnunciado} />

        <Text style={[styles.label, { color: colors.text }]}>Alternativas (Marque a correta no círculo)</Text>
        {(["A", "B", "C", "D", "E"] as const).map((letra) => (
          <View key={letra} style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.radio, { borderColor: colors.border, backgroundColor: colors.inputBg }, correta === letra && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCorreta(letra)}
            >
              <Text style={{ color: correta === letra ? "#fff" : colors.text, fontWeight: "bold" }}>{letra}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.optionInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, flex: 1 }]}
              placeholder={`Opção ${letra}`}
              placeholderTextColor={colors.textLight}
              value={opcoes[letra]}
              onChangeText={(txt) => setOpcoes({ ...opcoes, [letra]: txt })}
            />
          </View>
        ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Justificativa Acadêmica</Text>
        <TextInput style={[...inputStyle, styles.textArea]} multiline placeholder="Explique por que a resposta está correta..." placeholderTextColor={colors.textLight} value={justificativa} onChangeText={setJustificativa} />

        <Text style={[styles.label, { color: colors.text }]}>Referência Bibliográfica</Text>
        <TextInput style={inputStyle} placeholder="Ex: TANENBAUM, Redes de Computadores, 5ª Ed." placeholderTextColor={colors.textLight} value={referencia} onChangeText={setReferencia} />

        <TouchableOpacity
          style={[styles.btnSave, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={salvarQuestao}
          disabled={loading}
        >
          <Text style={styles.btnSaveText}>
            {loading ? "Salvando..." : modoEdicao ? "Salvar Alterações" : "Cadastrar Questão"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, padding: 25, flexDirection: "row", alignItems: "center", gap: 15 },
  title: { fontSize: 18, fontWeight: "bold" },
  form: { padding: 25 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 10 },
  difficultyContainer: { flexDirection: "row", gap: 10, marginBottom: 15 },
  diffBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  diffBtnText: { fontWeight: "bold" },
  input: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 15 },
  textArea: { height: 80, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  radio: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  optionInput: { padding: 10, borderRadius: 10, borderWidth: 1 },
  btnSave: { padding: 18, borderRadius: 15, alignItems: "center", marginTop: 30, marginBottom: 50 },
  btnSaveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
