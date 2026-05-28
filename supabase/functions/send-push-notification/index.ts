import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { titulo, mensagem } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    const resTokens = await fetch(`${supabaseUrl}/rest/v1/usuarios?select=push_token`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    const usuarios = await resTokens.json()
    const tokens = usuarios
      .map((u: any) => u.push_token)
      .filter((t: string) => t && t.startsWith('ExponentPushToken'))

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token encontrado" }), { status: 200 })
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: tokens,
        title: titulo,
        body: mensagem,
        data: { screen: 'notificacoes' },
        sound: 'default',
      }),
    })

    const result = await expoResponse.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})