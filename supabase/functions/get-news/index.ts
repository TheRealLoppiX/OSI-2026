import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY não configurada.");

    // Busca direta — sem proxy, sem CORS em server-side
    const siteRes = await fetch("https://ifsertaope.edu.br/salgueiro/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OSI-Bot/1.0)" },
    });

    if (!siteRes.ok) throw new Error(`Site retornou ${siteRes.status}`);

    const html = await siteRes.text();

    // Extrai só o texto relevante, sem scripts/styles
    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .substring(0, 8000);

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
            content: `Você é um extrator de notícias. Dado o texto de um site institucional, extraia as 3 notícias mais recentes.
Responda SOMENTE com um JSON válido neste formato exato (sem markdown, sem explicação):
{"noticias":[{"titulo":"...","resumo":"...","data":"...","url":"..."}]}
Se não encontrar data, use "Recente". Se não encontrar URL específica, use "https://ifsertaope.edu.br/salgueiro/".`,
          },
          {
            role: "user",
            content: cleanText,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
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

    if (!Array.isArray(noticias) || noticias.length === 0) {
      throw new Error("IA não retornou notícias no formato esperado.");
    }

    // Limpa e reinsere
    await supabase.from("noticias_ia").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertError } = await supabase.from("noticias_ia").insert(
      noticias.slice(0, 3).map((n: any) => ({
        titulo: n.titulo ?? "Sem título",
        resumo: n.resumo ?? "",
        data_noticia: n.data ?? "Recente",
        url_original: n.url ?? "https://ifsertaope.edu.br/salgueiro/",
      }))
    );

    if (insertError) throw insertError;

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
