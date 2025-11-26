
import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore, useAppStore } from '../store/appStore';
import { 
    analyzeTranscriptOnly, 
    generateImprovedScripts, 
    generateImagePromptsFromScript, 
    generateImageWithNano,
    generateVoiceOver,
    generateScriptFromCreativeBrief,
    generateHookVariations,
    auditScriptQuality
} from '../services/geminiService';
import { createSmartExportZip, pcmToWavBlob, mergeInt16Arrays, exportScriptToPdf } from '../services/utils';
import Loader from './common/Loader';
import { AppView, ScriptScene, ScriptStrategy, HookVariant, ViralScore } from '../types';
import { supabase } from '../services/supabaseClient';

interface VideoAnalyzerViewProps {
    setCurrentView: (view: AppView) => void;
}

// Lista completa de voces de Gemini
const AVAILABLE_VOICES = [
    { id: 'Puck', name: 'Puck (Masc, Enérgica/Rápida)' },
    { id: 'Charon', name: 'Charon (Masc, Profunda/Seria)' },
    { id: 'Kore', name: 'Kore (Fem, Calma/Relajada)' },
    { id: 'Fenrir', name: 'Fenrir (Masc, Profunda/Narrativa)' },
    { id: 'Aoede', name: 'Aoede (Fem, Sofisticada)' },
    { id: 'Zephyr', name: 'Zephyr (Fem, Amistosa/Estándar)' },
    { id: 'Leda', name: 'Leda (Fem, Narrativa)' },
    { id: 'Orus', name: 'Orus (Masc, Autoritaria)' },
    { id: 'Umbriel', name: 'Umbriel (Masc, Suave)' },
    { id: 'Alnilam', name: 'Alnilam (Fem, Profesional)' },
    { id: 'Schedar', name: 'Schedar (Masc, Natural)' },
];

// --- SHADOWBAN DICTIONARY (Algospeak) ---
const SHADOWBAN_TERMS: { [key: string]: string } = {
    "muerte": "desvivición",
    "morir": "ir con diosito",
    "matar": "eliminar",
    "suicidio": "auto-eliminación",
    "asesinato": "crimen",
    "sangre": "líquido rojo",
    "droga": "sustancia",
    "sexo": "el delicioso",
    "desnudo": "sin ropa",
    "porno": "contenido adulto",
    "estafa": "situación irregular",
    "dinero fácil": "oportunidad",
    "piramidal": "triangular",
    "tonto": "falto de luces",
    "idiota": "bobo",
    "gordo": "talla grande",
    "violación": "abuso",
    "arma": "herramienta",
    "disparo": "impacto",
    "link en bio": "enlace en perfil (escrito)",
    "sígueme": "únete a la familia"
};

// --- Helper: Estimate Duration ---
const estimateDuration = (text: string): number => {
    if (!text) return 0;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 2.5);
};

// --- COMPONENT: SHADOWBAN SHIELD ---
const ShadowbanShield: React.FC<{ text: string }> = ({ text }) => {
    const [risks, setRisks] = useState<{ term: string, suggestion: string }[]>([]);

    useEffect(() => {
        if (!text) {
            setRisks([]);
            return;
        }
        const foundRisks: { term: string, suggestion: string }[] = [];
        const lowerText = text.toLowerCase();
        
        Object.keys(SHADOWBAN_TERMS).forEach(term => {
            if (lowerText.includes(term)) {
                foundRisks.push({ term, suggestion: SHADOWBAN_TERMS[term] });
            }
        });
        setRisks(foundRisks);
    }, [text]);

    if (risks.length === 0) {
        return (
            <div className="group relative inline-block ml-2 cursor-help">
                <span className="text-green-500 text-xs" title="Texto Seguro">🛡️</span>
            </div>
        );
    }

    return (
        <div className="group relative inline-block ml-2 z-20">
            <span className="text-yellow-500 text-xs cursor-help animate-pulse">⚠️</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 border border-yellow-600 rounded-lg shadow-xl p-3 hidden group-hover:block">
                <p className="text-[10px] font-bold text-yellow-500 uppercase mb-2 border-b border-yellow-600/30 pb-1">Alerta Anti-Shadowban</p>
                <ul className="space-y-1">
                    {risks.map((r, i) => (
                        <li key={i} className="text-[10px] text-slate-300">
                            "<span className="text-red-400 line-through">{r.term}</span>" → <span className="text-green-400 font-bold">{r.suggestion}</span>
                        </li>
                    ))}
                </ul>
                <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-slate-900 border-r border-b border-yellow-600 transform rotate-45 -translate-x-1/2"></div>
            </div>
        </div>
    );
};

// --- COMPONENT: ANIMATIC PLAYER (MODO CINE) ---
const AnimaticPlayer: React.FC<{
    script: ScriptScene[];
    images: { [key: number]: string };
    voiceId: string;
    brandKit: any;
    onClose: () => void;
}> = ({ script, images, voiceId, brandKit, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    // Use AudioContext for better control (and consistency with preview)
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        let mounted = true;

        const playScene = async () => {
            if (!mounted) return;
            if (currentIndex >= script.length) {
                setIsPlaying(false); // End of movie
                return;
            }

            setIsLoadingAudio(true);
            
            // Stop previous
            if (audioSourceRef.current) {
                try { audioSourceRef.current.stop(); } catch(e) {}
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }

            try {
                const scene = script[currentIndex];
                // Generate audio on the fly for current scene
                const base64Audio = await generateVoiceOver(scene.voiceOver, voiceId, brandKit, brandKit?.gemini_api_key);
                
                if (!mounted) return;

                // WEB AUDIO API IMPLEMENTATION
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = ctx;

                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
                
                // Decode audio data
                // Note: The raw PCM from Gemini is 24kHz 16-bit mono. 
                // For simple playback, converting to WAV blob first then decoding is safer for browser compatibility
                const wavBlob = pcmToWavBlob(bytes, 24000, 1, 16);
                const arrayBuffer = await wavBlob.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                audioSourceRef.current = source;

                const gainNode = ctx.createGain();
                // Apply volume with amplification support
                const volume = scene.audio_volume ?? 1.0;
                gainNode.gain.value = volume; 

                source.connect(gainNode);
                gainNode.connect(ctx.destination);

                source.onended = () => {
                    if (mounted) {
                        setCurrentIndex(prev => prev + 1); // Next scene
                    }
                };

                source.start(0);

            } catch (error) {
                console.error("Animatic Error:", error);
                // If error, wait 3s then skip
                setTimeout(() => {
                    if(mounted) setCurrentIndex(prev => prev + 1);
                }, 3000);
            } finally {
                if (mounted) setIsLoadingAudio(false);
            }
        };

        if (isPlaying) {
            playScene();
        }

        return () => {
            mounted = false;
            if (audioSourceRef.current) {
                try { audioSourceRef.current.stop(); } catch(e) {}
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [currentIndex, isPlaying, script, voiceId, brandKit]);

    const currentScene = script[currentIndex];
    const currentImage = images[currentIndex];

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fadeIn">
            {/* Controls Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <span className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">● Modo Cine</span>
                    <span className="text-white/50 text-xs">Escena {currentIndex + 1} / {script.length}</span>
                </div>
                <button onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/10">
                    Salir
                </button>
            </div>

            {/* Screen */}
            <div className="relative w-full max-w-md aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-800">
                {currentIndex < script.length ? (
                    <>
                        {currentImage ? (
                            <img src={currentImage} className={`w-full h-full object-cover transition-opacity duration-500 ${isLoadingAudio ? 'opacity-50 scale-105' : 'opacity-100 scale-100'}`} alt="Animatic" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                <span className="text-4xl">🎬</span>
                            </div>
                        )}
                        
                        {/* Subtitles */}
                        <div className="absolute bottom-10 left-4 right-4 text-center">
                            <p className="bg-black/60 text-white text-sm p-3 rounded-xl backdrop-blur-sm shadow-lg leading-relaxed">
                                {currentScene?.voiceOver}
                            </p>
                        </div>

                        {/* Loading Indicator */}
                        {isLoadingAudio && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                        <h3 className="text-2xl font-bold mb-4">Fin de la Proyección</h3>
                        <button 
                            onClick={() => setCurrentIndex(0)} 
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-slate-200"
                        >
                            <span>↺</span> Repetir
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-10 left-10 right-10 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-red-600 transition-all duration-300 ease-linear" 
                    style={{ width: `${Math.min(100, ((currentIndex) / script.length) * 100)}%` }}
                />
            </div>
        </div>
    );
};

// --- Componente Espejo Viral (Mobile Previewer) ---
const MobilePreviewer: React.FC<{ scene: ScriptScene | null; image: string | null }> = ({ scene, image }) => {
    return (
        <div className="relative mx-auto border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col overflow-hidden animate-fadeIn z-50">
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
            
            {/* Pantalla */}
            <div className="flex-grow relative bg-slate-950 w-full h-full overflow-hidden rounded-[2rem]">
                {/* Background Image */}
                {image ? (
                    <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="Scene Preview" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center p-6 text-center">
                         <span className="text-slate-600 text-xs">
                             {scene ? "Sin imagen generada" : "Selecciona una escena para previsualizar"}
                         </span>
                    </div>
                )}
                
                {/* TikTok UI Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                
                {/* Right Sidebar Actions */}
                <div className="absolute right-2 bottom-20 flex flex-col gap-4 items-center z-10">
                    <div className="w-10 h-10 bg-slate-800/50 backdrop-blur rounded-full flex items-center justify-center"><span className="text-xl">❤️</span></div>
                    <div className="text-white text-[10px] font-bold shadow-black drop-shadow-md">1.2M</div>
                    <div className="w-10 h-10 bg-slate-800/50 backdrop-blur rounded-full flex items-center justify-center"><span className="text-xl">💬</span></div>
                    <div className="text-white text-[10px] font-bold shadow-black drop-shadow-md">4056</div>
                    <div className="w-10 h-10 bg-slate-800/50 backdrop-blur rounded-full flex items-center justify-center"><span className="text-xl">↪️</span></div>
                </div>

                {/* Bottom Info & Captions */}
                <div className="absolute bottom-4 left-4 right-16 z-10 text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border border-white"></div>
                        <span className="text-white font-bold text-sm shadow-black drop-shadow-md">@tumarca</span>
                    </div>
                    <p className="text-white text-xs leading-relaxed shadow-black drop-shadow-md line-clamp-3">
                        {scene ? scene.voiceOver : "El texto de tu guion aparecerá aquí como subtítulos..."}
                    </p>
                    <div className="flex items-center gap-2 mt-2 opacity-80">
                         <span className="text-[10px] text-white">♫ Sonido Original - ViralZIA</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const VideoAnalyzerView: React.FC<VideoAnalyzerViewProps> = ({ setCurrentView }) => {
    // Store
    const sessionStore = useSessionStore();
    const { 
        original_transcript, setOriginalTranscript,
        analysis, setAnalysis,
        generated_scripts, setGeneratedScripts,
        image_prompts, setImagePrompts,
        storyboardImages, setStoryboardImage,
        updateScriptScene,
        title, setTitle
    } = sessionStore;
    
    const { brandKit, credits, deductCredits, setPendingVeoPrompt } = useAppStore();
    
    // Local State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [activeScriptIndex, setActiveScriptIndex] = useState(0);
    const [selectedStrategy, setSelectedStrategy] = useState<ScriptStrategy>('direct');
    const [inputMode, setInputMode] = useState<'transcript' | 'idea'>('transcript');
    
    // Saving State
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Estado para el Espejo Viral
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [activeScene, setActiveScene] = useState<ScriptScene | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Estado para Audición Instantánea (Audio Player)
    const [selectedAuditionVoice, setSelectedAuditionVoice] = useState('Puck');
    const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null);
    const [isAuditionLoading, setIsAuditionLoading] = useState<{ [key: number]: boolean }>({});
    
    // REF for Web Audio API
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Estado para Hook Lab
    const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);

    // Estado para Termómetro Viral (Audit)
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);

    // Estado para Animatic (Modo Cine)
    const [showAnimatic, setShowAnimatic] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [generatingImages, setGeneratingImages] = useState<{ [key: string]: boolean }>({});
    const [enhancingFields, setEnhancingFields] = useState<{ [key: string]: boolean }>({});
    const [enhancingPrompts, setEnhancingPrompts] = useState<{ [key: number]: boolean }>({});

    // Calculation of total duration
    const currentScript = generated_scripts[activeScriptIndex];
    const totalDuration = currentScript 
        ? currentScript.script.reduce((acc, scene) => acc + estimateDuration(scene.voiceOver), 0)
        : 0;
    const isOverLimit = totalDuration > 60;

    // Efecto para limpiar el audio si se desmonta
    useEffect(() => {
        return () => {
            if (audioSourceRef.current) {
                try { audioSourceRef.current.stop(); } catch(e) {}
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Efecto para actualizar la escena activa si cambia el script
    useEffect(() => {
        if (generated_scripts[activeScriptIndex]?.script[0]) {
            setActiveScene(generated_scripts[activeScriptIndex].script[0]);
            // Reset image on script change unless persisted
            const firstImg = storyboardImages[activeScriptIndex]?.[0];
            setActiveImage(firstImg || null);
        }
    }, [generated_scripts, activeScriptIndex, storyboardImages]);

    // --- ACTIONS ---

    const handleSaveSession = async () => {
        // IMPORTANT: We fetch the LATEST state from the store directly to avoid stale closures issues
        // where React component variables might hold old data if the user edits quickly.
        const latestSession = useAppStore.getState().session;
        
        if (!latestSession.id) return;
        setIsSaving(true);
        setSaveMessage('Guardando...');
        
        // Debug: Check if data is fresh
        console.log("Saving session data:", latestSession.generated_scripts[activeScriptIndex]?.script);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado");

            const sessionData = {
                id: latestSession.id,
                user_id: user.id,
                title: latestSession.title,
                original_transcript: latestSession.original_transcript,
                analysis: latestSession.analysis,
                generated_scripts: latestSession.generated_scripts,
                image_prompts: latestSession.image_prompts,
                storyboard_images: latestSession.storyboardImages,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('sessions').upsert(sessionData);
            if (error) throw error;

            setSaveMessage('¡Guardado!');
            setTimeout(() => setSaveMessage(null), 2000);
        } catch (err: any) {
            console.error(err);
            setError("Error al guardar sesión: " + err.message);
            setSaveMessage(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (!original_transcript.trim()) return;
        setIsLoading(true);
        setLoadingMessage('Analizando transcripción...');
        setError(null);
        try {
            const result = await analyzeTranscriptOnly(original_transcript, brandKit?.gemini_api_key);
            setAnalysis(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateScripts = async () => {
        setIsLoading(true);
        setLoadingMessage(`Generando guiones (${selectedStrategy === 'direct' ? 'Valor Directo' : 'Alta Retención'})...`);
        setError(null);
        try {
            let scripts;
            if (inputMode === 'transcript' && analysis) {
                scripts = await generateImprovedScripts(analysis, original_transcript, brandKit, selectedStrategy, brandKit?.gemini_api_key);
            } else {
                setLoadingMessage(`Creando guion desde cero (${selectedStrategy})...`);
                const strategyNote = selectedStrategy === 'retention' 
                    ? " (Usa ESTRUCTURA VIRAL CON PLOT TWIST)" 
                    : " (Usa ESTRUCTURA DIRECTA Y RÁPIDA)";
                
                const enhancedBrief = original_transcript + strategyNote;
                const script = await generateScriptFromCreativeBrief(enhancedBrief, brandKit, brandKit?.gemini_api_key);
                scripts = [script];
                
                setTitle(script.title);
            }
            setGeneratedScripts(scripts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePrompts = async (scriptIndex: number) => {
        const script = generated_scripts[scriptIndex];
        if (!script) return;
        
        setIsLoading(true);
        setLoadingMessage('Creando prompts visuales...');
        setError(null);
        try {
            const scriptText = script.script.map(s => `Scene ${s.scene}: ${s.visuals}`).join('\n');
            const prompts = await generateImagePromptsFromScript(scriptText, brandKit, brandKit?.gemini_api_key);
            setImagePrompts(scriptIndex, prompts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (scriptIndex: number, promptIndex: number, prompt: string) => {
        if (credits < 1) {
            setError("Créditos insuficientes (1 crédito por imagen).");
            return;
        }
        
        const key = `${scriptIndex}-${promptIndex}`;
        setGeneratingImages(prev => ({ ...prev, [key]: true }));
        setError(null);
        
        try {
            const images = await generateImageWithNano(prompt, 1, brandKit?.visual_style, '9:16', brandKit?.gemini_api_key);
            if (images && images.length > 0) {
                const imageUrl = `data:image/jpeg;base64,${images[0]}`;
                setStoryboardImage(scriptIndex, promptIndex, imageUrl);
                deductCredits(1);
                if (showPreviewModal) {
                    setActiveImage(imageUrl);
                }
            }
        } catch (err: any) {
            setError(`Error generando imagen ${promptIndex + 1}: ${err.message}`);
        } finally {
            setGeneratingImages(prev => ({ ...prev, [key]: false }));
        }
    };

    const handlePromptChange = (scriptIndex: number, promptIndex: number, newValue: string) => {
        const newPrompts = [...(image_prompts[scriptIndex] || [])];
        newPrompts[promptIndex] = newValue;
        setImagePrompts(scriptIndex, newPrompts);
    };

    const handleSceneUpdate = (scriptIndex: number, sceneIndex: number, field: any, value: string | number) => {
        updateScriptScene(scriptIndex, sceneIndex, field, value.toString());
        if (activeScene && activeScene.scene === sceneIndex + 1) {
             setActiveScene(prev => prev ? ({...prev, [field]: value}) : null);
        }
    };

    // --- FLOW CONTROL / REORDERING ---
    const handleMoveScene = (scriptIndex: number, sceneIndex: number, direction: 'up' | 'down') => {
        const scriptCopy = [...generated_scripts[scriptIndex].script];
        const targetIndex = direction === 'up' ? sceneIndex - 1 : sceneIndex + 1;

        if (targetIndex < 0 || targetIndex >= scriptCopy.length) return;

        // Swap scenes
        [scriptCopy[sceneIndex], scriptCopy[targetIndex]] = [scriptCopy[targetIndex], scriptCopy[sceneIndex]];

        // Renumber scenes sequentially
        const renumberedScript = scriptCopy.map((scene, idx) => ({
            ...scene,
            scene: idx + 1
        }));

        // Update Global State
        const newGeneratedScripts = [...generated_scripts];
        newGeneratedScripts[scriptIndex] = {
            ...newGeneratedScripts[scriptIndex],
            script: renumberedScript
        };
        setGeneratedScripts(newGeneratedScripts);

        // Swapping prompts:
        const currentPrompts = image_prompts[scriptIndex] || [];
        if (currentPrompts.length > Math.max(sceneIndex, targetIndex)) {
             const newPrompts = [...currentPrompts];
             [newPrompts[sceneIndex], newPrompts[targetIndex]] = [newPrompts[targetIndex], newPrompts[sceneIndex]];
             setImagePrompts(scriptIndex, newPrompts);
        }
        
        // Swapping Images:
        const currentImages = storyboardImages[scriptIndex] || {};
        const imgA = currentImages[sceneIndex];
        const imgB = currentImages[targetIndex];
        
        if (imgA || imgB) {
            setStoryboardImage(scriptIndex, sceneIndex, imgB || '');
            setStoryboardImage(scriptIndex, targetIndex, imgA || '');
        }
    };

    // --- HOOK LAB LOGIC ---
    const handleGenerateHooks = async () => {
        if (credits < 1) {
            setError("Créditos insuficientes (1 crédito).");
            return;
        }
        
        setIsGeneratingHooks(true);
        setError(null);
        try {
            const scriptText = generated_scripts[activeScriptIndex].script.map(s => s.voiceOver).join(' ');
            const hooks = await generateHookVariations(scriptText, brandKit, brandKit?.gemini_api_key);
            deductCredits(1);
            
            // Update state with new hooks
            const newScripts = [...generated_scripts];
            newScripts[activeScriptIndex] = {
                ...newScripts[activeScriptIndex],
                hook_variations: hooks
            };
            setGeneratedScripts(newScripts);
            
        } catch (err: any) {
            console.error(err);
            setError("Error generando ganchos: " + err.message);
        } finally {
            setIsGeneratingHooks(false);
        }
    }

    const handleApplyHook = (variant: HookVariant) => {
        // Replace Scene 1 content
        handleSceneUpdate(activeScriptIndex, 0, 'visuals', variant.visuals);
        handleSceneUpdate(activeScriptIndex, 0, 'voiceOver', variant.voiceOver);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- VIRAL THERMOMETER LOGIC ---
    const handleAudit = async () => {
        if (credits < 1) {
            setError("Créditos insuficientes (1 crédito).");
            return;
        }
        
        setIsAuditing(true);
        setError(null);
        try {
            const scriptText = generated_scripts[activeScriptIndex].script.map(s => `[Escena ${s.scene}] Visual: ${s.visuals} | Audio: ${s.voiceOver}`).join('\n');
            const score = await auditScriptQuality(scriptText, brandKit, brandKit?.gemini_api_key);
            deductCredits(1);

            // Save score to script object
            const newScripts = [...generated_scripts];
            newScripts[activeScriptIndex] = {
                ...newScripts[activeScriptIndex],
                viral_score: score
            };
            setGeneratedScripts(newScripts);
            setShowAuditModal(true);

        } catch (err: any) {
            console.error(err);
            setError("Error en auditoría: " + err.message);
        } finally {
            setIsAuditing(false);
        }
    }

    const handlePdfExport = () => {
        const script = generated_scripts[activeScriptIndex];
        if (!script) return;
        try {
            exportScriptToPdf(script, "ViralZIA Creator");
        } catch (e: any) {
            setError("Error al generar PDF: " + e.message);
        }
    }

    const handleEnhanceField = async (scriptIndex: number, sceneIndex: number, field: 'visuals' | 'voiceOver') => {
        const currentText = generated_scripts[scriptIndex].script[sceneIndex][field];
        if (!currentText) return;

        const key = `${scriptIndex}-${sceneIndex}-${field}`;
        setEnhancingFields(prev => ({ ...prev, [key]: true }));
        setError(null);

        try {
            const { enhanceVisualDescription, enhanceVoiceOver } = await import('../services/geminiService');
            let enhancedText = "";
            
            if (field === 'visuals') {
                 enhancedText = await enhanceVisualDescription(currentText, brandKit, brandKit?.gemini_api_key);
            } else {
                 enhancedText = await enhanceVoiceOver(currentText, brandKit, brandKit?.gemini_api_key);
            }

            handleSceneUpdate(scriptIndex, sceneIndex, field, enhancedText);
        } catch (err: any) {
            console.error(err);
            setError(`Error al mejorar ${field}: ${err.message}`);
        } finally {
            setEnhancingFields(prev => ({ ...prev, [key]: false }));
        }
    }
    
    // --- AUDITION & DOWNLOAD LOGIC ---
    const handleAudition = async (scriptIndex: number, sceneIndex: number, text: string) => {
        if (!text) return;
        
        // Stop if already playing this scene
        if (playingSceneIndex === sceneIndex && audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
            setPlayingSceneIndex(null);
            return;
        }
        // Stop any other playing audio
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
            setPlayingSceneIndex(null);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        setIsAuditionLoading(prev => ({ ...prev, [sceneIndex]: true }));

        try {
            const base64Audio = await generateVoiceOver(text, selectedAuditionVoice, brandKit, brandKit?.gemini_api_key);
            
            // Initialize Web Audio API Context
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;

            // Convert base64 to array buffer for decoding
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
            
            // Use helper to create proper WAV blob (helps with header parsing issues in some browsers)
            const wavBlob = pcmToWavBlob(bytes, 24000, 1, 16);
            const arrayBuffer = await wavBlob.arrayBuffer();
            
            // Decode audio data
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Create Source
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            audioSourceRef.current = source;

            // Create Gain Node for Volume/Amplification
            const gainNode = ctx.createGain();
            const sceneVolume = generated_scripts[scriptIndex].script[sceneIndex].audio_volume ?? 1.0;
            gainNode.gain.value = sceneVolume; // Can be > 1.0 for amplification

            // Connect graph: Source -> Gain -> Speaker
            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.onended = () => { 
                setPlayingSceneIndex(null); 
            };
            
            source.start(0);
            setPlayingSceneIndex(sceneIndex);

        } catch (err: any) {
            console.error(err);
            setError(`Error en audición: ${err.message}`);
        } finally {
            setIsAuditionLoading(prev => ({ ...prev, [sceneIndex]: false }));
        }
    };

    const handleDownloadFullAudio = async () => {
        const script = generated_scripts[activeScriptIndex];
        if (!script) return;

        setIsLoading(true);
        setLoadingMessage(`Generando y mezclando audio completo (${script.script.length} escenas)...`);
        setError(null);

        try {
            const audioChunks: Int16Array[] = [];

            for (let i = 0; i < script.script.length; i++) {
                const scene = script.script[i];
                if (!scene.voiceOver) continue;

                try {
                    const base64Audio = await generateVoiceOver(scene.voiceOver, selectedAuditionVoice, brandKit, brandKit?.gemini_api_key);
                    
                    const binaryString = atob(base64Audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let j = 0; j < len; j++) { bytes[j] = binaryString.charCodeAt(j); }
                    const int16Data = new Int16Array(bytes.buffer);

                    const volume = scene.audio_volume ?? 1.0;
                    if (volume !== 1.0) {
                        for (let k = 0; k < int16Data.length; k++) {
                            let val = int16Data[k] * volume;
                            if (val > 32767) val = 32767;
                            if (val < -32768) val = -32768;
                            int16Data[k] = val;
                        }
                    }
                    
                    audioChunks.push(int16Data);

                } catch (chunkErr: any) {
                    console.error(`Failed to generate audio for scene ${i+1}`, chunkErr);
                    throw new Error(`Error en escena ${i+1}: ${chunkErr.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (audioChunks.length === 0) throw new Error("No hay audio para generar.");

            const mergedPcm = mergeInt16Arrays(audioChunks);
            
            const mergedUint8 = new Uint8Array(mergedPcm.buffer);
            const wavBlob = pcmToWavBlob(mergedUint8, 24000, 1, 16);
            
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${script.title.replace(/\s+/g, '_')}_FULL_AUDIO.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err: any) {
            console.error(err);
            setError("Error generando audio completo: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendToVeo = () => {
        if (!generated_scripts[activeScriptIndex]) return;
        const script = generated_scripts[activeScriptIndex];
        const fullPrompt = `Cinematic video about ${script.title}. ${script.script.map(s => s.visuals).join(' ')}`;
        setPendingVeoPrompt(fullPrompt);
        setCurrentView('creativeSuite');
    };

    const handleDownloadPack = async () => {
        if (!generated_scripts[activeScriptIndex]) return;
        setIsLoading(true);
        setLoadingMessage('Preparando descarga...');
        try {
             const scriptAudioUrls: { [key: number]: string } = {};
             await createSmartExportZip(
                 generated_scripts[activeScriptIndex].title,
                 [generated_scripts[activeScriptIndex]],
                 scriptAudioUrls,
                 { [0]: storyboardImages[activeScriptIndex] || {} }
             );
        } catch (e: any) {
            setError("Error al crear ZIP: " + e.message);
        } finally {
            setIsLoading(false);
        }
    }

    const handleContentRemix = async (format: 'Twitter Thread' | 'LinkedIn Post' | 'Blog Post' | 'Newsletter') => {
         if (!generated_scripts[activeScriptIndex]) return;
         setIsLoading(true);
         setLoadingMessage(`Creando Remix para ${format}...`);
         try {
             const { generateContentRemix } = await import('../services/geminiService');
             const scriptContent = generated_scripts[activeScriptIndex].script.map(s => `${s.voiceOver}`).join(' ');
             const remix = await generateContentRemix(scriptContent, format, brandKit, brandKit?.gemini_api_key);
             
             const { downloadTextFile } = await import('../services/utils');
             downloadTextFile(remix, `Remix_${format.replace(' ', '_')}.txt`);
         } catch (e: any) {
             setError("Error en Remix: " + e.message);
         } finally {
             setIsLoading(false);
         }
    }
    
    const openPreview = (scene: ScriptScene, scriptIndex: number, sceneIndex: number) => {
        setActiveScene(scene);
        const img = storyboardImages[scriptIndex]?.[sceneIndex];
        setActiveImage(img || null);
        setShowPreviewModal(true);
    }

    const [showTeleprompter, setShowTeleprompter] = useState(false);
    
    const TeleprompterModal = () => {
        const [speed, setSpeed] = useState(1);
        const [isPlaying, setIsPlaying] = useState(false);
        const scrollRef = React.useRef<HTMLDivElement>(null);
        
        useEffect(() => {
            let interval: any;
            if (isPlaying && scrollRef.current) {
                interval = setInterval(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop += speed;
                    }
                }, 30);
            }
            return () => clearInterval(interval);
        }, [isPlaying, speed]);

        return (
            <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col p-8 animate-fadeIn">
                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                    <button onClick={() => setShowTeleprompter(false)} className="text-gray-400 hover:text-white">✕ Salir</button>
                    <div className="flex gap-4 items-center">
                        <span className="text-sm text-gray-400">Velocidad</span>
                        <input type="range" min="1" max="5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-32 accent-purple-500" />
                        <button onClick={() => setIsPlaying(!isPlaying)} className={`px-6 py-2 rounded-full font-bold ${isPlaying ? 'bg-red-600' : 'bg-green-600'}`}>
                            {isPlaying ? 'PAUSA' : 'PLAY'}
                        </button>
                    </div>
                </div>
                <div 
                    ref={scrollRef}
                    className="flex-grow overflow-y-auto text-6xl font-bold leading-tight text-center px-20 scroll-smooth no-scrollbar"
                >
                    <div className="py-20">
                        {generated_scripts[activeScriptIndex]?.script.map((s, i) => (
                            <p key={i} className="mb-12">{s.voiceOver}</p>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            {showTeleprompter && <TeleprompterModal />}
            
            {/* ANIMATIC PLAYER MODAL */}
            {showAnimatic && (
                <AnimaticPlayer 
                    script={generated_scripts[activeScriptIndex].script} 
                    images={storyboardImages[activeScriptIndex] || {}} 
                    voiceId={selectedAuditionVoice} 
                    brandKit={brandKit}
                    onClose={() => setShowAnimatic(false)}
                />
            )}

            {/* Modal Espejo Viral */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setShowPreviewModal(false)}>
                    <div className="relative scale-90 md:scale-100 transition-transform" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowPreviewModal(false)}
                            className="absolute -right-12 top-0 text-white/50 hover:text-white transition-colors p-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="text-center text-white mb-4 font-bold text-lg drop-shadow-md">Previsualización Móvil</div>
                        <MobilePreviewer scene={activeScene} image={activeImage} />
                    </div>
                </div>
            )}

            {/* --- MODAL: AUDITORÍA (TERMÓMETRO VIRAL) --- */}
            {showAuditModal && generated_scripts[activeScriptIndex]?.viral_score && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowAuditModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowAuditModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >✕</button>
                        
                        <h3 className="text-2xl font-bold text-center text-white mb-6">Diagnóstico Viral</h3>
                        
                        <div className="flex justify-center mb-8">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 text-4xl font-bold ${generated_scripts[activeScriptIndex].viral_score!.score >= 80 ? 'border-green-500 text-green-400' : generated_scripts[activeScriptIndex].viral_score!.score >= 60 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
                                {generated_scripts[activeScriptIndex].viral_score!.score}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400">🪝 Gancho (Hook)</span>
                                <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full" style={{width: `${generated_scripts[activeScriptIndex].viral_score!.hookScore}%`}}></div>
                                </div>
                                <span className="font-mono text-white">{generated_scripts[activeScriptIndex].viral_score!.hookScore}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400">🥁 Ritmo (Pacing)</span>
                                <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{width: `${generated_scripts[activeScriptIndex].viral_score!.pacingScore}%`}}></div>
                                </div>
                                <span className="font-mono text-white">{generated_scripts[activeScriptIndex].viral_score!.pacingScore}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400">📣 CTA</span>
                                <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{width: `${generated_scripts[activeScriptIndex].viral_score!.ctaScore}%`}}></div>
                                </div>
                                <span className="font-mono text-white">{generated_scripts[activeScriptIndex].viral_score!.ctaScore}</span>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
                            <p className="text-sm text-slate-300 italic">"{generated_scripts[activeScriptIndex].viral_score!.critique}"</p>
                        </div>

                        <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/30">
                            <strong className="text-purple-300 text-xs uppercase block mb-1">Recomendación Clave:</strong>
                            <p className="text-sm text-white font-bold">{generated_scripts[activeScriptIndex].viral_score!.fixRecommendation}</p>
                        </div>
                    </div>
                </div>
            )}

             <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Analizador y Guionista IA</h2>
                    <p className="text-slate-400 mt-2">De idea o transcripción a guion viral en minutos.</p>
                </div>
                <button
                    onClick={handleSaveSession}
                    disabled={isSaving}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg border border-slate-600 shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isSaving ? '⏳' : '💾'} {isSaving ? 'Guardando...' : saveMessage || 'Guardar Sesión'}
                </button>
            </div>
            
            {/* 1. Input Section with TABS */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-700/50 bg-slate-900/30">
                    <button 
                        onClick={() => setInputMode('transcript')}
                        className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-colors ${inputMode === 'transcript' ? 'text-purple-400 bg-slate-800/50 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                    >
                        📝 Analizar Transcripción
                    </button>
                    <button 
                        onClick={() => setInputMode('idea')}
                        className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-colors ${inputMode === 'idea' ? 'text-pink-400 bg-slate-800/50 border-b-2 border-pink-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                    >
                        💡 Crear desde Idea / Brief
                    </button>
                </div>

                <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                        {inputMode === 'transcript' ? '1. Pega la transcripción del video original' : '1. Escribe tu Idea, Tema o Pega el Brief del Mentor'}
                    </h3>
                    <textarea 
                        value={original_transcript}
                        onChange={(e) => setOriginalTranscript(e.target.value)}
                        placeholder={inputMode === 'transcript' 
                            ? "Pega aquí la transcripción completa del video que quieres mejorar..." 
                            : "Ej: Un video sobre cómo el café afecta la productividad. Quiero que sea divertido y educativo. (O pega aquí lo que te dijo el Mentor IA)"}
                        className="w-full h-40 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white resize-none"
                    />
                    <div className="flex justify-end mt-4">
                        {inputMode === 'transcript' ? (
                            <button 
                                onClick={handleAnalyze} 
                                disabled={isLoading || !original_transcript.trim()}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                            >
                                {isLoading ? 'Procesando...' : 'Analizar Video'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => { 
                                    if(!original_transcript.trim()) return;
                                    setAnalysis({
                                        hook: "Análisis omitido (Modo Idea)",
                                        thematicInterest: "N/A",
                                        contentStructure: "N/A",
                                        retentionStrategies: "N/A",
                                        editingQuality: "N/A",
                                        narrativeRhythm: "N/A"
                                    });
                                }}
                                disabled={isLoading || !original_transcript.trim()}
                                className="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-2 px-6 rounded-lg hover:from-pink-500 hover:to-rose-500 transition-all disabled:opacity-50 shadow-lg shadow-pink-500/20"
                            >
                                Continuar a Estrategia →
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Analysis Results & Strategy Selector */}
            {analysis && (
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">2. Estrategia & Diagnóstico</h3>
                    </div>

                    {/* Only show diagnosis if in Transcript mode */}
                    {inputMode === 'transcript' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-8">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                                <strong className="text-purple-400 block mb-1">Gancho (Hook)</strong>
                                <p className="text-slate-300">{analysis.hook}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                                <strong className="text-purple-400 block mb-1">Retención</strong>
                                <p className="text-slate-300">{analysis.retentionStrategies}</p>
                            </div>
                        </div>
                    )}

                    {/* Strategy Selector */}
                    {!generated_scripts.length && (
                        <div className="space-y-4 mb-6">
                             <h4 className="text-sm uppercase font-bold text-slate-500 tracking-wider mb-2">Selecciona tu Fórmula Viral:</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div 
                                    onClick={() => setSelectedStrategy('direct')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedStrategy === 'direct' ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">⚡</span>
                                        <h5 className="font-bold text-white">Valor Directo</h5>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">Ideal para educación rápida, tips y hacks.</p>
                                    <div className="flex gap-1 text-[10px] font-mono text-slate-500">
                                        <span className="bg-slate-800 px-2 py-1 rounded">GANCHO</span>
                                        <span>→</span>
                                        <span className="bg-slate-800 px-2 py-1 rounded">VALOR</span>
                                        <span>→</span>
                                        <span className="bg-slate-800 px-2 py-1 rounded">CTA</span>
                                    </div>
                                 </div>

                                 <div 
                                    onClick={() => setSelectedStrategy('retention')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedStrategy === 'retention' ? 'border-pink-500 bg-pink-900/20' : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🌀</span>
                                        <h5 className="font-bold text-white">Alta Retención</h5>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">Ideal para storytelling y entretenimiento. ¡Incluye Plot Twist!</p>
                                    <div className="flex gap-1 text-[10px] font-mono text-slate-500">
                                        <span className="bg-slate-800 px-2 py-1 rounded">DOLOR</span>
                                        <span>→</span>
                                        <span className="bg-pink-900/50 text-pink-300 px-2 py-1 rounded border border-pink-500/30">GIRO</span>
                                        <span>→</span>
                                        <span className="bg-slate-800 px-2 py-1 rounded">CTA</span>
                                    </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {!generated_scripts.length && (
                         <div className="text-right">
                            <button 
                            onClick={handleGenerateScripts} 
                            disabled={isLoading}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20 transform hover:-translate-y-1"
                        >
                            {isLoading ? 'Generando...' : (inputMode === 'transcript' ? 'Generar Guion Mejorado' : 'Generar Guion Viral')}
                        </button>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Generated Scripts & Storyboard (Full View) */}
            {generated_scripts.length > 0 && (
                <div className="mt-8">
                    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl animate-fadeIn">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="text-xl font-bold text-white">3. Guiones Virales & Storyboard</h3>
                            
                            {/* SCRIPT SELECTOR - ONLY IF MORE THAN 1 */}
                            {generated_scripts.length > 1 && (
                                <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg">
                                    {generated_scripts.map((script, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveScriptIndex(idx)}
                                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeScriptIndex === idx ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Opción {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Script Editor Actions */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-700/50 pb-4">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-semibold text-purple-300">{generated_scripts[activeScriptIndex].title}</h4>
                                    
                                    {/* VIRAL THERMOMETER (Audit) */}
                                    <button 
                                        onClick={handleAudit}
                                        disabled={isAuditing}
                                        className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold transition-colors bg-slate-900 hover:bg-slate-800 border-purple-500/50 text-purple-300 group"
                                        title="Auditar Calidad del Guion (1 Crédito)"
                                    >
                                        {isAuditing ? <span className="animate-spin">⏳</span> : <span>🌡️</span>}
                                        {generated_scripts[activeScriptIndex].viral_score ? (
                                            <span>{generated_scripts[activeScriptIndex].viral_score?.score}/100</span>
                                        ) : (
                                            <span>Auditar</span>
                                        )}
                                    </button>

                                    {/* DIRECTOR'S STOPWATCH */}
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono font-bold transition-colors ${isOverLimit ? 'bg-red-900/50 text-red-400 border-red-500/50 animate-pulse' : 'bg-slate-900 text-green-400 border-green-500/30'}`} title={isOverLimit ? "¡Alerta! Excede 60s (Límite TikTok/Shorts)" : "Duración estimada óptima"}>
                                        <span>⏱️</span>
                                        <span>{totalDuration}s</span>
                                    </div>
                                </div>
                                
                                {/* Voice Selector for Audition */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                                        <span className="text-[10px] text-slate-400 pl-2 uppercase font-bold">Voz Audición:</span>
                                        <select 
                                            value={selectedAuditionVoice} 
                                            onChange={(e) => setSelectedAuditionVoice(e.target.value)}
                                            className="bg-transparent text-xs text-white font-medium p-1 focus:outline-none cursor-pointer"
                                        >
                                            {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id} className="bg-slate-800">{v.name}</option>)}
                                        </select>
                                    </div>
                                    
                                    <button
                                        onClick={handleDownloadFullAudio}
                                        disabled={isLoading}
                                        className="bg-slate-700 hover:bg-green-600 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors border border-slate-600 hover:border-green-500/50 flex items-center justify-center gap-1"
                                    >
                                        ⬇️ Descargar Audio Completo
                                    </button>
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                    
                                    {/* Remix Dropdown */}
                                    <div className="relative group">
                                        <button className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-cyan-500/30 flex items-center gap-1">
                                            <span>📢</span> Remix
                                        </button>
                                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-20">
                                            {['Twitter Thread', 'LinkedIn Post', 'Blog Post', 'Newsletter'].map((format) => (
                                                <button 
                                                    key={format}
                                                    onClick={() => handleContentRemix(format as any)}
                                                    className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                                >
                                                    {format}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ANIMATIC BUTTON */}
                                    <button 
                                        onClick={() => setShowAnimatic(true)}
                                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-lg shadow-red-500/20 flex items-center gap-1"
                                    >
                                        <span>▶️</span> Modo Cine
                                    </button>

                                    <button 
                                        onClick={() => setShowTeleprompter(true)}
                                        className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-lg shadow-fuchsia-500/20 flex items-center gap-1"
                                    >
                                        <span>📺</span> Teleprompter
                                    </button>

                                    <button 
                                        onClick={() => handleGeneratePrompts(activeScriptIndex)} 
                                        disabled={isLoading}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-1"
                                    >
                                        <span>🎨</span> Prompts
                                    </button>
                                    <button 
                                        onClick={handleSendToVeo}
                                        className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-lg shadow-pink-500/20 flex items-center gap-1"
                                    >
                                        <span>🎥</span> VEO
                                    </button>
                                    <button 
                                        onClick={handleDownloadPack}
                                        className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-slate-600 flex items-center gap-1"
                                    >
                                        <span>📦</span> Pack
                                    </button>
                                    {/* PDF EXPORT BUTTON */}
                                    <button 
                                        onClick={handlePdfExport}
                                        className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-slate-600 flex items-center gap-1"
                                        title="Exportar Claqueta de Rodaje (PDF)"
                                    >
                                        <span>📄</span> PDF
                                    </button>
                                    <button 
                                        onClick={() => setCurrentView('performance')}
                                        className="bg-green-800/50 hover:bg-green-700/50 text-green-300 text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-green-700/50 flex items-center gap-1"
                                    >
                                        <span>🚀</span> Ir a Rendimiento
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {generated_scripts[activeScriptIndex].script.map((scene, sIdx) => (
                                    <div 
                                        key={sIdx} 
                                        className={`bg-slate-900/40 border p-3 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-start transition-all ${activeScene?.scene === scene.scene ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-slate-700/50'}`}
                                    >
                                        {/* 1. Scene Index & Reorder Controls */}
                                        <div className="lg:col-span-1 flex flex-col items-center justify-center gap-1 pt-4">
                                            <span className={`font-bold w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-colors ${activeScene?.scene === scene.scene ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                {scene.scene}
                                            </span>
                                            <div className="flex flex-col">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleMoveScene(activeScriptIndex, sIdx, 'up'); }}
                                                    disabled={sIdx === 0}
                                                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed"
                                                >
                                                    ⬆️
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleMoveScene(activeScriptIndex, sIdx, 'down'); }}
                                                    disabled={sIdx === generated_scripts[activeScriptIndex].script.length - 1}
                                                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed"
                                                >
                                                    ⬇️
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* 2. Visual Description */}
                                        <div className="lg:col-span-3">
                                            <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 flex justify-between items-center">
                                                <span>Visual</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEnhanceField(activeScriptIndex, sIdx, 'visuals'); }}
                                                    disabled={enhancingFields[`${activeScriptIndex}-${sIdx}-visuals`]}
                                                    className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    {enhancingFields[`${activeScriptIndex}-${sIdx}-visuals`] ? '...' : '✨ Mejorar'}
                                                </button>
                                            </label>
                                            <textarea 
                                                value={scene.visuals}
                                                onChange={(e) => handleSceneUpdate(activeScriptIndex, sIdx, 'visuals', e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg focus:border-purple-500 focus:outline-none text-slate-300 text-xs p-2 resize-none h-full min-h-[100px]"
                                            />
                                        </div>
                                        
                                        {/* 3. Audio / VoiceOver */}
                                        <div className="lg:col-span-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[9px] uppercase font-bold text-slate-500">Voz en Off</label>
                                                    {/* SHADOWBAN SHIELD */}
                                                    <ShadowbanShield text={scene.voiceOver} />
                                                    {/* Per-Scene Timing */}
                                                    <span className="text-[9px] font-mono text-slate-600 bg-slate-900 px-1 rounded" title="Duración estimada">
                                                        ~{estimateDuration(scene.voiceOver)}s
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {/* Volume Slider */}
                                                    <div className="flex items-center gap-1 group" title={`Volumen: ${Math.round((scene.audio_volume || 1) * 100)}%`}>
                                                        <span className="text-[8px] text-slate-500">🔊</span>
                                                        <input 
                                                            type="range" 
                                                            min="0.5" 
                                                            max="1.5" 
                                                            step="0.1"
                                                            value={scene.audio_volume ?? 1.0}
                                                            onChange={(e) => handleSceneUpdate(activeScriptIndex, sIdx, 'audio_volume', parseFloat(e.target.value))}
                                                            className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                        />
                                                    </div>

                                                    {/* Audition Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAudition(activeScriptIndex, sIdx, scene.voiceOver); }}
                                                        disabled={isAuditionLoading[sIdx]}
                                                        className={`text-[9px] flex items-center gap-1 transition-colors disabled:opacity-50 px-2 py-0.5 rounded ${playingSceneIndex === sIdx ? 'bg-red-900/50 text-red-300 animate-pulse' : 'bg-slate-800 text-green-400 hover:bg-slate-700'}`}
                                                        title="Audición Instantánea"
                                                    >
                                                        {isAuditionLoading[sIdx] ? (
                                                            <span className="animate-spin">⏳</span> 
                                                        ) : playingSceneIndex === sIdx ? (
                                                            <span>⏹️ Stop</span>
                                                        ) : (
                                                            <span>▶️ Play</span>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEnhanceField(activeScriptIndex, sIdx, 'voiceOver'); }}
                                                        disabled={enhancingFields[`${activeScriptIndex}-${sIdx}-voiceOver`]}
                                                        className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {enhancingFields[`${activeScriptIndex}-${sIdx}-voiceOver`] ? '...' : '✨'}
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea 
                                                value={scene.voiceOver}
                                                onChange={(e) => handleSceneUpdate(activeScriptIndex, sIdx, 'voiceOver', e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg focus:border-purple-500 focus:outline-none text-slate-300 text-xs p-2 resize-none h-full min-h-[100px]"
                                            />
                                        </div>

                                        {/* 4. Prompt Input (Editable) */}
                                        <div className="lg:col-span-3 flex flex-col h-full">
                                             <label className="text-[9px] uppercase font-bold text-purple-500/70 block mb-1 flex justify-between">
                                                <span>Prompt Imagen</span>
                                                <button
                                                    className="text-[9px] text-purple-300 hover:text-purple-100 underline disabled:opacity-50 flex items-center gap-1"
                                                    disabled={enhancingPrompts[sIdx]}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setEnhancingPrompts(prev => ({...prev, [sIdx]: true}));
                                                        // Use existing prompt OR scene visuals if prompt is empty
                                                        const sourceText = image_prompts[activeScriptIndex]?.[sIdx] || scene.visuals;
                                                        
                                                        if (!sourceText) {
                                                            setEnhancingPrompts(prev => ({...prev, [sIdx]: false}));
                                                            return;
                                                        }

                                                        try {
                                                            const { enhancePromptForVideo } = await import('../services/geminiService');
                                                            const enhanced = await enhancePromptForVideo(sourceText, brandKit, brandKit?.gemini_api_key);
                                                            handlePromptChange(activeScriptIndex, sIdx, enhanced);
                                                        } catch(err) { console.error(err); }
                                                        finally { setEnhancingPrompts(prev => ({...prev, [sIdx]: false})); }
                                                    }}
                                                >
                                                    {enhancingPrompts[sIdx] ? 'Mejorando...' : '✨ Mejorar IA'}
                                                </button>
                                             </label>
                                             <textarea
                                                value={image_prompts[activeScriptIndex]?.[sIdx] || ''}
                                                onChange={(e) => handlePromptChange(activeScriptIndex, sIdx, e.target.value)}
                                                className="w-full bg-slate-950/50 border border-purple-900/30 rounded-lg focus:border-purple-500 focus:outline-none text-slate-400 text-xs p-2 resize-none flex-grow min-h-[100px]"
                                                placeholder={scene.visuals ? "Haz clic en ✨ Mejorar IA para generar un prompt basado en el Visual..." : "Escribe un prompt o mejora el visual..."}
                                            />
                                        </div>

                                        {/* 5. Image Preview & Actions */}
                                        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-2 h-full pt-4">
                                            <div 
                                                className="relative group w-full flex justify-center cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPreview(scene, activeScriptIndex, sIdx);
                                                }}
                                                title="Clic para ver en Espejo Viral"
                                            >
                                                <div className={`aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden border max-h-[100px] w-[60px] relative shadow-lg transition-all ${storyboardImages[activeScriptIndex]?.[sIdx] ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700 hover:border-purple-400'}`}>
                                                    {storyboardImages[activeScriptIndex]?.[sIdx] ? (
                                                        <img 
                                                            src={storyboardImages[activeScriptIndex][sIdx]} 
                                                            className="w-full h-full object-cover"
                                                            alt={`Storyboard ${sIdx}`}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-[8px] p-1 text-center bg-slate-900/80 gap-1">
                                                            <span className="text-base">🖼️</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Generate Button Overlay or View Icon */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                                        {!storyboardImages[activeScriptIndex]?.[sIdx] ? (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleGenerateImage(activeScriptIndex, sIdx, image_prompts[activeScriptIndex]?.[sIdx] || scene.visuals);
                                                                }}
                                                                disabled={generatingImages[`${activeScriptIndex}-${sIdx}`]}
                                                                className="text-[8px] font-bold text-white bg-green-600 hover:bg-green-500 px-2 py-1 rounded shadow-lg"
                                                            >
                                                                {generatingImages[`${activeScriptIndex}-${sIdx}`] ? '...' : 'Crear'}
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Force regeneration
                                                                    handleGenerateImage(activeScriptIndex, sIdx, image_prompts[activeScriptIndex]?.[sIdx] || scene.visuals);
                                                                }}
                                                                disabled={generatingImages[`${activeScriptIndex}-${sIdx}`]}
                                                                className="bg-white/20 hover:bg-white/40 text-white p-1 rounded-full backdrop-blur-sm transition-colors mb-1"
                                                                title="Regenerar Imagen"
                                                            >
                                                                 {generatingImages[`${activeScriptIndex}-${sIdx}`] ? (
                                                                    <span className="animate-spin block text-xs">⏳</span> 
                                                                 ) : (
                                                                    <span className="text-xs block">🔄</span>
                                                                 )}
                                                            </button>
                                                        )}
                                                        <span className="text-white text-xs drop-shadow-md">👁️</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* VEO Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingVeoPrompt(image_prompts[activeScriptIndex]?.[sIdx] || scene.visuals);
                                                    setCurrentView('creativeSuite');
                                                }}
                                                className="w-[60px] bg-pink-900/20 hover:bg-pink-900/40 text-pink-300 text-[8px] font-bold py-1 rounded border border-pink-500/30 transition-colors flex items-center justify-center"
                                            >
                                                🎥 VEO
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- HOOK LAB (Laboratorio de Ganchos) --- */}
                    <div className="mt-8 bg-slate-900/80 border border-purple-500/30 p-6 rounded-2xl shadow-2xl animate-fadeIn relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span>🧪</span> Laboratorio de Ganchos
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">Optimiza los primeros 3 segundos para maximizar la retención. (1 Crédito)</p>
                            </div>
                            <button 
                                onClick={handleGenerateHooks}
                                disabled={isGeneratingHooks}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGeneratingHooks ? 'Analizando...' : '🪝 Generar 3 Variantes'}
                            </button>
                        </div>

                        {generated_scripts[activeScriptIndex].hook_variations && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                {generated_scripts[activeScriptIndex].hook_variations.map((variant, i) => (
                                    <div key={i} className="bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 p-5 rounded-xl transition-all group flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${variant.type === 'Curiosidad' ? 'bg-blue-900/30 text-blue-400' : variant.type === 'Polémica' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                                {variant.type}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-3 flex-grow">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Voz en Off</p>
                                                <p className="text-sm text-white italic">"{variant.voiceOver}"</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Visual</p>
                                                <p className="text-xs text-slate-300">{variant.visuals}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-2 rounded text-[10px] text-slate-400 border border-slate-800">
                                                💡 {variant.explanation}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleApplyHook(variant)}
                                            className="mt-4 w-full bg-slate-700 hover:bg-purple-600 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-slate-600 hover:border-purple-500"
                                        >
                                            Aplicar a Escena 1
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {isLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"><Loader message={loadingMessage} /></div>}
            {error && <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 text-white p-4 rounded-xl shadow-xl max-w-md animate-slideIn z-50">{error}</div>}
        </div>
    );
};

export default VideoAnalyzerView;
