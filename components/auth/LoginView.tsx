
/// <reference lib="dom" />
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';

const LoginView: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Modal States
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);

    // Login Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Request Form State
    const [reqName, setReqName] = useState('');
    const [reqEmail, setReqEmail] = useState('');
    const [reqReason, setReqReason] = useState('');
    const [requestSent, setRequestSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    const handleRequestAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await supabase
                .from('access_requests')
                .insert({
                    name: reqName,
                    email: reqEmail,
                    reason: reqReason
                });
            
            if (error) throw error;
            setRequestSent(true);
        } catch (err: any) {
            console.error(err);
            setError('Error al enviar la solicitud. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-purple-500 selection:text-white overflow-hidden relative">
            
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-pink-600/20 rounded-full blur-[100px]" />

            {/* Navigation */}
            <nav className="container mx-auto p-6 flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/20">
                        V
                    </div>
                    <span className="text-xl font-bold tracking-tight">Viralzia</span>
                </div>
                <div className="flex space-x-4">
                    <button 
                        onClick={() => setShowLoginModal(true)}
                        className="text-gray-300 hover:text-white font-medium px-4 py-2 transition-colors"
                    >
                        Iniciar Sesión
                    </button>
                    <button 
                        onClick={() => setShowRequestModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2 px-6 rounded-full shadow-lg shadow-purple-500/30 transition-all transform hover:scale-105"
                    >
                        Solicitar Acceso
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto px-6 pt-10 pb-20 text-center relative z-10 flex flex-col items-center">
                <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-pink-300 mb-6 tracking-tight drop-shadow-sm">
                    Crea Contenido <br className="hidden md:block" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">Que Domina el Algoritmo</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Descubre el poder de la inteligencia artificial para generar ideas, analizar contenido y crear scripts que capturan la atención de tu audiencia en todas las plataformas.
                </p>

                <div className="flex flex-col md:flex-row gap-4 justify-center mb-16">
                    <button 
                        onClick={() => setShowRequestModal(true)}
                        className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-lg font-bold py-4 px-8 rounded-full shadow-xl shadow-purple-500/40 transition-all transform hover:-translate-y-1"
                    >
                        Comenzar Ahora
                    </button>
                    <button 
                        onClick={() => setShowRequestModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-lg font-medium py-4 px-8 rounded-full border border-slate-700 transition-all"
                    >
                        Solicitar Invitación
                    </button>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-5xl w-full">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl hover:border-purple-500/50 transition-colors group text-left">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                            <span className="text-2xl">🎬</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Guiones Creativos</h3>
                        <p className="text-gray-400">Genera guiones impactantes para cualquier tipo de video con estructuras narrativas probadas y optimizadas para el engagement.</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl hover:border-pink-500/50 transition-colors group text-left">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                             <span className="text-2xl">📊</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Análisis Profundo</h3>
                        <p className="text-gray-400">Analiza tu contenido y descubre su potencial viral con métricas avanzadas de engagement, audiencia y tendencias.</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl hover:border-yellow-500/50 transition-colors group text-left md:col-span-2">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                             <span className="text-2xl">💡</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ideas Innovadoras</h3>
                        <p className="text-gray-400">Genera ideas virales basadas en tendencias, algoritmos y patrones de éxito probados en todas las plataformas.</p>
                    </div>
                </div>

                {/* Invite Only Badge */}
                <div className="mt-16 max-w-3xl w-full bg-slate-800/30 border border-slate-700 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 font-bold mb-4">⚠️</div>
                        <h3 className="text-xl font-bold text-white mb-2">¿Por qué por invitación?</h3>
                        <p className="text-gray-400 mb-6 max-w-lg">
                            Viralzia es una plataforma premium que utiliza recursos de IA avanzada. Para garantizar la mejor experiencia a nuestros usuarios, operamos bajo un modelo de acceso controlado.
                        </p>
                        <div className="flex gap-6 text-xs font-medium text-gray-400 uppercase tracking-wider flex-wrap justify-center">
                             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full" /> Control de calidad y rendimiento</span>
                             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500 rounded-full" /> Acceso prioritario a nuevas funcionalidades</span>
                             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Comunidad selecta de creadores</span>
                             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /> Seguridad reforzada y soporte premium</span>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="text-center py-8 text-gray-500 text-sm relative z-10 border-t border-gray-800">
                <p>© 2025 Viralzia. Creado con ❤️ para creadores de contenido. <span className="text-purple-500">Acceso por invitación requerido.</span></p>
            </footer>

            {/* --- LOGIN MODAL --- */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-8 relative shadow-2xl animate-fadeIn">
                        <button 
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <div className="text-center mb-8">
                            <div className="inline-block w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg">V</div>
                            <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
                            <p className="text-gray-400 mt-1">Accede a tu suite creativa</p>
                        </div>
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    placeholder="tu@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</p>}
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Iniciando...' : 'Entrar'}
                            </button>
                        </form>
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-400">
                                ¿No tienes cuenta? <button onClick={() => { setShowLoginModal(false); setShowRequestModal(true); }} className="text-purple-400 hover:text-purple-300 font-medium">Solicitar acceso</button>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- REQUEST ACCESS MODAL --- */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} />
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-8 relative shadow-2xl animate-fadeIn my-8">
                        <button 
                            onClick={() => setShowRequestModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        
                        {!requestSent ? (
                            <>
                                <div className="text-center mb-6">
                                    <div className="inline-block p-3 bg-orange-500/20 rounded-full mb-4">
                                         <span className="text-3xl">📝</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Solicitar Acceso</h2>
                                    <p className="text-gray-400 mt-2 text-sm">Une tu talento al futuro de la creación de contenido</p>
                                </div>
                                
                                <form onSubmit={handleRequestAccess} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={reqName}
                                            onChange={(e) => setReqName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            placeholder="Tu nombre completo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={reqEmail}
                                            onChange={(e) => setReqEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            placeholder="tu@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">¿Por qué quieres unirte a Viralzia?</label>
                                        <textarea 
                                            required
                                            value={reqReason}
                                            onChange={(e) => setReqReason(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none h-24 resize-none"
                                            placeholder="Cuéntanos sobre tu proyecto, qué esperas de Viralzia y cómo planeas usarla..."
                                        />
                                    </div>
                                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</p>}
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Enviando...' : 'Enviar Solicitud de Acceso'}
                                    </button>
                                </form>

                                {/* Documentación sobre API KEY */}
                                <div className="mt-6 bg-slate-900/50 p-4 rounded-lg border border-purple-500/30 text-left">
                                    <h4 className="text-purple-400 font-bold text-sm mb-2 flex items-center gap-2">
                                        <span>🔑</span> Importante: Google API Key
                                    </h4>
                                    <p className="text-xs text-gray-400 mb-2">
                                        Para utilizar el potencial completo de ViralZIA (especialmente la generación de video VEO), necesitarás tu propia clave de API.
                                    </p>
                                    <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1 mb-3">
                                        <li>Ve a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>.</li>
                                        <li>Crea una API Key gratuita.</li>
                                        <li>Una vez que recibas tu invitación, podrás configurarla en tu <strong>Kit de Marca</strong>.</li>
                                    </ol>
                                </div>

                                <button 
                                    onClick={() => { setShowRequestModal(false); setShowLoginModal(true); }}
                                    className="w-full text-center text-sm text-gray-400 mt-4 hover:text-white"
                                >
                                    ← Volver al Inicio
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 text-3xl">
                                    ✓
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Recibida!</h2>
                                <p className="text-gray-400 mb-6">
                                    Hemos recibido tus datos correctamente. Nuestro equipo revisará tu solicitud y, si eres seleccionado, recibirás una invitación en tu correo electrónico <strong>{reqEmail}</strong>.
                                </p>
                                <button 
                                    onClick={() => setShowRequestModal(false)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                                >
                                    Entendido
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default LoginView;
