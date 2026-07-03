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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // A tabela notificacoes é broadcast (sem dono por usuário), então o
    // flag "lida" é global. RLS bloqueia UPDATE pela anon key, por isso
    // essa escrita precisa passar pela service role aqui.
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("lida", false);

    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
