import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Proxy server-side para a API da Groq. Existe para tirar a chave da Groq do
// bundle do cliente (EXPO_PUBLIC_GROQ_API_KEY hoje é extraível via engenharia
// reversa do APK) — a chave real fica só aqui, como secret do projeto.
//
// Preparada, ainda NÃO conectada ao app: falta rodar
//   supabase secrets set GROQ_API_KEY=<chave> --project-ref yvdnsygxztmgmkaqrpxq
//   supabase functions deploy groq-proxy
// e trocar chamarGroq() em src/services/aiService.ts para chamar esta function
// via supabase.functions.invoke("groq-proxy", { body: { mensagens, maxTokens, jsonMode } })
// em vez do fetch direto à Groq.
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

    const body: any = {
      model: "llama-3.3-70b-versatile",
      messages: mensagens,
      max_tokens: maxTokens ?? 800,
      temperature: jsonMode ? 0.2 : 0.7,
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await groqRes.json();
    if (data.error) {
      console.error(data.error);
      return json({ error: "Erro ao consultar a IA. Tente novamente mais tarde." }, 502);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return json({ error: "Resposta vazia da IA." }, 502);

    return json({ content });
  } catch (err: unknown) {
    console.error(err);
    return json({ error: "Erro interno. Tente novamente mais tarde." }, 500);
  }
});
