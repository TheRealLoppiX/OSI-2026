import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Colunas esperadas na planilha (linha 1 = cabeçalho, ignorada):
// A: enunciado | B: opcao_a | C: opcao_b | D: opcao_c | E: opcao_d | F: opcao_e
// G: resposta_correta | H: justificativa | I: materia | J: dificuldade | K: referencias

function extrairSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { url, apenasPreview } = await req.json();

    if (!url) return json({ error: "URL da planilha não informada." }, 400);

    const sheetId = extrairSheetId(url);
    if (!sheetId) return json({ error: "URL inválida. Cole o link completo da planilha do Google." }, 400);

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) return json({ error: "GOOGLE_API_KEY não configurada no servidor." }, 500);

    // Busca a partir da linha 2 (pula cabeçalho)
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A2:K500?key=${apiKey}`;
    const sheetsRes = await fetch(sheetsUrl);
    const sheetsData = await sheetsRes.json();

    if (sheetsData.error) {
      const msg = sheetsData.error.message || "Erro ao acessar a planilha.";
      if (msg.includes("API key")) return json({ error: "Chave da API do Google inválida ou sem permissão para Sheets API." }, 403);
      if (msg.includes("not found") || msg.includes("permission")) return json({ error: "Planilha não encontrada ou não está pública. Habilite 'Qualquer pessoa com o link pode ver'." }, 404);
      return json({ error: msg }, 400);
    }

    const rows: string[][] = sheetsData.values || [];

    const questoes = rows
      .filter((row) => row[0]?.trim()) // ignora linhas sem enunciado
      .map((row) => ({
        enunciado: row[0]?.trim(),
        opcao_a: row[1]?.trim() || null,
        opcao_b: row[2]?.trim() || null,
        opcao_c: row[3]?.trim() || null,
        opcao_d: row[4]?.trim() || null,
        opcao_e: row[5]?.trim() || null,
        resposta_correta: (row[6]?.trim().toUpperCase() || "A").charAt(0),
        justificativa: row[7]?.trim() || null,
        materia: row[8]?.trim() || null,
        dificuldade: row[9]?.trim() || "Média",
        referencias: row[10]?.trim() || null,
      }));

    if (questoes.length === 0) {
      return json({ error: "Nenhuma questão encontrada. Verifique se a planilha segue o modelo." }, 400);
    }

    // Modo preview: só retorna o que seria importado, sem salvar
    if (apenasPreview) {
      return json({ questoes, total: questoes.length });
    }

    // Importa de verdade
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase
      .from("questoes")
      .insert(questoes)
      .select("id");

    if (error) return json({ error: `Erro ao salvar: ${error.message}` }, 500);

    return json({ importadas: data?.length ?? questoes.length, total: questoes.length });

  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
