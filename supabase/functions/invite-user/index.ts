
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    if (!user || !user.email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }

    const ADMIN_EMAIL = 'miura.force@gmail.com';
    // FIX: Case insensitive comparison to avoid 403 errors if user logs in with mixed case
    if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
         return new Response(JSON.stringify({ error: 'Forbidden: Not an admin' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        })
    }

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

    // Invite options
    const inviteOptions: any = {};
    if (redirectTo) {
        inviteOptions.redirectTo = redirectTo;
    }

    // Attempt to invite user
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, inviteOptions)

    if (error) {
        console.log("Invite error:", error.message);
        
        // Handle case where user is already registered
        // Return 200 with a specific flag so frontend can handle it gracefully instead of crashing
        if (error.message.includes("already has been registered") || error.status === 422) {
             return new Response(JSON.stringify({ 
                 data: null, 
                 message: "El usuario ya está registrado. Intenta usar la recuperación de contraseña.",
                 userExists: true 
             }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }
        
        throw error;
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
