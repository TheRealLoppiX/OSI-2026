import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/services/supabase";
import { Colors } from "../../src/styles/colors";

export default function CadastrarQuestao() {
  const { simuladoId } = useLocalSearchParams();
  const [enunciado, setEnunciado] = useState("");
  const [materia, setMateria] = useState("");
  const [opcoes, setOpcoes] = useState({ A: "", B: "", C: "", D: "" });
  const [correta, setCorreta] = useState("A");
  const [justificativa, setJustificativa] = useState("");
  const [referencia, setReferencia] = useState("");
  const [dificuldade, setDificuldade] = useState("Média");
  const [loading, setLoading] = useState(false);

  const salvarQuestao = async () => {
    if (!enunciado || !justificativa || !opcoes.A || !opcoes.B) {
      Alert.alert(
        "Erro",
        "Preencha o enunciado, alternativas A e B, e a justificativa.",
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("questoes").insert([
      {
        enunciado,
        materia: materia.trim() || null,
        opcao_a: opcoes.A,
        opcao_b: opcoes.B,
        opcao_c: opcoes.C,
        opcao_d: opcoes.D,
        resposta_correta: correta,
        justificativa,
        referencias: referencia,
        dificuldade,
        simulado_id: simuladoId ? Number(simuladoId) : null,
      },
    ]);

    setLoading(false);

    if (error) {
      Alert.alert("Erro ao salvar", error.message);
    } else {
      Alert.alert("Sucesso", "Questão adicionada à base da OSI!");
      router.back();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Questão (Simulado #{simuladoId})</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nível de Dificuldade</Text>
        <View style={styles.difficultyContainer}>
          {["Fácil", "Média", "Difícil"].map((nivel) => (
            <TouchableOpacity
              key={nivel}
              style={[
                styles.diffBtn,
                dificuldade === nivel && { backgroundColor: Colors.primary },
              ]}
              onPress={() => setDificuldade(nivel)}
            >
              <Text
                style={[
                  styles.diffBtnText,
                  dificuldade === nivel && { color: "#fff" },
                ]}
              >
                {nivel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Matéria / Tópico</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Redes de Computadores, Hardware, Python..."
          value={materia}
          onChangeText={setMateria}
        />

        <Text style={styles.label}>Enunciado da Questão</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Ex: Qual o protocolo de transferência de hipertexto?"
          value={enunciado}
          onChangeText={setEnunciado}
        />

        <Text style={styles.label}>
          Alternativas (Marque a correta no círculo)
        </Text>
        {(["A", "B", "C", "D"] as const).map((letra) => (
          <View key={letra} style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.radio, correta === letra && styles.radioActive]}
              onPress={() => setCorreta(letra)}
            >
              <Text
                style={{
                  color: correta === letra ? "#fff" : Colors.text,
                  fontWeight: "bold",
                }}
              >
                {letra}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.optionInput}
              placeholder={`Opção ${letra}`}
              value={opcoes[letra]}
              onChangeText={(txt) => setOpcoes({ ...opcoes, [letra]: txt })}
            />
          </View>
        ))}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Justificativa Acadêmica
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Explique por que a resposta está correta..."
          value={justificativa}
          onChangeText={setJustificativa}
        />

        <Text style={styles.label}>Referência Bibliográfica</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: TANENBAUM, Redes de Computadores, 5ª Ed."
          value={referencia}
          onChangeText={setReferencia}
        />

        <TouchableOpacity
          style={[styles.btnSave, loading && { opacity: 0.7 }]}
          onPress={salvarQuestao}
          disabled={loading}
        >
          <Text style={styles.btnSaveText}>
            {loading ? "Salvando..." : "Cadastrar Questão"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  form: { padding: 25 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  difficultyContainer: { flexDirection: "row", gap: 10, marginBottom: 15 },
  diffBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
  },
  diffBtnText: { color: Colors.primary, fontWeight: "bold" },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 15,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  radio: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  radioActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionInput: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnSave: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 50,
  },
  btnSaveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
