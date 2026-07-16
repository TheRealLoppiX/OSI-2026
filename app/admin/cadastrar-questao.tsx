import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

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
  const [imagemUrl, setImagemUrl] = useState<string | null>(dadosIniciais?.imagem_url || null);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelecionarImagem = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        appAlert.alert("Permissão necessária", "Precisamos de acesso às suas fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingImagem(true);
      const selectedImage = result.assets[0];
      const fileName = `questoes/${Date.now()}.png`;
      const imageBuffer = Buffer.from(selectedImage.base64!, "base64");

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

      if (storageError) {
        throw new Error("Falha no Storage: Verifique as políticas do bucket avatars.");
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setImagemUrl(publicUrl);
    } catch (error: any) {
      appAlert.alert("Erro no Upload", friendlyError(error, "Não foi possível salvar a imagem."));
    } finally {
      setUploadingImagem(false);
    }
  };

  const salvarQuestao = async () => {
    if (!enunciado || !justificativa || !opcoes.A || !opcoes.B) {
      appAlert.alert("Erro", "Preencha o enunciado, alternativas A e B, e a justificativa.");
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
      imagem_url: imagemUrl,
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
      appAlert.alert("Erro ao salvar", friendlyError(error, "Não foi possível salvar a questão."));
    } else {
      appAlert.alert("Sucesso", modoEdicao ? "Questão atualizada!" : "Questão adicionada à base da OSI!");
      router.back();
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
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

        <Text style={[styles.label, { color: colors.text }]}>Imagem da Questão (opcional)</Text>
        {imagemUrl ? (
          <View style={styles.imagemPreviewBox}>
            <Image source={{ uri: imagemUrl }} style={styles.imagemPreview} resizeMode="contain" />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.imagemBtn, { borderColor: colors.primary }]}
                onPress={handleSelecionarImagem}
                disabled={uploadingImagem}
              >
                <Ionicons name="image-outline" size={16} color={colors.primary} />
                <Text style={[styles.imagemBtnText, { color: colors.primary }]}>Trocar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imagemBtn, { borderColor: "#EF4444" }]}
                onPress={() => setImagemUrl(null)}
                disabled={uploadingImagem}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={[styles.imagemBtnText, { color: "#EF4444" }]}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.imagemUploadBtn, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
            onPress={handleSelecionarImagem}
            disabled={uploadingImagem}
          >
            {uploadingImagem ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color={colors.textLight} />
                <Text style={{ color: colors.textLight, fontSize: 13 }}>Adicionar imagem (gráfico, diagrama, etc.)</Text>
              </>
            )}
          </TouchableOpacity>
        )}

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
  imagemUploadBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  imagemPreviewBox: { marginBottom: 15 },
  imagemPreview: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#E2E8F0" },
  imagemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  imagemBtnText: { fontWeight: "bold", fontSize: 13 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  radio: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  optionInput: { padding: 10, borderRadius: 10, borderWidth: 1 },
  btnSave: { padding: 18, borderRadius: 15, alignItems: "center", marginTop: 30, marginBottom: 50 },
  btnSaveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
