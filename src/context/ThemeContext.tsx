import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";

const THEME_KEY = "@osi_theme";

export type ThemeColors = {
  bg: string;
  card: string;
  /** Superfície secundária: chips, trilhos de progresso, áreas de destaque leve */
  surfaceAlt: string;
  text: string;
  textLight: string;
  /** Só para placeholders, ícones inativos e elementos decorativos (não passa AA como texto) */
  textMuted: string;
  border: string;
  inputBg: string;
  primary: string;
  /** Texto/ícone sobre qualquer fundo saturado: primary, success, danger, warning, info, highlight */
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  /** Identidade da OSIA (IA) */
  highlight: string;
  highlightSoft: string;
  overlay: string;
};

export type ThemeId = "claro" | "escuro" | "alto-contraste" | "sepia" | "oceano" | "noturno";
export type ThemePreference = ThemeId | "auto";

export type ThemeDef = {
  id: ThemeId;
  nome: string;
  descricao: string;
  isDark: boolean;
  colors: ThemeColors;
};

// Todas as combinações texto/fundo e onPrimary/cores saturadas foram checadas:
// AA (4.5:1) em todos os temas e AAA (7:1) no alto contraste.
export const THEMES: Record<ThemeId, ThemeDef> = {
  claro: {
    id: "claro",
    nome: "Claro",
    descricao: "Padrão, fundo branco",
    isDark: false,
    colors: {
      bg: "#F9FAFB",
      card: "#FFFFFF",
      surfaceAlt: "#F1F5F9",
      text: "#111827",
      textLight: "#4B5563",
      textMuted: "#94A3B8",
      border: "#E2E8F0",
      inputBg: "#FFFFFF",
      primary: "#047857",
      onPrimary: "#FFFFFF",
      success: "#15803D",
      successSoft: "#DCFCE7",
      danger: "#DC2626",
      dangerSoft: "#FEE2E2",
      warning: "#B45309",
      warningSoft: "#FEF3C7",
      info: "#2563EB",
      infoSoft: "#DBEAFE",
      highlight: "#4F46E5",
      highlightSoft: "#E0E7FF",
      overlay: "rgba(15,23,42,0.6)",
    },
  },
  escuro: {
    id: "escuro",
    nome: "Escuro",
    descricao: "Cinza-azulado, confortável à noite",
    isDark: true,
    colors: {
      bg: "#0F172A",
      card: "#1E293B",
      surfaceAlt: "#334155",
      text: "#F1F5F9",
      textLight: "#A8B5C7",
      textMuted: "#64748B",
      border: "#334155",
      inputBg: "#1E293B",
      primary: "#34D399",
      onPrimary: "#06281C",
      success: "#34D399",
      successSoft: "rgba(52,211,153,0.15)",
      danger: "#F87171",
      dangerSoft: "rgba(248,113,113,0.15)",
      warning: "#FBBF24",
      warningSoft: "rgba(251,191,36,0.15)",
      info: "#60A5FA",
      infoSoft: "rgba(96,165,250,0.15)",
      highlight: "#A5B4FC",
      highlightSoft: "rgba(165,180,252,0.15)",
      overlay: "rgba(0,0,0,0.7)",
    },
  },
  "alto-contraste": {
    id: "alto-contraste",
    nome: "Alto contraste",
    descricao: "Preto e amarelo, máxima legibilidade",
    isDark: true,
    colors: {
      bg: "#000000",
      card: "#000000",
      surfaceAlt: "#1A1A1A",
      text: "#FFFFFF",
      textLight: "#E5E5E5",
      textMuted: "#BFBFBF",
      // Borda branca é o que separa cartões do fundo quando ambos são pretos
      border: "#FFFFFF",
      inputBg: "#000000",
      primary: "#FFE500",
      onPrimary: "#000000",
      success: "#4ADE80",
      successSoft: "#000000",
      danger: "#FF8A8A",
      dangerSoft: "#000000",
      warning: "#FFE500",
      warningSoft: "#000000",
      info: "#7DD3FC",
      infoSoft: "#000000",
      highlight: "#D8B4FE",
      highlightSoft: "#000000",
      overlay: "rgba(0,0,0,0.9)",
    },
  },
  sepia: {
    id: "sepia",
    nome: "Sépia",
    descricao: "Tom de papel, cansa menos na leitura",
    isDark: false,
    colors: {
      bg: "#F4ECD8",
      card: "#FBF7EE",
      surfaceAlt: "#EFE4CC",
      text: "#33281A",
      textLight: "#5E4D36",
      textMuted: "#A08D70",
      border: "#E3D5B8",
      inputBg: "#FBF7EE",
      primary: "#7A4A1C",
      onPrimary: "#FFFFFF",
      success: "#3F6B21",
      successSoft: "#E4EBD0",
      danger: "#A6291F",
      dangerSoft: "#F3D9CF",
      warning: "#8A5300",
      warningSoft: "#F5E3BF",
      info: "#2B5A8A",
      infoSoft: "#DCE4EC",
      highlight: "#5B3E8C",
      highlightSoft: "#E6DDEE",
      overlay: "rgba(51,40,26,0.6)",
    },
  },
  oceano: {
    id: "oceano",
    nome: "Oceano",
    descricao: "Azul-marinho da identidade OSI",
    isDark: true,
    colors: {
      bg: "#0A1628",
      card: "#13233D",
      surfaceAlt: "#22385A",
      text: "#E6EEF8",
      textLight: "#A9BCD4",
      textMuted: "#5F7898",
      border: "#22385A",
      inputBg: "#13233D",
      primary: "#60A5FA",
      onPrimary: "#06162B",
      success: "#4ADE80",
      successSoft: "rgba(74,222,128,0.15)",
      danger: "#FCA5A5",
      dangerSoft: "rgba(252,165,165,0.15)",
      warning: "#FCD34D",
      warningSoft: "rgba(252,211,77,0.15)",
      info: "#7DD3FC",
      infoSoft: "rgba(125,211,252,0.15)",
      highlight: "#C4B5FD",
      highlightSoft: "rgba(196,181,253,0.15)",
      overlay: "rgba(0,0,0,0.7)",
    },
  },
  noturno: {
    id: "noturno",
    nome: "Noturno",
    descricao: "Preto puro, economiza bateria em telas AMOLED",
    isDark: true,
    colors: {
      bg: "#000000",
      card: "#121212",
      surfaceAlt: "#262626",
      text: "#EDEDED",
      textLight: "#B0B0B0",
      textMuted: "#6B6B6B",
      border: "#262626",
      inputBg: "#121212",
      primary: "#34D399",
      onPrimary: "#022C22",
      success: "#4ADE80",
      successSoft: "rgba(74,222,128,0.15)",
      danger: "#F87171",
      dangerSoft: "rgba(248,113,113,0.15)",
      warning: "#FBBF24",
      warningSoft: "rgba(251,191,36,0.15)",
      info: "#60A5FA",
      infoSoft: "rgba(96,165,250,0.15)",
      highlight: "#A5B4FC",
      highlightSoft: "rgba(165,180,252,0.15)",
      overlay: "rgba(0,0,0,0.8)",
    },
  },
};

export const THEME_LIST = Object.values(THEMES);

type ThemeContextType = {
  /** Tema efetivamente aplicado (resolve "auto" pelo esquema do sistema) */
  theme: ThemeDef;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.claro,
  preference: "auto",
  setPreference: () => {},
  colors: THEMES.claro.colors,
  isDark: false,
});

const PREFERENCIAS_VALIDAS: ThemePreference[] = ["auto", ...(Object.keys(THEMES) as ThemeId[])];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");
  const [esquemaSistema, setEsquemaSistema] = useState(Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      // "dark"/"light" eram os valores da versão com só dois temas
      if (val === "dark") setPreferenceState("escuro");
      else if (val === "light") setPreferenceState("claro");
      else if (val && PREFERENCIAS_VALIDAS.includes(val as ThemePreference)) {
        setPreferenceState(val as ThemePreference);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setEsquemaSistema(colorScheme));
    return () => sub.remove();
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  };

  const value = useMemo(() => {
    const theme =
      preference === "auto"
        ? esquemaSistema === "dark" ? THEMES.escuro : THEMES.claro
        : THEMES[preference];
    return { theme, preference, setPreference, colors: theme.colors, isDark: theme.isDark };
  }, [preference, esquemaSistema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Gera os estilos da tela a partir do tema ativo. A factory deve ser definida
 * fora do componente (nível de módulo) para o memo funcionar:
 *   const createStyles = (c: ThemeColors) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(createStyles);
 */
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
