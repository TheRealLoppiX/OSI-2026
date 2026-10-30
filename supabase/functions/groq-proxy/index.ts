import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Proxy server-side para a API da Groq. Existe para tirar a chave da Groq do
// bundle do cliente (EXPO_PUBLIC_GROQ_API_KEY hoje é extraível via engenharia
// reversa do APK) — a chave real fica só aqui, como secret do projeto.
// Chamada pelo app via supabase.functions.invoke("groq-proxy") em
// src/services/aiService.ts (chamarGroq).

// No plano gratuito da Groq o limite de tokens/minuto é POR MODELO (8k cada),
// então encadear modelos multiplica a capacidade sem custo. Também protege
// contra o modelo ser descontinuado (o qwen3.6 sumiu em set/2026 e derrubou a IA).
type Modelo = { id: string; extra: Record<string, unknown>; folgaRaciocinio: number };

const QWEN: Modelo = {
  id: "qwen/qwen3.8-27b",
  // Qwen 3.8 é um modelo híbrido de raciocínio; sem isso ele pode emitir
  // texto de "pensamento" junto da resposta, quebrando o JSON.parse() no
  // cliente (gerarQuestoesIA) e poluindo respostas de texto simples.
  extra: { reasoning_effort: "none", reasoning_format: "hidden" },
  folgaRaciocinio: 0,
};
// gpt-oss não desliga o raciocínio, só reduz; os tokens de raciocínio contam
// no max_tokens, daí a folga para não truncar a resposta
const GPT_OSS_120B: Modelo = {
  id: "openai/gpt-oss-120b",
  extra: { reasoning_effort: "low", include_reasoning: false },
  folgaRaciocinio: 512,
};
const GPT_OSS_20B: Modelo = { ...GPT_OSS_120B, id: "openai/gpt-oss-20b" };

// Para JSON o gpt-oss-120b vai primeiro: em teste com 10 questões ele entregou
// as 10 em ~1.5k tokens, enquanto o Qwen estourou 2k tokens com só 3.
const CADEIA_TEXTO = [QWEN, GPT_OSS_120B, GPT_OSS_20B];
const CADEIA_JSON = [GPT_OSS_120B, QWEN, GPT_OSS_20B];

const MAX_TOKENS_TETO = 4000;
const ESPERA_MAX_RETRY_S = 8;

type Resultado =
  | { ok: true; content: string }
  | { ok: false; limite: boolean; retryAfter?: number };

async function chamarModelo(
  modelo: Modelo,
  groqKey: string,
  mensagens: unknown[],
  maxTokens: number,
  jsonMode: boolean,
): Promise<Resultado> {
  const body: any = {
    model: modelo.id,
    messages: mensagens,
    max_tokens: maxTokens + modelo.folgaRaciocinio,
    temperature: jsonMode ? 0.2 : 0.7,
    ...modelo.extra,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  const data = await groqRes.json().catch(() => ({}));
  if (!groqRes.ok || data.error) {
    console.error(modelo.id, groqRes.status, data.error?.message ?? data.error);
    const retryAfter = Number(groqRes.headers.get("retry-after"));
    return {
      ok: false,
      limite: groqRes.status === 429,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    };
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return { ok: false, limite: false };

  // JSON truncado (finish_reason=length) ou malformado: melhor tentar outro
  // modelo do que devolver algo que vai quebrar o JSON.parse() no cliente
  if (jsonMode) {
    try {
      JSON.parse(content);
    } catch {
      console.error(modelo.id, "JSON inválido, finish_reason:", data.choices?.[0]?.finish_reason);
      return { ok: false, limite: false };
    }
  }
  return { ok: true, content };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return json({ error: "GROQ_API_KEY não configurada no servidor." }, 500);

    const { mensagens, maxTokens, jsonMode } = await req.json();

    if (!Array.isArray(mensagens) || mensagens.length === 0) {
      return json({ error: "Parâmetro 'mensagens' inválido." }, 400);
    }

    const tokens = Math.min(Math.max(1, Number(maxTokens) || 800), MAX_TOKENS_TETO);
    const cadeia = jsonMode ? CADEIA_JSON : CADEIA_TEXTO;

    let todosNoLimite = true;
    let menorEspera = Infinity;
    for (const modelo of cadeia) {
      const r = await chamarModelo(modelo, groqKey, mensagens, tokens, !!jsonMode);
      if (r.ok) return json({ content: r.content });
      if (!r.limite) todosNoLimite = false;
      if (r.retryAfter) menorEspera = Math.min(menorEspera, r.retryAfter);
    }

    // Todos os modelos estouraram a cota do minuto: se a janela libera logo,
    // espera e tenta mais uma vez o primeiro antes de devolver erro ao aluno
    if (todosNoLimite && menorEspera <= ESPERA_MAX_RETRY_S) {
      await new Promise((ok) => setTimeout(ok, menorEspera * 1000));
      const r = await chamarModelo(cadeia[0], groqKey, mensagens, tokens, !!jsonMode);
      if (r.ok) return json({ content: r.content });
    }

    if (todosNoLimite) {
      return json({ error: "A IA está com muitos pedidos agora. Tente de novo em um minuto." }, 429);
    }
    return json({ error: "Erro ao consultar a IA. Tente novamente mais tarde." }, 502);
  } catch (err: unknown) {
    console.error(err);
    return json({ error: "Erro interno. Tente novamente mais tarde." }, 500);
  }
});
