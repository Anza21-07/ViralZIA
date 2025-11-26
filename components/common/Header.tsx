
import React from 'react';
import { AppView } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import Logo from './Logo';
import { useAppStore } from '../../store/appStore';

// This should be an environment variable in a real application
const ADMIN_EMAIL = 'miura.force@gmail.com';

interface HeaderProps {
    user: User;
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ user, currentView, setCurrentView }) => {
    const navItemClasses = "cursor-pointer px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium";
    const activeClasses = "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 transform scale-105 border border-transparent";
    const inactiveClasses = "text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700";
    
    // Get credits from store
    const credits = useAppStore(state => state.credits);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    const isAdmin = user.email === ADMIN_EMAIL;

    return (
        <>
            {/* ADMIN EXCLUSIVE TOP BAR */}
            {isAdmin && (
                <div className="bg-gradient-to-r from-amber-900/40 via-orange-900/40 to-amber-900/40 border-b border-amber-500/20 py-1 text-center backdrop-blur-sm relative z-50">
                    <p className="text-[10px] font-bold tracking-[0.3em] text-amber-400/90 uppercase drop-shadow-md animate-pulse">
                        👑 El Gran Sultanato de la Viralidad Creativa AZ 👑
                    </p>
                </div>
            )}

            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-50 transition-all duration-300">
                <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-0">
                    {/* Logo Area */}
                    <div 
                        className="flex items-center space-x-3 cursor-pointer group" 
                        onClick={() => setCurrentView('myAnalyses')}
                    >
                        <div className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                            <Logo className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                            ViralZIA
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center space-x-1 bg-slate-950/50 p-1.5 rounded-xl overflow-x-auto max-w-full no-scrollbar border border-slate-800/50 shadow-inner">
                        <button
                            onClick={() => setCurrentView('myAnalyses')}
                            className={`${navItemClasses} ${currentView === 'myAnalyses' ? activeClasses : inactiveClasses}`}
                        >
                            Mis Análisis
                        </button>
                        <button
                            onClick={() => setCurrentView('trends')}
                            className={`${navItemClasses} ${currentView === 'trends' ? activeClasses : inactiveClasses}`}
                        >
                            Radar
                        </button>
                        <button
                            onClick={() => setCurrentView('analyzer')}
                            className={`${navItemClasses} ${currentView === 'analyzer' ? activeClasses : inactiveClasses}`}
                        >
                            Analizador
                        </button>
                        <button
                            onClick={() => setCurrentView('brandKit')}
                            className={`${navItemClasses} ${currentView === 'brandKit' ? activeClasses : inactiveClasses}`}
                        >
                            Marca
                        </button>
                        <button
                            onClick={() => setCurrentView('creativeSuite')}
                            className={`${navItemClasses} ${currentView === 'creativeSuite' ? activeClasses : inactiveClasses}`}
                        >
                            Suite Creativa
                        </button>
                        <button
                            onClick={() => setCurrentView('performance')}
                            className={`${navItemClasses} ${currentView === 'performance' ? activeClasses : inactiveClasses} flex items-center gap-1 ${currentView !== 'performance' ? 'text-green-300 border-green-500/30 hover:bg-green-900/20' : ''}`}
                        >
                            <span className="text-lg">📈</span> Rendimiento
                        </button>
                        <button
                            onClick={() => setCurrentView('mentor')}
                            className={`${navItemClasses} ${currentView === 'mentor' ? activeClasses : inactiveClasses} flex items-center gap-1 ${currentView !== 'mentor' ? 'bg-indigo-900/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/40' : ''}`}
                        >
                            <span className="text-lg">🧞‍♂️</span> Mentor
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setCurrentView('admin')}
                                className={`${navItemClasses} ${currentView === 'admin' ? activeClasses : inactiveClasses} ${currentView !== 'admin' ? 'text-amber-400 border-amber-500/30 hover:bg-amber-900/20' : ''}`}
                            >
                                Admin
                            </button>
                        )}
                    </nav>

                    {/* User Area */}
                    <div className="flex items-center space-x-4">
                        {/* Credits Display */}
                        <div className="hidden md:flex items-center bg-slate-950 px-4 py-1.5 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]" title="Créditos disponibles">
                            <span className="text-yellow-500 mr-2 text-lg">⚡</span>
                            <span className="text-yellow-100 font-mono font-bold">{credits}</span>
                        </div>

                        <div 
                            className="hidden md:flex flex-col items-end cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setCurrentView('profile')}
                            title="Ver mi perfil"
                        >
                            <span className="text-xs text-slate-400">Conectado como</span>
                            <span className={`text-sm font-medium ${currentView === 'profile' ? 'text-purple-400' : 'text-slate-200'}`}>
                                {user.email}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 text-slate-300 hover:text-white hover:bg-red-900/50 font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm border border-slate-700 hover:border-red-500/50"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
