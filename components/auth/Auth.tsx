import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../services/supabaseClient';
import App from '../../App';
import LoginView from './LoginView';
import { Session } from '@supabase/supabase-js';
import Loader from '../common/Loader';

const Auth: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader message="Iniciando ViralZIA..." />
            </div>
        );
    }

    if (!session) {
        return <LoginView />;
    } else {
        return <App session={session} />;
    }
};

export default Auth;