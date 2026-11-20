import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "../components/AppText";
import { ScreenHeader } from "../components/ScreenHeader";
import { ESCALAS_FONTE, useAccessibility, type AccessibilityPrefs } from "../src/context/AccessibilityContext";
import {
  THEME_LIST,
  THEMES,
  useTheme,
  useThemedStyles,
  type ThemeColors,
  type ThemeDef,
  type ThemePreference,
} from "../src/context/ThemeContext";
import { speech } from "../src/services/speech";

export default function Configuracoes() {
  const { preference, setPreference, colors } = useTheme();
  const a11y = useAccessibility();
  const styles = useThemedStyles(createStyles);

  const idxFonte = Math.max(0, ESCALAS_FONTE.findIndex((e) => e.valor === a11y.fontScale));
  const mudarFonte = (delta: number) => {
    const novo = ESCALAS_FONTE[Math.min(Math.max(idxFonte + delta, 0), ESCALAS_FONTE.length - 1)];
    a11y.update({ fontScale: novo.valor });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Aparência e acessibilidade" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── TEMA ─────────────────────────────── */}
        <Text style={styles.secao} accessibilityRole="header">Tema</Text>
        <View style={styles.temas} accessibilityRole="radiogroup" accessibilityLabel="Tema do aplicativo">
          <OpcaoAutomatica selecionado={preference === "auto"} onPress={() => setPreference("auto")} />
          {THEME_LIST.map((t) => (
            <CartaoTema
              key={t.id}
              tema={t}
              selecionado={preference === t.id}
              onPress={() => setPreference(t.id as ThemePreference)}
            />
          ))}
        </View>

        {/* ── TAMANHO DA FONTE ─────────────────── */}
        <Text style={styles.secao} accessibilityRole="header">Tamanho do texto</Text>
        <View style={styles.cartao}>
          <View style={styles.linhaFonte}>
            <TouchableOpacity
              style={[styles.botaoFonte, idxFonte === 0 && styles.desabilitado]}
              onPress={() => mudarFonte(-1)}
              disabled={idxFonte === 0}
              accessibilityRole="button"
              accessibilityLabel="Diminuir texto"
            >
              <Text style={styles.botaoFonteTexto}>A−</Text>
            </TouchableOpacity>

            <View
              style={styles.escala}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Tamanho do texto"
              accessibilityValue={{ text: ESCALAS_FONTE[idxFonte].nome }}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={(e) => mudarFonte(e.nativeEvent.actionName === "increment" ? 1 : -1)}
            >
              <View style={styles.pontos}>
                {ESCALAS_FONTE.map((e, i) => (
                  <Pressable
                    key={e.valor}
                    onPress={() => a11y.update({ fontScale: e.valor })}
                    style={[styles.ponto, i <= idxFonte && styles.pontoAtivo, { width: 10 + i * 3, height: 10 + i * 3 }]}
                    importantForAccessibility="no"
                    hitSlop={8}
                  />
                ))}
              </View>
              <Text style={styles.escalaNome}>{ESCALAS_FONTE[idxFonte].nome}</Text>
            </View>

            <TouchableOpacity
              style={[styles.botaoFonte, idxFonte === ESCALAS_FONTE.length - 1 && styles.desabilitado]}
              onPress={() => mudarFonte(1)}
              disabled={idxFonte === ESCALAS_FONTE.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Aumentar texto"
            >
              <Text style={[styles.botaoFonteTexto, { fontSize: 20 }]}>A+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previa}>
            <Text style={styles.previaTitulo}>Questão 1</Text>
            <Text style={styles.previaTexto}>
              Qual estrutura de dados segue a regra "o primeiro a entrar é o primeiro a sair"?
            </Text>
          </View>
        </View>

        {/* ── LEITURA ──────────────────────────── */}
        <Text style={styles.secao} accessibilityRole="header">Leitura</Text>
        <View style={styles.cartao}>
          <Alternar
            icone="text"
            titulo="Texto em negrito"
            descricao="Deixa todos os textos mais grossos"
            valor={a11y.boldText}
            onChange={(v) => a11y.update({ boldText: v })}
          />
          <Separador />
          <Alternar
            icone="eye-outline"
            titulo="Fonte de alta legibilidade"
            descricao="Atkinson Hyperlegible, criada para pessoas com baixa visão"
            valor={a11y.legibleFont}
            onChange={(v) => a11y.update({ legibleFont: v })}
          />
          <Separador />
          <Alternar
            icone="volume-high-outline"
            titulo="Ler em voz alta"
            descricao="Mostra o botão Ouvir nas questões e nas respostas da OSIA"
            valor={a11y.readAloud}
            onChange={(v) => {
              a11y.update({ readAloud: v });
              if (v) speech.falar("Leitura em voz alta ativada.");
            }}
          />
        </View>

        {/* ── MOVIMENTO ────────────────────────── */}
        <Text style={styles.secao} accessibilityRole="header">Reduzir animações</Text>
        <View style={styles.cartao}>
          <Text style={styles.descricao}>
            Remove transições e efeitos de movimento. Ajuda quem sente tontura ou se distrai com animações.
          </Text>
          <View style={styles.segmentos} accessibilityRole="radiogroup" accessibilityLabel="Reduzir animações">
            {([
              ["sistema", "Igual ao celular"],
              ["sim", "Sim"],
              ["nao", "Não"],
            ] as [AccessibilityPrefs["reduceMotion"], string][]).map(([valor, nome]) => {
              const ativo = a11y.reduceMotion === valor;
              return (
                <TouchableOpacity
                  key={valor}
                  style={[styles.segmento, ativo && styles.segmentoAtivo]}
                  onPress={() => a11y.update({ reduceMotion: valor })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                >
                  <Text style={[styles.segmentoTexto, ativo && styles.segmentoTextoAtivo]}>{nome}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.cartao, styles.dica]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={[styles.descricao, { flex: 1 }]}>
            O app também funciona com o leitor de tela do celular (TalkBack no Android, VoiceOver no iPhone) e
            respeita o tamanho de fonte definido no sistema.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.restaurar}
          onPress={() => {
            a11y.reset();
            setPreference("auto");
          }}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={18} color={colors.danger} />
          <Text style={styles.restaurarTexto}>Restaurar padrões</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function CartaoTema({ tema, selecionado, onPress }: { tema: ThemeDef; selecionado: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const t = tema.colors;
  return (
    <TouchableOpacity
      style={[styles.tema, selecionado && styles.temaSelecionado]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel={`${tema.nome}. ${tema.descricao}`}
    >
      {/* Miniatura desenhada com as cores do próprio tema, não do ativo */}
      <View style={[styles.miniatura, { backgroundColor: t.bg, borderColor: t.border }]}>
        <View style={[styles.miniCartao, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={{ color: t.text, fontWeight: "bold", fontSize: 13 }}>Aa</Text>
          <View style={[styles.miniLinha, { backgroundColor: t.textLight }]} />
        </View>
        <View style={[styles.miniBotao, { backgroundColor: t.primary }]}>
          <View style={[styles.miniLinha, { backgroundColor: t.onPrimary, width: 18 }]} />
        </View>
      </View>
      <View style={styles.temaRodape}>
        <Text style={styles.temaNome} numberOfLines={1}>{tema.nome}</Text>
        {selecionado && <Ionicons name="checkmark-circle" size={18} color={styles.marcador.color} />}
      </View>
    </TouchableOpacity>
  );
}

function OpcaoAutomatica({ selecionado, onPress }: { selecionado: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.tema, selecionado && styles.temaSelecionado]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel="Automático. Claro ou escuro, igual ao celular"
    >
      <View style={[styles.miniatura, styles.miniAuto]}>
        <View style={[styles.metade, { backgroundColor: THEMES.claro.colors.bg }]} />
        <View style={[styles.metade, { backgroundColor: THEMES.escuro.colors.bg }]} />
        <Ionicons name="phone-portrait-outline" size={22} color={THEMES.claro.colors.primary} style={styles.miniAutoIcone} />
      </View>
      <View style={styles.temaRodape}>
        <Text style={styles.temaNome} numberOfLines={1}>Automático</Text>
        {selecionado && <Ionicons name="checkmark-circle" size={18} color={styles.marcador.color} />}
      </View>
    </TouchableOpacity>
  );
}

function Alternar(props: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    // A linha inteira é o controle: toque em qualquer ponto e um único foco no leitor de tela
    <Pressable
      style={styles.alternar}
      onPress={() => props.onChange(!props.valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: props.valor }}
      accessibilityLabel={props.titulo}
      accessibilityHint={props.descricao}
    >
      <Ionicons name={props.icone} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.alternarTitulo}>{props.titulo}</Text>
        <Text style={styles.descricao}>{props.descricao}</Text>
      </View>
      <Switch
        value={props.valor}
        onValueChange={props.onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={props.valor ? colors.onPrimary : colors.card}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

function Separador() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.separador} />;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    secao: { fontSize: 13, fontWeight: "bold", color: c.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
    cartao: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 },
    descricao: { fontSize: 13, color: c.textLight, lineHeight: 18 },

    temas: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tema: { width: "31%", flexGrow: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 2, borderColor: c.border, padding: 8 },
    temaSelecionado: { borderColor: c.primary },
    marcador: { color: c.primary },
    miniatura: { height: 64, borderRadius: 10, borderWidth: 1, padding: 6, justifyContent: "space-between" },
    miniCartao: { borderRadius: 6, borderWidth: 1, padding: 4, gap: 3 },
    miniLinha: { height: 3, width: 28, borderRadius: 2, opacity: 0.8 },
    miniBotao: { height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
    miniAuto: { flexDirection: "row", padding: 0, overflow: "hidden", borderColor: c.border },
    metade: { flex: 1 },
    miniAutoIcone: { position: "absolute", alignSelf: "center", left: "50%", marginLeft: -11, top: 20 },
    temaRodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, minHeight: 20 },
    temaNome: { fontSize: 13, fontWeight: "600", color: c.text, flexShrink: 1 },

    linhaFonte: { flexDirection: "row", alignItems: "center", gap: 10 },
    botaoFonte: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.surfaceAlt, justifyContent: "center", alignItems: "center" },
    botaoFonteTexto: { fontSize: 15, fontWeight: "bold", color: c.text },
    desabilitado: { opacity: 0.4 },
    escala: { flex: 1, alignItems: "center", gap: 6 },
    pontos: { flexDirection: "row", alignItems: "center", gap: 10 },
    ponto: { borderRadius: 20, backgroundColor: c.border },
    pontoAtivo: { backgroundColor: c.primary },
    escalaNome: { fontSize: 13, fontWeight: "600", color: c.text },
    previa: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
    previaTitulo: { fontSize: 12, fontWeight: "bold", color: c.primary, marginBottom: 4 },
    previaTexto: { fontSize: 16, fontWeight: "bold", color: c.text, lineHeight: 22 },

    alternar: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56 },
    alternarTitulo: { fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 2 },
    separador: { height: 1, backgroundColor: c.border, marginVertical: 12 },

    segmentos: { flexDirection: "row", gap: 8, marginTop: 12 },
    segmento: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.border, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
    segmentoAtivo: { backgroundColor: c.primary, borderColor: c.primary },
    segmentoTexto: { fontSize: 13, fontWeight: "600", color: c.text, textAlign: "center" },
    segmentoTextoAtivo: { color: c.onPrimary },

    dica: { flexDirection: "row", gap: 10, marginTop: 20, alignItems: "flex-start" },
    restaurar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.danger },
    restaurarTexto: { fontSize: 15, fontWeight: "bold", color: c.danger },
  });
