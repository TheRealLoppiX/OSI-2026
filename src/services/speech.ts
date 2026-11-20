import * as Speech from "expo-speech";

// Remove a marcação de Markdown antes de ler, senão o sintetizador lê
// "asterisco asterisco" e "cerquilha" em voz alta
function textoParaFala(texto: string) {
  return texto
    .replace(/```[\s\S]*?```/g, " (trecho de código) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__|\*|~~)/g, "")
    .replace(/\|/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export const speech = {
  /** Lê o texto; se já estava falando, interrompe a leitura anterior */
  falar(texto: string, aoTerminar?: () => void) {
    Speech.stop();
    Speech.speak(textoParaFala(texto), {
      language: "pt-BR",
      rate: 0.95,
      onDone: aoTerminar,
      onStopped: aoTerminar,
      onError: aoTerminar,
    });
  },
  parar() {
    Speech.stop();
  },
};
