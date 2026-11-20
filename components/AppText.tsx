import React, { createContext, forwardRef, useContext } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { useAccessibility } from "../src/context/AccessibilityContext";

// Substitutos de Text/TextInput do react-native usados no app inteiro. Aplicam
// as preferências de acessibilidade (tamanho da fonte, negrito, fonte de alta
// legibilidade) sem cada tela precisar saber delas.

export const FONTES_LEGIVEIS = {
  regular: "AtkinsonHyperlegible_400Regular",
  italic: "AtkinsonHyperlegible_400Regular_Italic",
  bold: "AtkinsonHyperlegible_700Bold",
  boldItalic: "AtkinsonHyperlegible_700Bold_Italic",
};

// Tamanho padrão do RN quando o estilo não define fontSize
const FONTE_PADRAO = 14;

// Text aninhado herda tamanho/família do pai; só o mais externo aplica o
// tamanho padrão escalado, senão o filho sobrescreveria o tamanho do pai
const DentroDeTexto = createContext(false);

const pesoNumerico = (w: TextStyle["fontWeight"]) =>
  w === "bold" ? 700 : w === "normal" || w === undefined ? 400 : Number(w) || 400;

function useEstiloAcessivel(style: TextProps["style"], aninhado: boolean): TextStyle {
  const { fontScale, boldText, legibleFont } = useAccessibility();
  const s: TextStyle = { ...(StyleSheet.flatten(style) || {}) };

  if (s.fontSize !== undefined) s.fontSize = s.fontSize * fontScale;
  else if (!aninhado && fontScale !== 1) s.fontSize = FONTE_PADRAO * fontScale;
  if (typeof s.lineHeight === "number") s.lineHeight = s.lineHeight * fontScale;

  // Nunca mexe em fontFamily explícita (ex.: monospace dos blocos de código)
  if (boldText || legibleFont) {
    const peso = pesoNumerico(s.fontWeight);
    const negrito = peso >= 600 || (boldText && peso >= 400);
    if (legibleFont && !s.fontFamily) {
      const italico = s.fontStyle === "italic";
      s.fontFamily = negrito
        ? italico ? FONTES_LEGIVEIS.boldItalic : FONTES_LEGIVEIS.bold
        : italico ? FONTES_LEGIVEIS.italic : FONTES_LEGIVEIS.regular;
      // Com fonte customizada o Android ignora/duplica o peso; a família já o define
      delete s.fontWeight;
      delete s.fontStyle;
    } else if (boldText && peso < 700) {
      s.fontWeight = peso >= 600 ? "800" : "600";
    }
  }
  return s;
}

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const aninhado = useContext(DentroDeTexto);
  const style = useEstiloAcessivel(props.style, aninhado);
  const texto = <RNText ref={ref} {...props} style={style} />;
  return aninhado ? texto : <DentroDeTexto.Provider value>{texto}</DentroDeTexto.Provider>;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const style = useEstiloAcessivel(props.style, false);
  return <RNTextInput ref={ref} {...props} style={style} />;
});
