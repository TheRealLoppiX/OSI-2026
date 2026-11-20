import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/context/ThemeContext";
import { Text } from "./AppText";

type Props = {
  title: string;
  subtitle?: string;
  /** false em telas raiz (abas, painel do admin), onde "voltar" não tem destino */
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Ações à direita (ex.: botão de atualizar) */
  right?: React.ReactNode;
};

// Cabeçalho padrão das telas: respeita a área segura, tem alvo de toque de
// 44pt no voltar e anuncia o título como cabeçalho para o leitor de tela.
export function ScreenHeader({ title, subtitle, showBack = true, onBack, backLabel = "Voltar", right }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      {showBack ? (
        <TouchableOpacity
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
          style={styles.acao}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.espaco} />
      )}

      <View style={styles.titulos}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textLight }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.direita}>{right ?? <View style={styles.espaco} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  acao: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  espaco: { width: 44 },
  titulos: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { fontSize: 12, marginTop: 2 },
  direita: { minWidth: 44, alignItems: "flex-end" },
});
