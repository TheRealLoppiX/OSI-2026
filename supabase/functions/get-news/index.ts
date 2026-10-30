import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NewsItem = { title: string; link: string; date: Date };

// O Google News ordena por relevância, não por data: sem o operador when:Nd
// a busca devolvia matérias de 2025 na frente das atuais.
const QUERIES = [
  '"Olimpíada Salgueirense de Informática" when:90d',
  "IFSertãoPE Salgueiro when:30d",
  '"IF Sertão" OR IFSertãoPE tecnologia OR informática OR ciência when:30d',
  'Salgueiro Pernambuco estudantes OR "inteligência artificial" OR tecnologia OR robótica when:30d',
];
// Cota por query: sem ela, a query ampla do IFSertãoPE (100 itens, quase
// todos de outros campi) empurrava as de OSI/Salgueiro para fora da lista.
// O total fica ~2k tokens, abaixo do limite de 7k tokens/min da Groq.
const MAX_ITENS_POR_QUERY = 8;

// Busca RSS do Google News e retorna os itens estruturados
async function fetchGoogleNewsRSS(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OSI-Bot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google News retornou ${res.status}`);
  const xml = await res.text();

  // Extrai itens do RSS (título + link + data)
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item))?.[1] ?? "";
    const link = /<link>(.*?)<\/link>/.exec(item)?.[1] ?? "";
    const date = new Date(/<pubDate>(.*?)<\/pubDate>/.exec(item)?.[1] ?? "");
    if (title && link && !isNaN(date.getTime())) items.push({ title, link, date });
  }
  return items;
}

const formatarData = (d: Date) =>
  d.toLocaleDateString("pt-BR", { timeZone: "America/Recife" });

// Roda todas as queries, remove duplicadas (mesmo título em veículos
// diferentes) e devolve as mais recentes primeiro
async function buscarNoticias(): Promise<NewsItem[]> {
  const resultados = await Promise.allSettled(QUERIES.map(fetchGoogleNewsRSS));
  const vistos = new Set<string>();
  const todas: NewsItem[] = [];
  for (const r of resultados) {
    if (r.status !== "fulfilled") continue;
    let usados = 0;
    const recentes = r.value.sort((a, b) => b.date.getTime() - a.date.getTime());
    for (const n of recentes) {
      if (usados >= MAX_ITENS_POR_QUERY) break;
      // O Google anexa " - Veículo" ao título; normaliza antes de comparar
      const chave = n.title.replace(/\s+-\s+[^-]+$/, "").toLowerCase().trim();
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      todas.push(n);
      usados++;
    }
  }
  return todas.sort((a, b) => b.date.getTime() - a.date.getTime());
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Endpoint público (verify_jwt=false, proposital: quem chama é o pg_cron do
    // banco, que não manda JWT). Sem isso, qualquer pessoa podia acionar essa
    // function repetidamente e consumir a cota paga da API da Groq à toa.
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY não configurada.");

    const itens = await buscarNoticias();
    if (itens.length === 0) throw new Error("Não foi possível buscar notícias.");

    // Só id + data + título vão para a IA: a descrição do Google News é HTML
    // com o próprio título repetido e o link tem ~300 caracteres, o que
    // estourava o limite de tokens por minuto da Groq. Link e data são
    // preenchidos depois a partir do item original.
    const newsText = itens
      .map((n, i) => `[${i}] ${formatarData(n.date)} — ${n.title}`)
      .join("\n");
    const hoje = formatarData(new Date());

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "system",
            content: `Você é um curador de notícias para o app da OSI 2026 (Olimpíada Salgueirense de Informática) do IF Sertão-PE campus Salgueiro.

Hoje é ${hoje}. As notícias abaixo estão ordenadas da mais recente para a mais antiga. Selecione as 3 mais interessantes para os estudantes do campus, dando preferência às mais recentes. Priorize, nesta ordem:
1. OSI (Olimpíada Salgueirense de Informática)
2. IF Sertão-PE campus Salgueiro: eventos, inscrições, processos seletivos, conquistas de alunos
3. Tecnologia, informática, ciência e inovação no IF Sertão-PE ou em Salgueiro
4. Demais notícias do IF Sertão-PE que interessem a estudantes

Ignore política, eleições, polícia, esporte, vagas de emprego e notícias que não envolvam educação ou tecnologia. Evite notícias puramente administrativas (remoção de servidores, seleção de professor) se houver opções melhores. Não repita o mesmo assunto em duas notícias.

Para cada notícia selecionada, escreva um resumo em PORTUGUÊS de 1-2 frases que explique o que aconteceu e por que importa para os alunos. No título, remova o nome do veículo que vem depois do último " - ".

Responda SOMENTE com JSON válido (sem markdown), onde "id" é o número entre colchetes:
{"noticias":[{"id":0,"titulo":"...","resumo":"..."}]}

Se não houver nenhuma notícia relevante, retorne {"noticias":[]}.`,
          },
          {
            role: "user",
            content: newsText,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        // Sem max_tokens a Groq reserva a saída estimada (~1k) e o plano
        // gratuito recusa com 429 (limite de 1000 tokens de saída/min).
        // 3 resumos de 1-2 frases cabem com folga.
        max_tokens: 600,
        // Qwen 3.8 é um modelo híbrido de raciocínio; sem isso ele pode emitir
        // texto de "pensamento" antes do JSON e quebrar o parse abaixo.
        reasoning_effort: "none",
        reasoning_format: "hidden",
      }),
    });

    if (!aiRes.ok) {
      const aiErr = await aiRes.text();
      throw new Error(`Groq API erro ${aiRes.status}: ${aiErr}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Resposta vazia da IA.");

    const parsed = JSON.parse(raw);
    const selecionadas: any[] = parsed.noticias ?? parsed;

    if (!Array.isArray(selecionadas)) throw new Error("IA não retornou array de notícias.");

    // Descarta ids inventados pela IA (fora da lista ou repetidos)
    const ids = new Set<number>();
    const noticias = selecionadas.filter((n) =>
      Number.isInteger(n?.id) && itens[n.id] && !ids.has(n.id) && ids.add(n.id)
    );

    if (noticias.length > 0) {
      await supabase.from("noticias_ia").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error: insertError } = await supabase.from("noticias_ia").insert(
        noticias.slice(0, 3).map((n: any) => ({
          titulo: n.titulo || itens[n.id].title,
          resumo: n.resumo ?? "",
          data_noticia: formatarData(itens[n.id].date),
          url_original: itens[n.id].link,
        }))
      );

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ message: "Notícias atualizadas!", total: noticias.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente mais tarde." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
