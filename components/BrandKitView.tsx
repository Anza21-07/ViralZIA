
/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { BrandKit } from '../types';
import Loader from './common/Loader';

const BrandKitView: React.FC = () => {
    const { brandKit, setBrandKit } = useAppStore();
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'Guardado' | 'Guardando...' | 'Error' | 'Cambios sin guardar'>('Guardado');
    const debounceTimer = useRef<number | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        const loadBrandKit = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('brand_kit')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
                    throw error;
                }
                
                if (data) {
                    setBrandKit(data as BrandKit);
                } else {
                    // Initialize a new brand kit if none exists
                    setBrandKit({
                        user_id: user.id,
                        tone_of_voice: '',
                        visual_style: '',
                        target_audience: '',
                        content_language: 'es'
                    });
                }
            } catch (error) {
                console.error("Error loading brand kit:", error);
                setSaveStatus('Error');
            } finally {
                setIsLoading(false);
            }
        };

        loadBrandKit();
    }, [setBrandKit]);

    useEffect(() => {
        if (!brandKit || isLoading) {
            return;
        }

        setSaveStatus('Cambios sin guardar');

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(async () => {
            setSaveStatus('Guardando...');
            try {
                const { error } = await supabase.from('brand_kit').upsert(brandKit);
                if (error) throw error;
                setSaveStatus('Guardado');
            } catch (e) {
                console.error("Autosave failed:", e);
                setSaveStatus('Error');
            }
        }, 1500);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [brandKit, isLoading]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) => {
        if (!brandKit || !e.currentTarget) return;
        const { name, value } = e.currentTarget;
        setBrandKit({ ...brandKit, [name]: value });
    };
    
    const renderSaveStatus = () => {
        switch (saveStatus) {
            case 'Guardando...':
                return <div className="flex items-center text-sm text-yellow-500/80"><svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Guardando...</div>;
            case 'Guardado':
                return <div className="flex items-center text-sm text-green-500/80"><svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Guardado</div>;
            case 'Cambios sin guardar':
                return <div className="flex items-center text-sm text-slate-500"><svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>Sin guardar</div>;
            case 'Error':
                return <div className="flex items-center text-sm text-red-400"><svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Error</div>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader message="Cargando Kit de Marca..." /></div>
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Kit de Marca</h2>
                <p className="text-slate-400 mt-2">Define la personalidad de tu marca. La IA usará esta información como guía.</p>
            </div>

            <div className="max-w-3xl mx-auto bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl space-y-6">
                <div>
                    <label htmlFor="tone_of_voice" className="block text-lg font-semibold text-slate-200 mb-2">Tono de Voz</label>
                    <textarea
                        id="tone_of_voice"
                        name="tone_of_voice"
                        value={brandKit?.tone_of_voice || ''}
                        onChange={handleChange}
                        placeholder="Ej: Divertido y sarcástico, profesional y educativo, inspirador y motivacional..."
                        className="w-full h-24 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white placeholder-slate-500 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Describe cómo debe sonar tu marca.</p>
                </div>

                <div>
                    <label htmlFor="visual_style" className="block text-lg font-semibold text-slate-200 mb-2">Estilo Visual</label>
                    <textarea
                        id="visual_style"
                        name="visual_style"
                        value={brandKit?.visual_style || ''}
                        onChange={handleChange}
                        placeholder="Ej: Cinematográfico con colores oscuros y neón, estilo acuarela brillante y alegre, minimalista y limpio..."
                        className="w-full h-24 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white placeholder-slate-500 resize-none"
                    />
                     <p className="text-xs text-slate-500 mt-1">Guía para la IA sobre cómo deben lucir las imágenes y descripciones visuales.</p>
                </div>

                <div>
                    <label htmlFor="target_audience" className="block text-lg font-semibold text-slate-200 mb-2">Público Objetivo</label>
                    <textarea
                        id="target_audience"
                        name="target_audience"
                        value={brandKit?.target_audience || ''}
                        onChange={handleChange}
                        placeholder="Ej: Emprendedores jóvenes que buscan iniciar su primer negocio online, estudiantes universitarios de carreras creativas..."
                        className="w-full h-24 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white placeholder-slate-500 resize-none"
                    />
                     <p className="text-xs text-slate-500 mt-1">Describe a quién te diriges para que la IA adapte el mensaje.</p>
                </div>

                 <div>
                    <label htmlFor="content_language" className="block text-lg font-semibold text-slate-200 mb-2">Idioma del Contenido</label>
                    <select
                        id="content_language"
                        name="content_language"
                        value={brandKit?.content_language || 'es'}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white"
                    >
                        <option value="es">Español (Predeterminado)</option>
                        <option value="en">Inglés (English)</option>
                        <option value="pt">Portugués (Português)</option>
                        <option value="fr">Francés (Français)</option>
                        <option value="de">Alemán (Deutsch)</option>
                        <option value="it">Italiano (Italiano)</option>
                        <option value="ru">Ruso (Русский)</option>
                        <option value="zh">Chino (中文)</option>
                        <option value="ja">Japonés (日本語)</option>
                        <option value="he">Hebreo (עברית)</option>
                    </select>
                     <p className="text-xs text-slate-500 mt-1">Elige el idioma en el que la IA generará los guiones y el contenido.</p>
                </div>

                <div className="border-t border-slate-700/50 pt-6 mt-6">
                    <h3 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2">
                         <span>🔑</span> Configuración de APIs (BYOK)
                    </h3>
                    
                    {/* Gemini Key */}
                    <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700/50 mb-4">
                        <label htmlFor="gemini_api_key" className="block text-sm font-medium text-slate-300 mb-2">
                            Google Gemini API Key
                        </label>
                        <div className="flex gap-2">
                            <input
                                type={showApiKey ? "text" : "password"}
                                id="gemini_api_key"
                                name="gemini_api_key"
                                value={brandKit?.gemini_api_key || ''}
                                onChange={handleChange}
                                placeholder="sk-..."
                                className="flex-grow p-3 bg-slate-950 border border-slate-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors border border-slate-700"
                            >
                                {showApiKey ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>
                         <p className="text-xs text-slate-500 mt-2">Necesaria para generar videos con Google VEO y modelos avanzados.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50 flex items-center justify-end">
                    {renderSaveStatus()}
                </div>
            </div>
        </div>
    );
};

export default BrandKitView;