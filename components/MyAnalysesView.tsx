
/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '../store/appStore';
import { Session, AppView } from '../types';
import Loader from './common/Loader';
import { supabase } from '../services/supabaseClient';

interface MyAnalysesViewProps {
    setCurrentView: (view: AppView) => void;
}

const MyAnalysesView: React.FC<MyAnalysesViewProps> = ({ setCurrentView }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { setSession, clearSession } = useSessionStore();

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            setSessions(data as Session[]);
        } catch (err: any) {
            console.error("Error loading sessions from Supabase", err);
            if (err.code === 'PGRST205') {
                 setError("Error de base de datos: La tabla 'sessions' no se encontró. Por favor, asegúrate de haber ejecutado el script 'supabase/schema.sql' en el editor de SQL de tu proyecto de Supabase.");
            } else {
                setError("No se pudieron cargar las sesiones desde la nube.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleContinue = (session: Session) => {
        setSession(session);
        setCurrentView('analyzer');
    };
    
    const handleNewSession = () => {
        clearSession();
        setCurrentView('analyzer');
    }
    
    const handleDelete = async (sessionId: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta sesión de la nube? Esta acción no se puede deshacer.")) {
            return;
        }

        // Optimistic UI Update: Remove item immediately from list to feel responsive
        const previousSessions = [...sessions];
        setSessions(sessions.filter(s => s.id !== sessionId));

        try {
            const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', sessionId);

            if (error) {
                throw error;
            }
            // If successful, we don't need to do anything as UI is already updated
        } catch (error: any) {
            console.error("Error deleting session:", error);
            alert(`No se pudo eliminar la sesión. Detalle: ${error.message}`);
            // Revert UI on error
            setSessions(previousSessions);
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Mis Análisis en la Nube</h2>
                <p className="text-slate-400 mt-2">Continúa trabajando en una sesión anterior o empieza una nueva.</p>
            </div>
            
            <div className="text-center">
                 <button 
                    onClick={handleNewSession}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-purple-500/30 transition-all transform hover:-translate-y-1"
                >
                    + Empezar Nueva Sesión
                </button>
            </div>

            <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl shadow-2xl space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader message="Cargando sesiones..." />
                    </div>
                ) : error ? (
                     <p className="text-center text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-md">{error}</p>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-3">📂</div>
                        <p className="text-slate-400">No tienes ninguna sesión guardada.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {sessions.map((session) => (
                            <li key={session.id} className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/30 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 group">
                                <div className="flex-grow">
                                    <h3 className="font-semibold text-slate-100 group-hover:text-purple-400 transition-colors text-lg">{session.title || "Sesión sin título"}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                        <span>📅 {session.created_at ? new Date(session.created_at).toLocaleDateString() : "Desconocida"}</span>
                                        <span>•</span>
                                        <span className="font-mono text-slate-600 uppercase text-[10px]">ID: {session.id.slice(0,8)}</span>
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleContinue(session)}
                                        className="bg-slate-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto text-sm border border-slate-600 hover:border-green-500"
                                    >
                                        Continuar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="bg-slate-800 text-slate-400 hover:bg-red-900/80 hover:text-white font-bold py-2 px-3 rounded-lg transition-colors w-full sm:w-auto text-sm border border-slate-700 hover:border-red-500/50"
                                        title="Eliminar sesión"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MyAnalysesView;