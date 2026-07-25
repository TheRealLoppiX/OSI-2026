import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    // Dois chamadores legítimos: (1) o Database Webhook "enviar_notificacao_push"
    // (trigger AFTER INSERT em public.notificacoes), que manda a service role key
    // no Authorization — esse é confiável por definição, a key nunca sai do banco;
    // (2) uma futura chamada direta do app admin, autenticada por x-docente-id.
    // Sem uma das duas, qualquer pessoa com a anon key (pública) poderia fazer
    // spam/phishing em massa para todos os alunos.
    const authHeader = req.headers.get('authorization') ?? ''
    const chamadaDoWebhook = !!supabaseKey && authHeader === `Bearer ${supabaseKey}`

    if (!chamadaDoWebhook) {
      const docenteId = req.headers.get('x-docente-id')
      if (!docenteId) {
        return new Response(JSON.stringify({ error: "Não autorizado." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const resDocente = await fetch(
        `${supabaseUrl}/rest/v1/docentes?select=id&id=eq.${encodeURIComponent(docenteId)}`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      const docentes = await resDocente.json()
      if (!Array.isArray(docentes) || docentes.length === 0) {
        return new Response(JSON.stringify({ error: "Não autorizado." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
    }

    const { titulo, mensagem } = await req.json()

    // Range explícito: o PostgREST limita a 1000 linhas por padrão, o que
    // faria usuários além do limite não receberem push silenciosamente.
    const resTokens = await fetch(`${supabaseUrl}/rest/v1/usuarios?select=push_token`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Range': '0-9999',
      }
    })

    const usuarios = await resTokens.json()
    const tokens = usuarios
      .map((u: any) => u.push_token)
      .filter((t: string) => t && t.startsWith('ExponentPushToken'))

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token encontrado" }), { status: 200 })
    }

    // A API do Expo Push recomenda lotes de até 100 destinatários por request.
    const CHUNK_SIZE = 100
    const chunks: string[][] = []
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      chunks.push(tokens.slice(i, i + CHUNK_SIZE))
    }

    const results = await Promise.all(
      chunks.map((chunk) =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            to: chunk,
            title: titulo,
            body: mensagem,
            data: { screen: 'notificacoes' },
            sound: 'default',
          }),
        }).then((r) => r.json())
      )
    )

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente mais tarde." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})