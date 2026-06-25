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
    const { email, otp } = await req.json();

    if (!email || !otp) return json({ error: "Dados incompletos." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Busca verificação válida
    const { data: verificacao } = await supabase
      .from("verificacao_email")
      .select("*")
      .eq("email", email)
      .eq("otp", otp)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!verificacao) return json({ error: "Código inválido ou expirado." }, 401);

    const dados = verificacao.dados as any;
    const { nome, usuario, instituicao, senhaCriptografada } = dados;

    if (!nome || !usuario || !instituicao || !senhaCriptografada) {
      return json({ error: "Dados de cadastro corrompidos. Refaça o cadastro." }, 422);
    }

    // Cria usuário no banco (sem role — o app gerencia isso em memória)
    const { data: newUser, error: insertError } = await supabase
      .from("usuarios")
      .insert({
        nome,
        usuario,
        email,
        instituicao,
        senha: senhaCriptografada,
        pontuacao: 0,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") return json({ error: "Usuário ou e-mail já cadastrado." }, 409);
      return json({ error: `Erro ao criar conta: ${insertError.message}` }, 500);
    }

    // Remove registro de verificação
    await supabase.from("verificacao_email").delete().eq("id", verificacao.id);

    // Inclui role no retorno (gerenciado pelo app, não pelo banco)
    return json({ user: { ...newUser, role: "aluno" } });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
