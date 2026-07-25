import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { usuario_id } = await req.json();
    if (!usuario_id) return json({ error: "usuario_id é obrigatório." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Leitura é por usuário (tabela notificacao_leituras), não mais um flag
    // global em notificacoes — antes, o primeiro aluno a abrir "Avisos"
    // marcava a notificação como lida para todo mundo. RLS bloqueia escrita
    // direta pela anon key, por isso passa pela service role aqui.
    const { data: notificacoes, error: errNotificacoes } = await supabase
      .from("notificacoes")
      .select("id");

    if (errNotificacoes) {
      console.error(errNotificacoes);
      return json({ error: "Erro interno. Tente novamente mais tarde." }, 500);
    }

    if (notificacoes && notificacoes.length > 0) {
      const linhas = notificacoes.map((n: any) => ({ usuario_id, notificacao_id: n.id }));
      const { error } = await supabase
        .from("notificacao_leituras")
        .upsert(linhas, { onConflict: "usuario_id,notificacao_id", ignoreDuplicates: true });

      if (error) {
        console.error(error);
        return json({ error: "Erro interno. Tente novamente mais tarde." }, 500);
      }
    }

    return json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return json({ error: "Erro interno. Tente novamente mais tarde." }, 500);
  }
});
