
import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import VideoAnalyzerView from './components/VideoAnalyzerView';
import CreativeSuiteView from './components/CreativeSuiteView';
import MyAnalysesView from './components/MyAnalysesView';
import TrendsView from './components/TrendsView';
import BrandKitView from './components/BrandKitView';
import MentorView from './components/MentorView';
import AdminView from './components/admin/AdminView';
import ProfileView from './components/user/ProfileView'; 
import DailyMotivation from './components/common/DailyMotivation';
import PerformanceView from './components/PerformanceView';
import { AppView } from './types';
import { Session as SupabaseSession } from '@supabase/supabase-js';
import { useAppStore } from './store/appStore';
import { supabase } from './services/supabaseClient';

// Hardcoded for simplicity as requested, ensuring it matches Header.tsx logic
const ADMIN_EMAIL = 'miura.force@gmail.com';

interface AppProps {
    session: SupabaseSession;
}

const SetPasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
        if (password !== confirm) { setError('No coinciden'); return; }
        
        setLoading(true); setError('');
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        
        if (error) setError(error.message);
        else onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-green-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
                    <h2 className="text-2xl font-bold text-white">¡Bienvenido a ViralZIA!</h2>
                    <p className="text-slate-400 mt-2 text-sm">Has entrado con un pase temporal. Por favor, crea tu contraseña personal para asegurar tu cuenta.</p>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <input type="password" placeholder="Nueva Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white" required />
                    <input type="password" placeholder="Confirmar Contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white" required />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg">
                        {loading ? 'Guardando...' : 'Establecer Contraseña y Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const App: React.FC<AppProps> = ({ session }) => {
    const [currentView, setCurrentView] = useState<AppView>('myAnalyses');
    const fetchCredits = useAppStore(state => state.fetchCredits);
    const [showSetPassword, setShowSetPassword] = useState(false);

    // Load credits when the app starts with a session
    useEffect(() => {
        if (session?.user) {
            fetchCredits();
        }
    }, [session, fetchCredits]);

    // Detect Invite Link (Recovery Mode)
    useEffect(() => {
        // Supabase invite links usually look like: #access_token=...&type=invite
        // or recovery links: #access_token=...&type=recovery
        const hash = window.location.hash;
        if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
            setShowSetPassword(true);
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const renderView = () => {
        switch (currentView) {
            case 'analyzer':
                return <VideoAnalyzerView setCurrentView={setCurrentView} />;
            case 'creativeSuite':
                return <CreativeSuiteView />;
            case 'trends':
                return <TrendsView setCurrentView={setCurrentView} />;
            case 'myAnalyses':
                return <MyAnalysesView setCurrentView={setCurrentView} />;
            case 'brandKit':
                return <BrandKitView />;
            case 'mentor':
                return <MentorView />;
            case 'admin':
                return <AdminView />;
            case 'profile': 
                return <ProfileView setCurrentView={setCurrentView} />;
            case 'performance':
                return <PerformanceView />;
            default:
                return <MyAnalysesView setCurrentView={setCurrentView} />;
        }
    }

    const isAdmin = session.user.email === ADMIN_EMAIL;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans relative overflow-x-hidden">
            {/* Set Password Modal for Invites */}
            {showSetPassword && <SetPasswordModal onClose={() => setShowSetPassword(false)} />}

            {/* Daily Motivation Modal (Only shows once per day) */}
            {!showSetPassword && <DailyMotivation />}

            {/* Ambient Background Effects (Deep Space Theme) */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="fixed bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-pink-900/20 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="fixed top-[40%] left-[20%] w-[20%] h-[20%] bg-indigo-900/10 rounded-full blur-[80px] pointer-events-none z-0" />

            <div className="relative z-10">
                <Header user={session.user} currentView={currentView} setCurrentView={setCurrentView} />
                <main className="pb-10">
                    {renderView()}
                </main>
                <footer className="text-center p-6 text-slate-500 text-sm border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
                    <p>Powered by Google Gemini • ViralZIA Platform</p>
                    {isAdmin && (
                        <p className="mt-2 text-[10px] font-bold text-amber-500/30 tracking-[0.2em] uppercase">
                            El Gran Sultanato de la Viralidad Creativa AZ
                        </p>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default App;
