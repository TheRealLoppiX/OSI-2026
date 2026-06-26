import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";

export default function ImportarQuestoes() {
  const { colors } = useTheme();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importando, setImportando] = useState(false);

  const handlePreview = async () => {
    if (!url.trim()) return Alert.alert("Atenção", "Cole a URL da planilha.");
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "importar-planilha",
        {
          body: { url: url.trim(), apenasPreview: true },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setPreview(data.questoes);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportar = async () => {
    if (!preview?.length) return;
    Alert.alert(
      "Confirmar importação",
      `Importar ${preview.length} questões para o banco da OSI?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Importar",
          onPress: async () => {
            setImportando(true);
            try {
              const { data, error } = await supabase.functions.invoke(
                "importar-planilha",
                {
                  body: { url: url.trim(), apenasPreview: false },
                },
              );
              if (error) throw new Error(error.message);
              if (data?.error) throw new Error(data.error);
              Alert.alert(
                "Sucesso!",
                `${data.importadas} questões importadas.`,
                [{ text: "OK", onPress: () => router.back() }],
              );
            } catch (err: any) {
              Alert.alert("Erro na importação", err.message);
            } finally {
              setImportando(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Importar via Planilha
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[
          styles.infoCard,
          { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
        ]}
      >
        <View style={styles.infoHeader}>
          <Ionicons
            name="information-circle"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            Como usar
          </Text>
        </View>
        <Text style={styles.infoText}>
          1. Crie uma planilha no Google Sheets com as colunas na ordem abaixo.
          {"\n"}
          2. Defina o acesso como{" "}
          <Text style={styles.bold}>"Qualquer pessoa com o link pode ver"</Text>
          .{"\n"}
          3. Cole o link aqui e clique em Pré-visualizar.
        </Text>
        <View style={styles.colunasList}>
          {[
            ["A", "enunciado", true],
            ["B", "opcao_a", true],
            ["C", "opcao_b", true],
            ["D", "opcao_c", false],
            ["E", "opcao_d", false],
            ["F", "opcao_e", false],
            ["G", "resposta_correta", true],
            ["H", "justificativa", true],
            ["I", "materia", false],
            ["J", "dificuldade", false],
            ["K", "referencias", false],
          ].map(([col, nome, obrig]) => (
            <View key={String(col)} style={styles.colunaRow}>
              <Text
                style={[
                  styles.colunaLetra,
                  { backgroundColor: colors.primary },
                ]}
              >
                {col}
              </Text>
              <Text style={styles.colunaLabel}>{nome as string}</Text>
              {obrig && <Text style={styles.obrig}>obrigatório</Text>}
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        URL da Planilha
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="https://docs.google.com/spreadsheets/d/..."
        placeholderTextColor={colors.textLight}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />

      <TouchableOpacity
        style={[
          styles.btnPreview,
          { borderColor: colors.primary, backgroundColor: colors.card },
          loading && { opacity: 0.7 },
        ]}
        onPress={handlePreview}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={[styles.btnPreviewText, { color: colors.primary }]}>
              Pré-visualizar questões
            </Text>
          </>
        )}
      </TouchableOpacity>

      {preview !== null && (
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {preview.length} questões encontradas
            </Text>
            <TouchableOpacity
              style={[
                styles.btnImportar,
                { backgroundColor: colors.primary },
                importando && { opacity: 0.7 },
              ]}
              onPress={handleImportar}
              disabled={importando}
            >
              {importando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.btnImportarText}>Importar tudo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {preview.map((q, i) => (
            <View
              key={i}
              style={[
                styles.questaoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.questaoCardHeader}>
                <Text style={[styles.questaoNum, { color: colors.textLight }]}>
                  #{i + 1}
                </Text>
                {q.materia && (
                  <Text style={styles.questaoTag}>{q.materia}</Text>
                )}
                <Text
                  style={[
                    styles.questaoTag,
                    q.dificuldade === "Fácil" && {
                      backgroundColor: "#DCFCE7",
                      color: "#166534",
                    },
                    q.dificuldade === "Difícil" && {
                      backgroundColor: "#FEE2E2",
                      color: "#991B1B",
                    },
                  ]}
                >
                  {q.dificuldade || "Média"}
                </Text>
              </View>
              <Text
                style={[styles.questaoEnunciado, { color: colors.text }]}
                numberOfLines={3}
              >
                {q.enunciado}
              </Text>
              <View style={styles.opcoesRow}>
                {["a", "b", "c", "d", "e"].map((l) => {
                  if (!q[`opcao_${l}`]) return null;
                  const isCorreta = q.resposta_correta === l.toUpperCase();
                  return (
                    <View
                      key={l}
                      style={[
                        styles.opcaoChip,
                        isCorreta && { backgroundColor: "#10B981" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.opcaoChipText,
                          isCorreta && { color: "#fff" },
                        ]}
                      >
                        {l.toUpperCase()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  title: { fontSize: 18, fontWeight: "bold" },
  infoCard: { margin: 20, borderRadius: 16, padding: 18, borderWidth: 1 },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  infoTitle: { fontSize: 15, fontWeight: "bold" },
  infoText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
    marginBottom: 14,
  },
  bold: { fontWeight: "bold" },
  colunasList: { gap: 6 },
  colunaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colunaLetra: {
    width: 24,
    height: 24,
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 24,
  },
  colunaLabel: { flex: 1, fontSize: 12, color: "#1E3A5F" },
  obrig: { fontSize: 10, color: "#3B82F6", fontWeight: "600" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
  },
  btnPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  btnPreviewText: { fontWeight: "bold", fontSize: 15 },
  previewSection: { paddingHorizontal: 20 },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  previewTitle: { fontSize: 15, fontWeight: "bold" },
  btnImportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnImportarText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  questaoCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
  },
  questaoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  questaoNum: { fontSize: 12, fontWeight: "bold" },
  questaoTag: {
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questaoEnunciado: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  opcoesRow: { flexDirection: "row", gap: 6 },
  opcaoChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  opcaoChipText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
});
