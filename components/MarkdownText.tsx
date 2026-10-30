import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TextStyle, View } from "react-native";
import { useTheme } from "../src/context/ThemeContext";

// Renderizador mínimo de Markdown para as respostas da OSIA. Cobre só o que o
// modelo costuma mandar (títulos, listas, negrito/itálico, código, links,
// citações, tabelas simples); sem dependência externa porque as libs de
// Markdown para RN estão sem manutenção e puxam markdown-it inteiro.

type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "lista"; ordenada: boolean; itens: { marcador: string; texto: string; nivel: number }[] }
  | { tipo: "codigo"; texto: string }
  | { tipo: "citacao"; texto: string }
  | { tipo: "tabela"; linhas: string[][] }
  | { tipo: "separador" };

const RE_ITEM = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;
const RE_TABELA_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const celulas = (linha: string) =>
  linha.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function parseBlocos(md: string): Bloco[] {
  const linhas = md.replace(/\r\n?/g, "\n").split("\n");
  const blocos: Bloco[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (!linha.trim()) { i++; continue; }

    // Bloco de código cercado por ```; se o modelo esquecer de fechar,
    // vai até o fim em vez de sumir com o resto da resposta
    if (/^\s*```/.test(linha)) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !/^\s*```/.test(linhas[i])) corpo.push(linhas[i++]);
      i++;
      blocos.push({ tipo: "codigo", texto: corpo.join("\n") });
      continue;
    }

    const titulo = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(linha);
    if (titulo) {
      blocos.push({ tipo: "titulo", nivel: titulo[1].length, texto: titulo[2] });
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(linha)) {
      blocos.push({ tipo: "separador" });
      i++;
      continue;
    }

    if (/^\s*>/.test(linha)) {
      const corpo: string[] = [];
      while (i < linhas.length && /^\s*>/.test(linhas[i])) corpo.push(linhas[i++].replace(/^\s*>\s?/, ""));
      blocos.push({ tipo: "citacao", texto: corpo.join("\n") });
      continue;
    }

    if (linha.includes("|") && i + 1 < linhas.length && RE_TABELA_SEP.test(linhas[i + 1])) {
      const tabela = [celulas(linha)];
      i += 2;
      while (i < linhas.length && linhas[i].includes("|") && linhas[i].trim()) tabela.push(celulas(linhas[i++]));
      blocos.push({ tipo: "tabela", linhas: tabela });
      continue;
    }

    if (RE_ITEM.test(linha)) {
      const ordenada = /^\s*\d/.test(linha);
      const itens: { marcador: string; texto: string; nivel: number }[] = [];
      while (i < linhas.length) {
        const m = RE_ITEM.exec(linhas[i]);
        if (m) {
          const marcador = /\d/.test(m[2]) ? m[2].replace(")", ".") : "•";
          itens.push({ marcador, texto: m[3], nivel: Math.min(Math.floor(m[1].length / 2), 3) });
          i++;
        } else if (linhas[i].trim() && /^\s{2,}/.test(linhas[i]) && itens.length) {
          // Continuação indentada do item anterior
          itens[itens.length - 1].texto += " " + linhas[i++].trim();
        } else break;
      }
      blocos.push({ tipo: "lista", ordenada, itens });
      continue;
    }

    // Parágrafo: junta linhas até uma linha em branco ou o início de outro bloco
    const corpo: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !/^\s*(```|#{1,6}\s|>)/.test(linhas[i]) &&
      !RE_ITEM.test(linhas[i])
    ) corpo.push(linhas[i++].trim());
    blocos.push({ tipo: "paragrafo", texto: corpo.join("\n") });
  }
  return blocos;
}

// Inline: **negrito**, __negrito__, *itálico*, `código`, ~~riscado~~, [texto](url).
// _itálico_ fica de fora de propósito: quebraria nomes como minha_variavel.
const RE_INLINE =
  /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(__(.+?)__)|(`([^`]+)`)|(~~(.+?)~~)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*([^*\s](?:[^*\n]*[^*\s])?)\*)/;

type Estilos = {
  cor: string;
  corCodigo: string;
  fundoCodigo: string;
  corLink: string;
};

function renderInline(texto: string, e: Estilos, chave = "i"): React.ReactNode[] {
  const nos: React.ReactNode[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  // Cópia da regex: renderInline é recursiva e uma regex global compartilhada
  // teria o lastIndex sobrescrito pelas chamadas internas
  const re = new RegExp(RE_INLINE.source, "g");

  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) nos.push(texto.slice(ultimo, m.index));
    const k = `${chave}-${n++}`;
    if (m[2] !== undefined) {
      nos.push(<Text key={k} style={{ fontWeight: "bold", fontStyle: "italic" }}>{renderInline(m[2], e, k)}</Text>);
    } else if (m[4] !== undefined || m[6] !== undefined) {
      nos.push(<Text key={k} style={{ fontWeight: "bold" }}>{renderInline(m[4] ?? m[6], e, k)}</Text>);
    } else if (m[8] !== undefined) {
      nos.push(
        <Text key={k} style={[styles.codigoInline, { color: e.corCodigo, backgroundColor: e.fundoCodigo }]}>
          {` ${m[8]} `}
        </Text>
      );
    } else if (m[10] !== undefined) {
      nos.push(<Text key={k} style={{ textDecorationLine: "line-through" }}>{renderInline(m[10], e, k)}</Text>);
    } else if (m[12] !== undefined) {
      const url = m[13];
      nos.push(
        <Text
          key={k}
          style={{ color: e.corLink, textDecorationLine: "underline" }}
          onPress={() => Linking.openURL(url).catch(() => {})}
          accessibilityRole="link"
        >
          {m[12]}
        </Text>
      );
    } else if (m[15] !== undefined) {
      nos.push(<Text key={k} style={{ fontStyle: "italic" }}>{renderInline(m[15], e, k)}</Text>);
    }
    ultimo = re.lastIndex;
  }
  if (ultimo < texto.length) nos.push(texto.slice(ultimo));
  return nos;
}

type Props = {
  children: string;
  /** Cor do texto; padrão é a do tema */
  color?: string;
  style?: TextStyle;
};

export default function MarkdownText({ children, color, style }: Props) {
  const { colors, isDark } = useTheme();
  const cor = color ?? colors.text;
  const e: Estilos = {
    cor,
    corCodigo: isDark ? "#E2E8F0" : "#0F172A",
    fundoCodigo: isDark ? "rgba(15,23,42,0.6)" : "rgba(15,23,42,0.07)",
    corLink: color ? cor : colors.primary,
  };
  const base: TextStyle = { color: cor, fontSize: 15, lineHeight: 22, ...style };
  const blocos = parseBlocos(children ?? "");

  return (
    <View style={styles.container}>
      {blocos.map((b, i) => {
        const k = `b${i}`;
        switch (b.tipo) {
          case "titulo":
            return (
              <Text
                key={k}
                selectable
                style={[base, styles.titulo, { fontSize: (base.fontSize ?? 15) + Math.max(4 - b.nivel, 0) * 2 }]}
              >
                {renderInline(b.texto, e, k)}
              </Text>
            );
          case "lista":
            return (
              <View key={k} style={styles.lista}>
                {b.itens.map((item, j) => (
                  <View key={`${k}-${j}`} style={[styles.item, { paddingLeft: item.nivel * 14 }]}>
                    <Text style={[base, styles.marcador, b.ordenada && styles.marcadorNumero]}>{item.marcador}</Text>
                    <Text selectable style={[base, styles.itemTexto]}>{renderInline(item.texto, e, `${k}-${j}`)}</Text>
                  </View>
                ))}
              </View>
            );
          case "codigo":
            return (
              <ScrollView
                key={k}
                horizontal
                style={[styles.codigoBloco, { backgroundColor: e.fundoCodigo, borderColor: colors.border }]}
                contentContainerStyle={styles.codigoConteudo}
              >
                <Text selectable style={[styles.codigoTexto, { color: e.corCodigo }]}>{b.texto}</Text>
              </ScrollView>
            );
          case "citacao":
            return (
              <View key={k} style={[styles.citacao, { borderLeftColor: colors.primary }]}>
                <Text selectable style={[base, { color: colors.textLight }]}>{renderInline(b.texto, e, k)}</Text>
              </View>
            );
          case "tabela":
            return (
              <ScrollView key={k} horizontal style={styles.tabelaScroll}>
                <View style={[styles.tabela, { borderColor: colors.border }]}>
                  {b.linhas.map((linha, r) => (
                    <View
                      key={`${k}-${r}`}
                      style={[styles.tabelaLinha, { borderColor: colors.border }, r === 0 && { backgroundColor: e.fundoCodigo }]}
                    >
                      {linha.map((cel, c) => (
                        <Text
                          key={`${k}-${r}-${c}`}
                          selectable
                          style={[base, styles.tabelaCelula, r === 0 && styles.titulo]}
                        >
                          {renderInline(cel, e, `${k}-${r}-${c}`)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          case "separador":
            return <View key={k} style={[styles.separador, { backgroundColor: colors.border }]} />;
          default:
            return (
              <Text key={k} selectable style={base}>
                {renderInline(b.texto, e, k)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  titulo: { fontWeight: "bold" },
  lista: { gap: 4 },
  item: { flexDirection: "row" },
  marcador: { width: 16 },
  marcadorNumero: { width: 24 },
  itemTexto: { flex: 1 },
  codigoInline: { fontFamily: "monospace", fontSize: 13, borderRadius: 4 },
  codigoBloco: { borderRadius: 10, borderWidth: 1 },
  codigoConteudo: { padding: 12 },
  codigoTexto: { fontFamily: "monospace", fontSize: 13, lineHeight: 19 },
  citacao: { borderLeftWidth: 3, paddingLeft: 10 },
  tabelaScroll: { flexGrow: 0 },
  tabela: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabelaCelula: { minWidth: 90, maxWidth: 200, padding: 8, fontSize: 13, lineHeight: 18 },
  separador: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
