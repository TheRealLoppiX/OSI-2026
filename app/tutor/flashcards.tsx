import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/AppText";
import ViewShot from "react-native-view-shot";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SpeakButton } from "../../components/SpeakButton";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { appAlert } from "../../src/services/appAlert";
import { friendlyError } from "../../src/utils/friendlyError";

export default function FlashcardGenerator() {
  const { dados, titulo } = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const cardsRef = useRef<(ViewShot | null)[]>([]);
  const baixandoRef = useRef(false);

  let questoes: any[] = [];
  try {
    questoes = dados ? JSON.parse(dados as string) : [];
  } catch {
    questoes = [];
  }

  const baixarFlashcards = async () => {
    if (questoes.length === 0 || baixandoRef.current) return;
    baixandoRef.current = true;

    setLoading(true);
    const zip = new JSZip();

    try {
      // As imagens dos flashcards são carregadas via rede (<Image source={{uri}}>);
      // sem esperar o carregamento, a captura do ViewShot podia sair sem a
      // imagem (espaço em branco), sem nenhum erro visível.
      const urlsImagens = questoes.map((q) => q.imagem_url).filter(Boolean);
      await Promise.all(urlsImagens.map((uri) => Image.prefetch(uri).catch(() => {})));

      for (let i = 0; i < questoes.length; i++) {
        const currentCard = cardsRef.current[i];
        if (currentCard && currentCard.capture) {
          const uri = await currentCard.capture();
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64" as any,
          });
          zip.file(`flashcard_osi_${i + 1}.png`, base64, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: "base64" });
      const rootDir =
        (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
      const zipPath = `${rootDir}flashcards_osi.zip`;

      await FileSystem.writeAsStringAsync(zipPath, content, {
        encoding: "base64" as any,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(zipPath, {
          mimeType: "application/zip",
          dialogTitle: "Baixar meus Flashcards",
        });
      } else {
        appAlert.alert("Aviso", "Compartilhamento não disponível neste dispositivo.");
      }
    } catch (error: any) {
      appAlert.alert("Erro", friendlyError(error, "Falha ao gerar os arquivos dos flashcards."));
    } finally {
      setLoading(false);
      baixandoRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Flashcards de Revisão" />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Estes cartões foram gerados com base nos seus erros no simulado. Use-os para fixar o conteúdo.
          </Text>
        </View>

        {questoes.map((item: any, index: number) => (
          <View key={index} style={styles.cardBloco}>
          <ViewShot
            ref={(ref) => { cardsRef.current[index] = ref; }}
            options={{ format: "png", quality: 0.9 }}
            style={styles.cardWrapper}
          >
            <View
              style={[styles.card, { backgroundColor: colors.card }]}
              accessible
              accessibilityLabel={`Flashcard ${index + 1} de ${questoes.length}. Conceito: ${item.enunciado}. Justificativa: ${item.justificativa}`}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.tagIA, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="robot" size={12} color={colors.onPrimary} />
                  <Text style={styles.tagIAText}>OSINHO</Text>
                </View>
                <Text style={[styles.refText, { color: colors.textLight }]}>
                  Ref: {titulo || "Simulado Geral"}
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.primary }]}>CONCEITO</Text>
              <Text style={[styles.enunciado, { color: colors.text }]}>{item.enunciado}</Text>
              {item.imagem_url && (
                <Image
                  source={{ uri: item.imagem_url }}
                  style={styles.cardImagem}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.label, { color: colors.primary }]}>JUSTIFICATIVA</Text>
              <Text style={[styles.justificativa, { color: colors.textLight }]}>{item.justificativa}</Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={styles.footerBrand}>OSI 2026 • Salgueiro-PE</Text>
                <Text style={styles.pageText}>{index + 1}/{questoes.length}</Text>
              </View>
            </View>
          </ViewShot>
          {/* Fora do ViewShot para não aparecer no PNG exportado */}
          <SpeakButton
            texto={`Conceito: ${item.enunciado}. Justificativa: ${item.justificativa}`}
            rotulo={`flashcard ${index + 1}`}
          />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={baixarFlashcards}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color={colors.onPrimary} />
              <Text style={styles.downloadBtnText}>Baixar Flashcards (.ZIP)</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  cardBloco: { marginBottom: 24, gap: 10 },
  infoBox: { padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  cardWrapper: {
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  card: {
    padding: 25,
    borderRadius: 20,
    width: "100%",
    minHeight: 320,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: c.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  tagIA: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tagIAText: { color: c.onPrimary, fontSize: 11, fontWeight: "bold" },
  refText: { fontSize: 11, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 8 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 8 },
  enunciado: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  cardImagem: { width: "100%", height: 140, borderRadius: 12, marginBottom: 15, backgroundColor: c.surfaceAlt },
  divider: { height: 1, marginVertical: 10 },
  justificativa: { fontSize: 14, lineHeight: 22 },
  cardFooter: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerBrand: { fontSize: 10, color: c.textLight, fontWeight: "bold" },
  pageText: { fontSize: 11, color: c.textLight },
  downloadBtn: {
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 60,
  },
  downloadBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: "bold" },
});
