import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { platform, code, clientId, clientSecret, redirectUri } = await req.json()

    let url = '';
    let options: RequestInit = { method: 'POST' };
    const headers = new Headers();

    switch (platform) {
        case 'TikTok':
            url = 'https://open.tiktokapis.com/v2/oauth/token/';
            headers.append('Content-Type', 'application/x-www-form-urlencoded');
            options.body = new URLSearchParams({
                client_key: clientId,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            });
            break;

        case 'Instagram':
            url = 'https://api.instagram.com/oauth/access_token';
            // Instagram y Facebook Graph API a veces requieren FormData
            const formData = new FormData();
            formData.append('client_id', clientId);
            formData.append('client_secret', clientSecret);
            formData.append('grant_type', 'authorization_code');
            formData.append('redirect_uri', redirectUri);
            formData.append('code', code);
            options.body = formData;
            break;

        case 'YouTube':
            url = 'https://oauth2.googleapis.com/token';
            headers.append('Content-Type', 'application/json');
            options.body = JSON.stringify({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            });
            break;

        default:
            throw new Error(`Platform ${platform} not supported`);
    }

    if (platform !== 'Instagram') {
        options.headers = headers;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        console.error('Provider Error:', data);
        throw new Error(data.error_description || data.error || 'Failed to exchange token');
    }

    return new Response(JSON.stringify(data), {
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