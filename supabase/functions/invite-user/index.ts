
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }

    const ADMIN_EMAIL = 'miura.force@gmail.com';
    if (user.email !== ADMIN_EMAIL) {
         return new Response(JSON.stringify({ error: 'Forbidden: Not an admin' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        })
    }

    // Modificación: Recibir redirectTo
    const { email, redirectTo } = await req.json()

    if (!email) {
        throw new Error("Email is required")
    }

    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Usar redirectTo si se proporciona
    const inviteOptions: any = {};
    if (redirectTo) {
        inviteOptions.redirectTo = redirectTo;
    }

    // Intentar invitar
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, inviteOptions)

    if (error) {
        console.log("Invite error:", error.message);
        
        // Manejo especial: Si el usuario ya existe
        if (error.message.includes("already has been registered") || error.status === 422) {
             return new Response(JSON.stringify({ 
                 data: null, 
                 message: "El usuario ya está registrado. Si no ha entrado, se recomienda eliminarlo y volver a invitarlo, o usar recuperación de contraseña.",
                 userExists: true 
             }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, // Retornamos 200 para que el frontend maneje el mensaje
            })
        }
        
        throw error;
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})