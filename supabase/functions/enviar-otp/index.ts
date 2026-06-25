import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, nome, usuario, instituicao, senhaCriptografada } = await req.json();

    if (!email || !nome || !usuario || !instituicao || !senhaCriptografada) {
      return new Response(JSON.stringify({ error: "Dados incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verifica se e-mail ou usuário já existem
    const { data: existeEmail } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existeEmail) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existeUsuario } = await supabase
      .from("usuarios")
      .select("id")
      .ilike("usuario", usuario)
      .maybeSingle();

    if (existeUsuario) {
      return new Response(JSON.stringify({ error: "Este nome de usuário já está em uso." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera OTP de 6 dígitos com crypto seguro
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const otp = (100000 + (arr[0] % 900000)).toString();

    // Remove verificações pendentes antigas para este e-mail
    await supabase.from("verificacao_email").delete().eq("email", email);

    // Salva verificação (expira em 15 min)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from("verificacao_email").insert({
      email,
      otp,
      dados: { nome, usuario, instituicao, senhaCriptografada },
      expires_at,
    });

    // Envia e-mail via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    await resend.emails.send({
      from: "OSI 2026 <onboarding@resend.dev>",
      to: email,
      subject: `${otp} é o seu código de verificação · OSI 2026`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0A1628;font-family:sans-serif;">
          <div style="max-width:480px;margin:40px auto;padding:40px 30px;background:#0F172A;border-radius:20px;border:1px solid #1E293B;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#3B82F6;font-size:32px;margin:0;font-weight:900;letter-spacing:-1px;">OSI 2026</h1>
              <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Olimpíada Salgueirense de Informática</p>
            </div>
            <p style="color:#CBD5E1;font-size:16px;margin:0 0 8px;">Olá, <strong style="color:#fff;">${nome}</strong>!</p>
            <p style="color:#94A3B8;font-size:14px;margin:0 0 28px;">Use o código abaixo para confirmar seu cadastro. Ele expira em <strong style="color:#fff;">15 minutos</strong>.</p>
            <div style="background:#1E293B;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;border:1px solid #334155;">
              <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#60A5FA;font-variant-numeric:tabular-nums;">${otp}</span>
            </div>
            <p style="color:#475569;font-size:12px;text-align:center;margin:0;">Se você não solicitou este cadastro, ignore este e-mail.</p>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
