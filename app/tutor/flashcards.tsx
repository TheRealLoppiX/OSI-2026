import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { useTheme } from "../../src/context/ThemeContext";

export default function FlashcardGenerator() {
  const { dados, titulo } = useLocalSearchParams();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const cardsRef = useRef<(ViewShot | null)[]>([]);

  const questoes = dados ? JSON.parse(dados as string) : [];

  const baixarFlashcards = async () => {
    if (questoes.length === 0) return;

    setLoading(true);
    const zip = new JSZip();

    try {
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
      }
    } catch (error: any) {
      Alert.alert("Erro", "Falha ao gerar os arquivos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Flashcards de Revisão</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Estes cartões foram gerados com base nos seus erros no simulado. Use-os para fixar o conteúdo.
          </Text>
        </View>

        {questoes.map((item: any, index: number) => (
          <ViewShot
            key={index}
            ref={(ref) => { cardsRef.current[index] = ref; }}
            options={{ format: "png", quality: 0.9 }}
            style={styles.cardWrapper}
          >
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.tagIA, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="robot" size={12} color="#fff" />
                  <Text style={styles.tagIAText}>OSINHO</Text>
                </View>
                <Text style={[styles.refText, { color: colors.textLight }]}>
                  Ref: {titulo || "Simulado Geral"}
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.primary }]}>CONCEITO</Text>
              <Text style={[styles.enunciado, { color: colors.text }]}>{item.enunciado}</Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.label, { color: colors.primary }]}>JUSTIFICATIVA</Text>
              <Text style={[styles.justificativa, { color: colors.textLight }]}>{item.justificativa}</Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={styles.footerBrand}>OSI 2026 • Salgueiro-PE</Text>
                <Text style={styles.pageText}>{index + 1}/{questoes.length}</Text>
              </View>
            </View>
          </ViewShot>
        ))}

        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={baixarFlashcards}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="#fff" />
              <Text style={styles.downloadBtnText}>Baixar Flashcards (.ZIP)</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  infoBox: { padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  cardWrapper: {
    marginBottom: 20,
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
  tagIAText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  refText: { fontSize: 10, fontWeight: "600" },
  label: { fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: 8 },
  enunciado: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  divider: { height: 1, marginVertical: 10 },
  justificativa: { fontSize: 14, lineHeight: 22 },
  cardFooter: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerBrand: { fontSize: 8, color: "#CBD5E1", fontWeight: "bold" },
  pageText: { fontSize: 9, color: "#94A3B8" },
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
  downloadBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
