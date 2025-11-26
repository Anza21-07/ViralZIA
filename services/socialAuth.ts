import { supabase } from './supabaseClient';
import { OAuthTokenResponse } from '../types';

/**
 * Genera la URL de autorización para el flujo OAuth 2.0.
 * Utiliza los endpoints estándar de cada plataforma.
 */
export const getAuthUrl = (platform: string, clientId: string, redirectUri: string): string => {
    const state = encodeURIComponent(platform); // Usamos el estado para saber qué plataforma está volviendo
    const redirect = encodeURIComponent(redirectUri);

    switch (platform) {
        case 'TikTok':
            // Docs: https://developers.tiktok.com/doc/login-kit-web/
            return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientId}&response_type=code&scope=user.info.basic,video.upload&redirect_uri=${redirect}&state=${state}`;
        
        case 'Instagram':
            // Docs: https://developers.facebook.com/docs/instagram-basic-display-api/getting-started
            return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&scope=user_profile,user_media&response_type=code&state=${state}`;
        
        case 'YouTube':
            // Docs: https://developers.google.com/youtube/v3/guides/auth/client-side-web-apps
            return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&state=${state}&access_type=offline&prompt=consent`;
            
        default:
            throw new Error(`Plataforma ${platform} no soportada.`);
    }
};

/**
 * Intercambia el código de autorización por un token de acceso.
 * Utiliza una Supabase Edge Function ('exchange-token') para realizar la petición HTTP
 * desde el servidor y evitar problemas de CORS que ocurren al llamar a estas APIs desde el navegador.
 */
export const exchangeCodeForToken = async (
    platform: string, 
    code: string, 
    clientId: string, 
    clientSecret: string, 
    redirectUri: string
): Promise<OAuthTokenResponse> => {
    
    const { data, error } = await supabase.functions.invoke('exchange-token', {
        body: {
            platform,
            code,
            clientId,
            clientSecret,
            redirectUri
        }
    });

    if (error) {
        console.error("Edge Function Error:", error);
        throw new Error(error.message || "Error conectando con el servidor de autenticación (Edge Function).");
    }
    
    if (data.error) {
        throw new Error(data.error);
    }

    return data as OAuthTokenResponse;
};