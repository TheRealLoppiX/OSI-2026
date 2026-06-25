import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Busca RSS do Google News e retorna os itens como texto simples
async function fetchGoogleNewsRSS(query: string): Promise<string> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OSI-Bot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google News retornou ${res.status}`);
  const xml = await res.text();

  // Extrai itens do RSS (título + descrição + link + data)
  const items: string[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const item = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item))?.[1] ?? "";
    const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) || /<description>(.*?)<\/description>/.exec(item))?.[1]?.replace(/<[^>]+>/g, " ") ?? "";
    const link = /<link>(.*?)<\/link>/.exec(item)?.[1] ?? "";
    const pubDate = /<pubDate>(.*?)<\/pubDate>/.exec(item)?.[1] ?? "";
    items.push(`TÍTULO: ${title}\nDATA: ${pubDate}\nLINK: ${link}\nDESCRIÇÃO: ${desc}`);
  }

  if (items.length === 0) throw new Error("Nenhuma notícia encontrada no RSS.");
  return items.join("\n\n---\n\n");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY não configurada.");

    // Busca notícias em duas queries para cobrir melhor os temas
    const queries = [
      "IF Sertão Salgueiro informática OR OSI OR cibersegurança",
      "IFSertão PE tecnologia informação programação",
    ];

    let newsText = "";
    for (const q of queries) {
      try {
        const result = await fetchGoogleNewsRSS(q);
        newsText += result + "\n\n===\n\n";
        break; // usa a primeira que funcionar
      } catch {
        continue;
      }
    }

    if (!newsText) throw new Error("Não foi possível buscar notícias.");

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Você é um curador de notícias para o app da OSI 2026 (Olimpíada Salgueirense de Informática) do IF Sertão-PE campus Salgueiro.

Analise as notícias abaixo e selecione as 3 mais relevantes para alunos de informática. Priorize notícias sobre:
1. OSI (Olimpíada Salgueirense de Informática)
2. IF Sertão-PE Salgueiro — eventos de informática, TI, tecnologia
3. Cibersegurança, programação, redes, hardware
4. Competições, premiações ou conquistas da área de TI

Para cada notícia selecionada, escreva um resumo em PORTUGUÊS de 1-2 frases que explique o que aconteceu e por que é relevante para alunos de informática.

Responda SOMENTE com JSON válido (sem markdown):
{"noticias":[{"titulo":"...","resumo":"...","data":"DD/MM/AAAA","url":"..."}]}

Se não houver nenhuma notícia relevante, retorne {"noticias":[]}.`,
          },
          {
            role: "user",
            content: newsText,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
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
    const noticias: any[] = parsed.noticias ?? parsed;

    if (!Array.isArray(noticias)) throw new Error("IA não retornou array de notícias.");

    if (noticias.length > 0) {
      await supabase.from("noticias_ia").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error: insertError } = await supabase.from("noticias_ia").insert(
        noticias.slice(0, 3).map((n: any) => ({
          titulo: n.titulo ?? "Sem título",
          resumo: n.resumo ?? "",
          data_noticia: n.data ?? "Recente",
          url_original: n.url ?? "https://news.google.com",
        }))
      );

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ message: "Notícias atualizadas!", total: noticias.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
