import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

type Modo = "url" | "xlsx";

// Mesma ordem de colunas usada pela importação (A a L), para que o arquivo
// exportado sirva como planilha de validação e possa ser reimportado depois.
const CAMPOS_PLANILHA = [
  "enunciado",
  "opcao_a",
  "opcao_b",
  "opcao_c",
  "opcao_d",
  "opcao_e",
  "resposta_correta",
  "justificativa",
  "materia",
  "dificuldade",
  "referencias",
  "imagem_url",
];

function csvEscape(valor: any): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export default function ImportarQuestoes() {
  const { colors } = useTheme();
  const [modo, setModo] = useState<Modo>("url");
  const [url, setUrl] = useState("");
  const [base64, setBase64] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const resetPreview = () => setPreview(null);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const { data, error } = await supabase
        .from("questoes")
        .select(CAMPOS_PLANILHA.join(","))
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      if (!data?.length) {
        return appAlert.alert("Nada para exportar", "Ainda não há questões cadastradas no banco.");
      }

      const linhas = [
        CAMPOS_PLANILHA.join(","),
        ...data.map((q: any) => CAMPOS_PLANILHA.map((campo) => csvEscape(q[campo])).join(",")),
      ];
      const csv = linhas.join("\n");

      const nomeArquivoExport = `questoes_osi_${Date.now()}.csv`;
      const uri = `${FileSystem.cacheDirectory}${nomeArquivoExport}`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "text/csv",
          dialogTitle: "Planilha de validação de questões",
        });
      } else {
        appAlert.alert("Exportado", `Arquivo salvo em: ${uri}`);
      }
    } catch (err: any) {
      appAlert.alert("Erro ao exportar", friendlyError(err, "Não foi possível gerar a planilha."));
    } finally {
      setExportando(false);
    }
  };

  const handleSelecionarXlsx = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setNomeArquivo(asset.name);
    setBase64(null);
    resetPreview();
    setLoading(true);
    try {
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setBase64(b64);
      await chamarPreview({ base64: b64 });
    } catch (err: any) {
      appAlert.alert("Erro", friendlyError(err, "Não foi possível ler o arquivo."));
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewUrl = async () => {
    if (!url.trim()) return appAlert.alert("Atenção", "Cole a URL da planilha.");
    setLoading(true);
    resetPreview();
    try {
      await chamarPreview({ url: url.trim() });
    } catch (err: any) {
      appAlert.alert("Erro", friendlyError(err, "Não foi possível pré-visualizar a planilha."));
    } finally {
      setLoading(false);
    }
  };

  const chamarPreview = async (body: object) => {
    const { data, error } = await supabase.functions.invoke("importar-planilha", {
      body: { ...body, apenasPreview: true },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    setPreview(data.questoes);
  };

  const handleImportar = async () => {
    if (!preview?.length) return;
    appAlert.alert(
      "Confirmar importação",
      `Importar ${preview.length} questões para o banco da OSI?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Importar",
          onPress: async () => {
            setImportando(true);
            try {
              const body =
                modo === "xlsx" && base64
                  ? { base64, apenasPreview: false }
                  : { url: url.trim(), apenasPreview: false };

              const { data, error } = await supabase.functions.invoke(
                "importar-planilha",
                { body },
              );
              if (error) throw new Error(error.message);
              if (data?.error) throw new Error(data.error);
              const puladas = data.puladas > 0 ? ` ${data.puladas} já existiam e foram ignoradas.` : "";
              appAlert.alert(
                "Importação concluída",
                `${data.importadas} questões importadas.${puladas}`,
                [{ text: "OK", onPress: () => router.back() }],
              );
            } catch (err: any) {
              appAlert.alert("Erro na importação", friendlyError(err, "Não foi possível importar as questões."));
            } finally {
              setImportando(false);
            }
          },
        },
      ],
    );
  };

  const trocarModo = (novoModo: Modo) => {
    if (novoModo === modo) return;
    setModo(novoModo);
    resetPreview();
    setBase64(null);
    setNomeArquivo(null);
    setUrl("");
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
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Importar via Planilha
        </Text>
        <TouchableOpacity
          onPress={handleExportar}
          disabled={exportando}
          style={{ width: 24, alignItems: "flex-end" }}
          accessibilityRole="button"
          accessibilityLabel="Exportar banco de questões em CSV"
        >
          {exportando ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      <Text style={[styles.exportHint, { color: colors.textLight }]}>
        Toque no ícone de download para exportar o banco de questões atual em uma planilha de validação (.csv).
      </Text>

      {/* Toggle de modo */}
      <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, modo === "url" && { backgroundColor: colors.primary }]}
          onPress={() => trocarModo("url")}
        >
          <Ionicons name="link-outline" size={15} color={modo === "url" ? "#fff" : colors.textLight} />
          <Text style={[styles.toggleText, { color: modo === "url" ? "#fff" : colors.textLight }]}>
            Google Sheets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, modo === "xlsx" && { backgroundColor: colors.primary }]}
          onPress={() => trocarModo("xlsx")}
        >
          <Ionicons name="document-outline" size={15} color={modo === "xlsx" ? "#fff" : colors.textLight} />
          <Text style={[styles.toggleText, { color: modo === "xlsx" ? "#fff" : colors.textLight }]}>
            Arquivo .xlsx
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card de instruções */}
      <View style={[styles.infoCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            {modo === "url" ? "Como usar (Google Sheets)" : "Como usar (xlsx)"}
          </Text>
        </View>
        {modo === "url" ? (
          <Text style={styles.infoText}>
            1. Crie uma planilha no Google Sheets com as colunas na ordem abaixo.{"\n"}
            2. Defina o acesso como{" "}
            <Text style={styles.bold}>"Qualquer pessoa com o link pode ver"</Text>.{"\n"}
            3. Cole o link aqui e clique em Pré-visualizar.
          </Text>
        ) : (
          <Text style={styles.infoText}>
            1. Prepare um arquivo <Text style={styles.bold}>.xlsx</Text> com as colunas na ordem abaixo.{"\n"}
            2. A linha 1 é o cabeçalho (ignorada). Os dados começam na linha 2.{"\n"}
            3. Toque em "Selecionar arquivo" para importar.
          </Text>
        )}
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
            ["L", "imagem_url", false],
          ].map(([col, nome, obrig]) => (
            <View key={String(col)} style={styles.colunaRow}>
              <Text style={[styles.colunaLetra, { backgroundColor: colors.primary }]}>
                {col}
              </Text>
              <Text style={styles.colunaLabel}>{nome as string}</Text>
              {obrig && <Text style={styles.obrig}>obrigatório</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Entrada conforme o modo */}
      {modo === "url" ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>URL da Planilha</Text>
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
            onChangeText={(v) => { setUrl(v); resetPreview(); }}
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
            onPress={handlePreviewUrl}
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
        </>
      ) : (
        <TouchableOpacity
          style={[
            styles.btnXlsx,
            { borderColor: colors.primary, backgroundColor: colors.card },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleSelecionarXlsx}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.btnPreviewText, { color: colors.primary }]}>
                  {nomeArquivo ? nomeArquivo : "Selecionar arquivo .xlsx"}
                </Text>
                {nomeArquivo && (
                  <Text style={[styles.trocarArquivo, { color: colors.textLight }]}>
                    Toque para trocar
                  </Text>
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Preview */}
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
                  <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
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
                {q.duplicata && (
                  <Text style={[styles.questaoTag, { backgroundColor: "#FEF9C3", color: "#92400E" }]}>
                    já existe
                  </Text>
                )}
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
  exportHint: { fontSize: 11, marginHorizontal: 20, marginTop: 10 },
  toggleRow: {
    flexDirection: "row",
    margin: 20,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  toggleText: { fontSize: 13, fontWeight: "600" },
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
  btnXlsx: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  btnPreviewText: { fontWeight: "bold", fontSize: 15 },
  trocarArquivo: { fontSize: 11, marginTop: 2 },
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
