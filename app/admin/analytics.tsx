import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../../components/AppText";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useNavigationLoading } from "../../src/context/NavigationLoadingContext";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";
import { faixaDesempenho } from "../../src/utils/desempenho";
import { friendlyError } from "../../src/utils/friendlyError";

// Painel de analytics do docente. Tudo é calculado no cliente a partir de
// `tentativas` e `usuarios` (volume da OSI cabe folgado). Os gráficos são de
// série única: uma cor (primary), sem legenda, valor sob toque e visão em tabela.

type Tentativa = { usuario_id: string; simulado_id: string | null; titulo: string; acertos: number; total: number; created_at: string };
type Usuario = { id: string; usuario: string; nome: string | null; instituicao: string | null; created_at: string; ultimo_acesso: string | null };

const PERIODOS = [
  { dias: 7, nome: "7 dias" },
  { dias: 30, nome: "30 dias" },
  { dias: 90, nome: "90 dias" },
] as const;

const PREFIXO_IA = "Treino IA:";
const DIA_MS = 24 * 60 * 60 * 1000;

const chaveDia = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Recife" }); // AAAA-MM-DD
const rotuloDia = (chave: string) => `${chave.slice(8, 10)}/${chave.slice(5, 7)}`;
const pct = (acertos: number, total: number) => (total > 0 ? Math.round((acertos / total) * 100) : 0);

export default function AdminAnalytics() {
  const { pageReady } = useNavigationLoading();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [dias, setDias] = useState<number>(30);
  const [tentativas, setTentativas] = useState<Tentativa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [t, u] = await Promise.all([
        supabase
          .from("tentativas")
          .select("usuario_id, simulado_id, titulo, acertos, total, created_at")
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.from("usuarios").select("id, usuario, nome, instituicao, created_at, ultimo_acesso"),
      ]);
      if (t.error) throw t.error;
      if (u.error) throw u.error;
      setTentativas((t.data as Tentativa[]) || []);
      setUsuarios((u.data as Usuario[]) || []);
    } catch (e) {
      setErro(friendlyError(e, "Não foi possível carregar os dados."));
    } finally {
      setLoading(false);
      setRefreshing(false);
      pageReady();
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dados = useMemo(() => {
    const agora = Date.now();
    const inicio = agora - dias * DIA_MS;
    const noPeriodo = tentativas.filter((t) => new Date(t.created_at).getTime() >= inicio);

    const acertos = noPeriodo.reduce((s, t) => s + t.acertos, 0);
    const questoes = noPeriodo.reduce((s, t) => s + t.total, 0);
    const ativos = new Set(noPeriodo.map((t) => t.usuario_id));
    const novos = usuarios.filter((u) => new Date(u.created_at).getTime() >= inicio).length;

    // Série diária com todos os dias do período (dia sem atividade = 0, não some)
    const porDia = new Map<string, number>();
    for (let i = dias - 1; i >= 0; i--) porDia.set(chaveDia(new Date(agora - i * DIA_MS)), 0);
    noPeriodo.forEach((t) => {
      const k = chaveDia(new Date(t.created_at));
      if (porDia.has(k)) porDia.set(k, (porDia.get(k) || 0) + 1);
    });

    // Simulados oficiais (têm simulado_id) x treinos livres gerados pela IA
    const oficiais = new Map<string, { titulo: string; tentativas: number; acertos: number; total: number }>();
    const temasIA = new Map<string, { tema: string; tentativas: number; acertos: number; total: number }>();
    noPeriodo.forEach((t) => {
      if (t.simulado_id) {
        const o = oficiais.get(t.simulado_id) || { titulo: t.titulo, tentativas: 0, acertos: 0, total: 0 };
        o.tentativas++; o.acertos += t.acertos; o.total += t.total;
        oficiais.set(t.simulado_id, o);
      } else {
        const tema = (t.titulo.startsWith(PREFIXO_IA) ? t.titulo.slice(PREFIXO_IA.length) : t.titulo).trim() || "Sem tema";
        const chave = tema.toLowerCase();
        const o = temasIA.get(chave) || { tema, tentativas: 0, acertos: 0, total: 0 };
        o.tentativas++; o.acertos += t.acertos; o.total += t.total;
        temasIA.set(chave, o);
      }
    });

    // Média de cada aluno no período -> faixas de desempenho
    const porAluno = new Map<string, { acertos: number; total: number }>();
    noPeriodo.forEach((t) => {
      const a = porAluno.get(t.usuario_id) || { acertos: 0, total: 0 };
      a.acertos += t.acertos; a.total += t.total;
      porAluno.set(t.usuario_id, a);
    });
    const faixas = [
      { nome: "Precisa revisar", min: 0, max: 39, qtd: 0 },
      { nome: "Em desenvolvimento", min: 40, max: 59, qtd: 0 },
      { nome: "Bom desempenho", min: 60, max: 79, qtd: 0 },
      { nome: "Excelente", min: 80, max: 100, qtd: 0 },
    ];
    porAluno.forEach((a) => {
      const p = pct(a.acertos, a.total);
      const f = faixas.find((x) => p >= x.min && p <= x.max);
      if (f) f.qtd++;
    });

    // Quem precisa de atenção: sem simulado no período
    const semAtividade = usuarios
      .filter((u) => !ativos.has(u.id))
      .map((u) => ({
        ...u,
        diasSemAcesso: u.ultimo_acesso ? Math.floor((agora - new Date(u.ultimo_acesso).getTime()) / DIA_MS) : null,
      }))
      .sort((a, b) => (b.diasSemAcesso ?? 9999) - (a.diasSemAcesso ?? 9999));

    const porInstituicao = new Map<string, number>();
    usuarios.forEach((u) => {
      const k = u.instituicao || "Sem instituição";
      porInstituicao.set(k, (porInstituicao.get(k) || 0) + 1);
    });

    return {
      tentativasPeriodo: noPeriodo.length,
      mediaAcerto: pct(acertos, questoes),
      ativos: ativos.size,
      novos,
      serieDiaria: Array.from(porDia, ([dia, valor]) => ({ dia, valor })),
      oficiais: Array.from(oficiais.values())
        .map((o) => ({ rotulo: o.titulo, valor: pct(o.acertos, o.total), detalhe: `${o.tentativas} tentativa(s)` }))
        .sort((a, b) => a.valor - b.valor),
      temasIA: Array.from(temasIA.values())
        .map((o) => ({ rotulo: o.tema, valor: o.tentativas, detalhe: `${pct(o.acertos, o.total)}% de acerto` }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8),
      faixas,
      semAtividade,
      porInstituicao: Array.from(porInstituicao, ([rotulo, valor]) => ({ rotulo, valor, detalhe: "" })).sort((a, b) => b.valor - a.valor),
    };
  }, [tentativas, usuarios, dias]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const faixaMedia = faixaDesempenho(dados.mediaAcerto, colors);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Analytics" subtitle="Desempenho e engajamento dos alunos" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} colors={[colors.primary]} />}
      >
        {/* Filtro de período: uma linha, acima de todos os gráficos */}
        <View style={styles.periodos} accessibilityRole="radiogroup" accessibilityLabel="Período">
          {PERIODOS.map((p) => {
            const ativo = dias === p.dias;
            return (
              <TouchableOpacity
                key={p.dias}
                style={[styles.periodo, ativo && styles.periodoAtivo]}
                onPress={() => setDias(p.dias)}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`Últimos ${p.nome}`}
              >
                <Text style={[styles.periodoTexto, ativo && styles.periodoTextoAtivo]}>{p.nome}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {erro && (
          <View style={styles.erro} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.textoPequeno, { flex: 1, color: colors.text }]}>{erro}</Text>
            <TouchableOpacity onPress={carregar} accessibilityRole="button">
              <Text style={[styles.textoPequeno, { color: colors.primary, fontWeight: "bold" }]}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KPIs: números de destaque, não gráficos */}
        <View style={styles.kpis}>
          <Kpi icone="people" valor={String(dados.ativos)} rotulo="Alunos ativos" detalhe={`de ${usuarios.length} cadastrados`} />
          <Kpi icone="document-text" valor={String(dados.tentativasPeriodo)} rotulo="Simulados feitos" detalhe="oficiais + IA" />
          <Kpi
            icone="checkmark-done"
            valor={`${dados.mediaAcerto}%`}
            rotulo="Média de acerto"
            detalhe={dados.tentativasPeriodo ? faixaMedia.label : "sem dados"}
          />
          <Kpi icone="person-add" valor={String(dados.novos)} rotulo="Novos cadastros" detalhe="no período" />
        </View>

        <Secao titulo="Simulados por dia" descricao="Quantidade de simulados concluídos em cada dia. Toque numa barra para ver o valor.">
          <GraficoDiario serie={dados.serieDiaria} />
        </Secao>

        <Secao titulo="Distribuição dos alunos por desempenho" descricao="Média de acerto de cada aluno ativo no período.">
          <ListaBarras
            itens={dados.faixas.map((f) => ({ rotulo: `${f.nome} (${f.min}–${f.max}%)`, valor: f.qtd, detalhe: "" }))}
            formatar={(v) => `${v} aluno(s)`}
            vazio="Nenhum aluno fez simulado no período."
          />
        </Secao>

        <Secao
          titulo="Simulados oficiais: média de acerto"
          descricao="Do mais difícil para o mais fácil. Média baixa pode indicar conteúdo a reforçar em aula."
        >
          <ListaBarras itens={dados.oficiais} max={100} formatar={(v) => `${v}%`} vazio="Nenhum simulado oficial feito no período." />
        </Secao>

        <Secao titulo="Temas mais treinados com a OSIA" descricao="O que os alunos estão estudando por conta própria no gerador de simulados.">
          <ListaBarras itens={dados.temasIA} formatar={(v) => `${v}x`} vazio="Nenhum treino com IA no período." />
        </Secao>

        <Secao titulo="Alunos por instituição">
          <ListaBarras itens={dados.porInstituicao} formatar={(v) => `${v}`} vazio="Nenhum aluno cadastrado." />
        </Secao>

        <Secao
          titulo={`Sem simulado nos últimos ${dias} dias (${dados.semAtividade.length})`}
          descricao="Alunos que podem precisar de um incentivo."
        >
          {dados.semAtividade.length === 0 ? (
            <Text style={styles.vazio}>Todos os alunos fizeram ao menos um simulado. 🎉</Text>
          ) : (
            dados.semAtividade.slice(0, 15).map((u) => (
              <View
                key={u.id}
                style={styles.linhaAluno}
                accessible
                accessibilityLabel={`${u.nome || u.usuario}, ${u.diasSemAcesso === null ? "nunca acessou" : `último acesso há ${u.diasSemAcesso} dias`}`}
              >
                <Ionicons name="person-circle-outline" size={22} color={colors.textLight} />
                <Text style={[styles.textoPequeno, { flex: 1, color: colors.text }]} numberOfLines={1}>
                  {u.nome || u.usuario}
                </Text>
                <Text style={styles.textoPequeno}>
                  {u.diasSemAcesso === null ? "nunca acessou" : u.diasSemAcesso === 0 ? "acessou hoje" : `há ${u.diasSemAcesso} d`}
                </Text>
              </View>
            ))
          )}
        </Secao>
      </ScrollView>
    </View>
  );
}

function Kpi({ icone, valor, rotulo, detalhe }: { icone: keyof typeof Ionicons.glyphMap; valor: string; rotulo: string; detalhe: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${rotulo}: ${valor}, ${detalhe}`}>
      <Ionicons name={icone} size={18} color={colors.primary} />
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiRotulo}>{rotulo}</Text>
      <Text style={styles.kpiDetalhe}>{detalhe}</Text>
    </View>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo} accessibilityRole="header">{titulo}</Text>
      {descricao ? <Text style={styles.secaoDescricao}>{descricao}</Text> : null}
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

// Colunas verticais por dia. Valor sob toque (o "hover" do toque) + tabela alternativa.
function GraficoDiario({ serie }: { serie: { dia: string; valor: number }[] }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const max = Math.max(1, ...serie.map((s) => s.valor));
  const total = serie.reduce((s, x) => s + x.valor, 0);
  const ALTURA = 140;
  // Escala "redonda" para a linha de referência do topo
  const topo = max <= 5 ? max : Math.ceil(max / 5) * 5;
  const atual = selecionado !== null ? serie[selecionado] : null;

  return (
    <View>
      <View style={styles.graficoTopo}>
        <Text style={styles.textoPequeno} accessibilityLiveRegion="polite">
          {atual ? `${rotuloDia(atual.dia)}: ${atual.valor} simulado(s)` : `${total} no período · toque numa barra`}
        </Text>
        <TouchableOpacity onPress={() => setTabela((v) => !v)} accessibilityRole="button" hitSlop={10}>
          <Text style={[styles.textoPequeno, { color: colors.primary, fontWeight: "bold" }]}>
            {tabela ? "Ver gráfico" : "Ver tabela"}
          </Text>
        </TouchableOpacity>
      </View>

      {tabela ? (
        <View>
          {serie.filter((s) => s.valor > 0).length === 0 ? (
            <Text style={styles.vazio}>Nenhum simulado no período.</Text>
          ) : (
            serie
              .filter((s) => s.valor > 0)
              .reverse()
              .map((s) => (
                <View key={s.dia} style={styles.linhaTabela}>
                  <Text style={[styles.textoPequeno, { color: colors.text }]}>{rotuloDia(s.dia)}</Text>
                  <Text style={[styles.textoPequeno, { color: colors.text, fontWeight: "bold" }]}>{s.valor}</Text>
                </View>
              ))
          )}
        </View>
      ) : (
        <>
          <View style={{ height: ALTURA }}>
            {/* Grade recessiva: só topo e base */}
            <View style={[styles.gradeLinha, { top: 0 }]} />
            <Text style={[styles.eixoTexto, { position: "absolute", right: 0, top: -14 }]}>{topo}</Text>
            <View style={[styles.gradeLinha, { bottom: 0, backgroundColor: colors.textMuted }]} />
            <View style={styles.barras}>
              {serie.map((s, i) => {
                const h = s.valor === 0 ? 0 : Math.max(3, (s.valor / topo) * ALTURA);
                const ativo = selecionado === i;
                return (
                  // Alvo de toque é a coluna inteira, maior que a barra
                  <Pressable
                    key={s.dia}
                    style={styles.colunaToque}
                    onPress={() => setSelecionado(ativo ? null : i)}
                    accessibilityLabel={`${rotuloDia(s.dia)}: ${s.valor} simulado(s)`}
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.barra,
                        { height: h, backgroundColor: colors.primary, opacity: selecionado === null || ativo ? 1 : 0.35 },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.eixoX}>
            <Text style={styles.eixoTexto}>{rotuloDia(serie[0].dia)}</Text>
            <Text style={styles.eixoTexto}>{rotuloDia(serie[serie.length - 1].dia)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// Barras horizontais ranqueadas: rótulo à esquerda, valor em texto à direita
// (lista curta, funciona como tabela, então o valor fica sempre visível).
function ListaBarras({
  itens,
  max,
  formatar,
  vazio,
}: {
  itens: { rotulo: string; valor: number; detalhe: string }[];
  max?: number;
  formatar: (v: number) => string;
  vazio: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  if (!itens.length || itens.every((i) => i.valor === 0)) return <Text style={styles.vazio}>{vazio}</Text>;
  const escala = max ?? Math.max(1, ...itens.map((i) => i.valor));

  return (
    <View style={{ gap: 12 }}>
      {itens.map((i) => (
        <View
          key={i.rotulo}
          accessible
          accessibilityLabel={`${i.rotulo}: ${formatar(i.valor)}${i.detalhe ? `, ${i.detalhe}` : ""}`}
        >
          <View style={styles.listaTopo}>
            <Text style={[styles.textoPequeno, { flex: 1, color: colors.text }]} numberOfLines={1}>{i.rotulo}</Text>
            <Text style={[styles.textoPequeno, { color: colors.text, fontWeight: "bold" }]}>{formatar(i.valor)}</Text>
          </View>
          <View style={styles.trilho}>
            <View style={[styles.preenchimento, { width: `${(i.valor / escala) * 100}%` }]} />
          </View>
          {i.detalhe ? <Text style={styles.kpiDetalhe}>{i.detalhe}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centro: { justifyContent: "center", alignItems: "center" },
    scroll: { padding: 16, paddingBottom: 40, gap: 14 },

    periodos: { flexDirection: "row", gap: 8 },
    periodo: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, justifyContent: "center", alignItems: "center" },
    periodoAtivo: { backgroundColor: c.primary, borderColor: c.primary },
    periodoTexto: { fontSize: 14, fontWeight: "600", color: c.text },
    periodoTextoAtivo: { color: c.onPrimary },

    erro: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.danger, backgroundColor: c.dangerSoft },

    kpis: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    kpi: { flexGrow: 1, flexBasis: "45%", backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, gap: 2 },
    kpiValor: { fontSize: 28, fontWeight: "900", color: c.text, marginTop: 6 },
    kpiRotulo: { fontSize: 13, fontWeight: "600", color: c.text },
    kpiDetalhe: { fontSize: 12, color: c.textLight, marginTop: 2 },

    secao: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 },
    secaoTitulo: { fontSize: 16, fontWeight: "bold", color: c.text },
    secaoDescricao: { fontSize: 12, color: c.textLight, marginTop: 4, lineHeight: 17 },
    textoPequeno: { fontSize: 13, color: c.textLight },
    vazio: { fontSize: 13, color: c.textLight, fontStyle: "italic" },

    graficoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 8 },
    gradeLinha: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    barras: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
    colunaToque: { flex: 1, height: "100%", justifyContent: "flex-end", paddingHorizontal: 1 },
    // Ponta superior arredondada (4px), base reta ancorada no eixo
    barra: { borderTopLeftRadius: 4, borderTopRightRadius: 4, minWidth: 2 },
    eixoX: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    eixoTexto: { fontSize: 11, color: c.textLight },
    linhaTabela: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },

    listaTopo: { flexDirection: "row", gap: 10, marginBottom: 6 },
    trilho: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: "hidden" },
    preenchimento: { height: "100%", borderRadius: 4, backgroundColor: c.primary },

    linhaAluno: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  });
