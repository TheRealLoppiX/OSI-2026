import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use a Service Role para salvar no banco
    );

    const groqKey = Deno.env.get('GROQ_API_KEY');
    const baseUrl = "https://ifsertaope.edu.br/salgueiro/";
    const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=pt&u=${encodeURIComponent(baseUrl)}`;

    const response = await fetch(proxyUrl);
    const html = await response.text();
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').substring(0, 7000);

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "system",
          content: "Você é o OSIA. Extraia as 3 notícias mais recentes. O campo 'url' deve ser o link direto da notícia (procure por hrefs no texto se possível ou deduza do contexto). Retorne: [{\"titulo\":\"...\",\"resumo\":\"...\",\"data\":\"...\",\"url\":\"...\"}]"
        }, {
          role: "user", content: cleanText
        }],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const noticias = JSON.parse(aiData.choices[0].message.content).noticias || JSON.parse(aiData.choices[0].message.content);

    // 1. Limpa as notícias antigas (opcional, para manter só as 3 últimas)
    await supabaseClient.from('noticias_ia').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Insere as novas notícias
    const { error: insertError } = await supabaseClient
      .from('noticias_ia')
      .insert(noticias.map((n: any) => ({
        titulo: n.titulo,
        resumo: n.resumo,
        data_noticia: n.data,
        url_original: n.url
      })));

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Notícias atualizadas com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});