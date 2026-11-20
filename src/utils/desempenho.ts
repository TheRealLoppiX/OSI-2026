import type { ThemeColors } from "../context/ThemeContext";

// Faixa de desempenho de um simulado, usada no resultado, no histórico e no
// painel de analytics. O rótulo acompanha a cor para não depender só dela.
export function faixaDesempenho(pct: number, c: ThemeColors) {
  if (pct >= 80) return { label: "Excelente!", cor: c.success, bg: c.successSoft };
  if (pct >= 60) return { label: "Bom desempenho", cor: c.info, bg: c.infoSoft };
  if (pct >= 40) return { label: "Em desenvolvimento", cor: c.warning, bg: c.warningSoft };
  return { label: "Precisa revisar", cor: c.danger, bg: c.dangerSoft };
}
