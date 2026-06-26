import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Colunas esperadas (linha 1 = cabeçalho, ignorada):
// A: enunciado | B: opcao_a | C: opcao_b | D: opcao_c | E: opcao_d | F: opcao_e
// G: resposta_correta | H: justificativa | I: materia | J: dificuldade | K: referencias | L: imagem_url

function normalizarDificuldade(valor: string): string {
  const v = valor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (v === "facil" || v === "easy" || v === "baixa") return "Fácil";
  if (v === "dificil" || v === "hard" || v === "alta") return "Difícil";
  return "Média";
}

function extrairSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function processarLinhas(rows: any[][]): object[] {
  return rows
    .filter((row) => row[0]?.toString().trim())
    .map((row) => ({
      enunciado: row[0]?.toString().trim(),
      opcao_a: row[1]?.toString().trim() || null,
      opcao_b: row[2]?.toString().trim() || null,
      opcao_c: row[3]?.toString().trim() || null,
      opcao_d: row[4]?.toString().trim() || null,
      opcao_e: row[5]?.toString().trim() || null,
      resposta_correta: (row[6]?.toString().trim().toUpperCase() || "A").charAt(0),
      justificativa: row[7]?.toString().trim() || null,
      materia: row[8]?.toString().trim() || null,
      dificuldade: normalizarDificuldade(row[9]?.toString().trim() || ""),
      referencias: row[10]?.toString().trim() || null,
      imagem_url: row[11]?.toString().trim() || null,
    }));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { url, base64, apenasPreview } = await req.json();

    let questoes: object[] = [];

    if (base64) {
      // Decodifica base64 e parseia o xlsx com SheetJS
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return json({ error: "Arquivo xlsx vazio ou inválido." }, 400);
      const worksheet = workbook.Sheets[sheetName];
      // range: 1 pula a linha de cabeçalho (índice 0)
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 }) as any[][];
      questoes = processarLinhas(rows);
    } else if (url) {
      const sheetId = extrairSheetId(url);
      if (!sheetId) return json({ error: "URL inválida. Cole o link completo da planilha do Google." }, 400);

      const apiKey = Deno.env.get("GOOGLE_API_KEY");
      if (!apiKey) return json({ error: "GOOGLE_API_KEY não configurada no servidor." }, 500);

      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A2:L500?key=${apiKey}`;
      const sheetsRes = await fetch(sheetsUrl);
      const sheetsData = await sheetsRes.json();

      if (sheetsData.error) {
        const msg = sheetsData.error.message || "Erro ao acessar a planilha.";
        if (msg.includes("API key")) return json({ error: "Chave da API do Google inválida ou sem permissão para Sheets API." }, 403);
        if (msg.includes("not found") || msg.includes("permission")) return json({ error: "Planilha não encontrada ou não está pública. Habilite 'Qualquer pessoa com o link pode ver'." }, 404);
        return json({ error: msg }, 400);
      }

      const rows: string[][] = sheetsData.values || [];
      questoes = processarLinhas(rows);
    } else {
      return json({ error: "Informe a URL da planilha ou envie um arquivo .xlsx." }, 400);
    }

    if (questoes.length === 0) {
      return json({ error: "Nenhuma questão encontrada. Verifique se a planilha segue o modelo." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Variáveis de ambiente do Supabase não configuradas." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verifica duplicatas pelo enunciado para preview e importação
    const enunciados = questoes.map((q: any) => q.enunciado);
    const { data: existentes } = await supabase
      .from("questoes")
      .select("enunciado")
      .in("enunciado", enunciados);

    const enunciadosExistentes = new Set((existentes || []).map((e: any) => e.enunciado));
    const questoesComFlag = (questoes as any[]).map((q) => ({
      ...q,
      duplicata: enunciadosExistentes.has(q.enunciado),
    }));

    if (apenasPreview) {
      return json({ questoes: questoesComFlag, total: questoesComFlag.length });
    }

    const questoesNovas = questoesComFlag
      .filter((q) => !q.duplicata)
      .map(({ duplicata, ...q }) => q); // remove o campo auxiliar antes do insert

    const puladas = questoesComFlag.length - questoesNovas.length;

    if (questoesNovas.length === 0) {
      return json({ importadas: 0, puladas, total: questoesComFlag.length, aviso: "Todas as questões já existem no banco." });
    }

    const { data, error } = await supabase
      .from("questoes")
      .insert(questoesNovas)
      .select("id");

    if (error) {
      console.error("Erro no insert:", JSON.stringify(error));
      return json({ error: `Erro ao salvar: ${error.message}` }, 500);
    }

    return json({ importadas: data?.length ?? questoesNovas.length, puladas, total: questoesComFlag.length });

  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
