
/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { generateVoiceOver, generateImageWithImagen, generateImageWithNano, generateVideoWithVeo, generateSocialMetadata, enhancePromptForVideo, extractVisualStyle, generateThumbnailPrompt } from '../services/geminiService';
import Loader from './common/Loader';
import { pcmToWavBlob, fileToBase64 } from '../services/utils';
import { useSessionStore, useAppStore } from '../store/appStore';
import ApiKeyModal from './ApiKeyModal';
import { supabase } from '../services/supabaseClient';
import FileUpload from './common/FileUpload';

const availableVoices = [
    { id: 'Zephyr', name: 'Zephyr (Femenina, Amistosa)' },
    { id: 'Puck', name: 'Puck (Masculina, Enérgica)' },
    { id: 'Leda', name: 'Leda (Femenina, Narrativa)' },
    { id: 'Orus', name: 'Orus (Masculina, Autoritaria)' },
    { id: 'Kore', name: 'Kore (Femenina, Calma)' },
    { id: 'Charon', name: 'Charon (Masculina, Profunda)' },
    { id: 'Fenrir', name: 'Fenrir (Masculina, Madura)' },
    { id: 'Umbriel', name: 'Umbriel (Masculina, Seria)' },
    { id: 'Alnilam', name: 'Alnilam (Femenina, Profesional)' },
    { id: 'Schedar', name: 'Schedar (Masculina, Calma)' },
];

const STYLE_PRESETS = [
    "Cinematic Lighting", "Cyberpunk", "Minimalist", "Studio Ghibli Style", 
    "Photorealistic 8k", "Vintage Film", "3D Render Octane", "Neon Noir", "Pastel Dream"
];

const getFriendlyErrorMessage = (error: any): string => {
    const msg = error.message || JSON.stringify(error);
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
        return "🛑 Cuota excedida (Error 429). Tu API Key ha alcanzado su límite gratuito para este modelo. Intenta habilitar la facturación en Google AI Studio.";
    }
    if (msg.includes("API Key faltante")) {
        return "🔑 Falta la API Key. Configúrala en la sección 'Marca' (Brand Kit).";
    }
    return msg;
};

// --- THUMBNAIL EDITOR COMPONENT ---
interface TextLayer {
    id: number;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    rotation: number;
}

const ThumbnailEditor: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [texts, setTexts] = useState<TextLayer[]>([
        { id: 1, text: "TÍTULO VIRAL", x: 50, y: 100, fontSize: 60, color: "#FFFF00", rotation: 0 }
    ]);
    const [selectedId, setSelectedId] = useState<number | null>(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Load Image
    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imageRef.current = img;
            draw();
        };
    }, [imageUrl]);

    // Redraw Canvas whenever state changes
    useEffect(() => {
        draw();
    }, [texts, selectedId]);

    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !imageRef.current) return;

        // Clear and Draw Image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

        // Draw Texts
        texts.forEach(layer => {
            ctx.save();
            ctx.translate(layer.x, layer.y);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            
            ctx.font = `900 ${layer.fontSize}px Impact, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Stroke (Outline)
            ctx.lineWidth = layer.fontSize / 15;
            ctx.strokeStyle = 'black';
            ctx.strokeText(layer.text, 0, 0);

            // Fill
            ctx.fillStyle = layer.color;
            ctx.fillText(layer.text, 0, 0);

            // Selection Box
            if (selectedId === layer.id) {
                const metrics = ctx.measureText(layer.text);
                const w = metrics.width;
                const h = layer.fontSize; // approx
                ctx.strokeStyle = '#A855F7'; // Purple
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-w/2 - 10, -h/2, w + 20, h + 10);
                ctx.setLineDash([]);
            }

            ctx.restore();
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        // Scale mouse coordinates to canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Simple hit detection (reverse order to pick top layer)
        for (let i = texts.length - 1; i >= 0; i--) {
            const layer = texts[i];
            // Approx bounding box logic
            const w = (layer.text.length * layer.fontSize) / 2; // rough estimate for Impact
            const h = layer.fontSize;
            
            if (
                mouseX >= layer.x - w/2 && 
                mouseX <= layer.x + w/2 && 
                mouseY >= layer.y - h/2 && 
                mouseY <= layer.y + h/2
            ) {
                setSelectedId(layer.id);
                setIsDragging(true);
                setDragOffset({ x: mouseX - layer.x, y: mouseY - layer.y });
                return;
            }
        }
        // Deselect if clicked outside
        setSelectedId(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || selectedId === null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        setTexts(prev => prev.map(t => 
            t.id === selectedId ? { ...t, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } : t
        ));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const updateSelectedText = (updates: Partial<TextLayer>) => {
        if (selectedId === null) return;
        setTexts(prev => prev.map(t => t.id === selectedId ? { ...t, ...updates } : t));
    };

    const addText = () => {
        const newId = Date.now();
        setTexts([...texts, { id: newId, text: "TEXTO", x: 200, y: 200, fontSize: 50, color: "#FFFFFF", rotation: 0 }]);
        setSelectedId(newId);
    };

    const deleteText = () => {
        if (selectedId === null) return;
        setTexts(prev => prev.filter(t => t.id !== selectedId));
        setSelectedId(null);
    };

    const downloadComposition = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Temporarily deselect to remove selection box
        const currentSelected = selectedId;
        setSelectedId(null);
        setTimeout(() => {
            // Force redraw without selection box
            draw();
            const link = document.createElement('a');
            link.download = 'viral_thumbnail_edited.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            setSelectedId(currentSelected); // Restore selection
        }, 50);
    };

    const selectedLayer = texts.find(t => t.id === selectedId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden shadow-2xl max-h-[90vh]">
                
                {/* CANVAS AREA */}
                <div className="flex-grow bg-black/50 flex items-center justify-center p-4 overflow-auto relative">
                    <canvas 
                        ref={canvasRef} 
                        width={1280} 
                        height={720} 
                        className="max-w-full max-h-full shadow-2xl cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
                        Arrastra el texto para moverlo
                    </div>
                </div>

                {/* SIDEBAR CONTROLS */}
                <div className="w-full md:w-80 bg-slate-800 border-l border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold">Estudio de Titulares</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={addText} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-xs font-bold">
                            + Texto
                        </button>
                        <button onClick={() => updateSelectedText({ text: selectedLayer ? selectedLayer.text + " 😱" : "😱" })} className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded text-xs">
                            😱
                        </button>
                        <button onClick={() => updateSelectedText({ text: selectedLayer ? selectedLayer.text + " 🔥" : "🔥" })} className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded text-xs">
                            🔥
                        </button>
                    </div>

                    {selectedLayer ? (
                        <div className="space-y-4 border-t border-slate-700 pt-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">Contenido</label>
                                <input 
                                    type="text" 
                                    value={selectedLayer.text} 
                                    onChange={(e) => updateSelectedText({ text: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mt-1"
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">Color</label>
                                <div className="flex gap-2 mt-1">
                                    {['#FFFF00', '#FFFFFF', '#FF0000', '#00FF00', '#00FFFF', '#FF00FF'].map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => updateSelectedText({ color: c })}
                                            className={`w-6 h-6 rounded-full border-2 ${selectedLayer.color === c ? 'border-white' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">Tamaño: {selectedLayer.fontSize}px</label>
                                <input 
                                    type="range" min="20" max="200" 
                                    value={selectedLayer.fontSize}
                                    onChange={(e) => updateSelectedText({ fontSize: parseInt(e.target.value) })}
                                    className="w-full mt-1 accent-purple-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">Rotación: {selectedLayer.rotation}°</label>
                                <input 
                                    type="range" min="-45" max="45" 
                                    value={selectedLayer.rotation}
                                    onChange={(e) => updateSelectedText({ rotation: parseInt(e.target.value) })}
                                    className="w-full mt-1 accent-purple-500"
                                />
                            </div>

                            <button onClick={deleteText} className="w-full border border-red-500/50 text-red-400 hover:bg-red-900/20 py-2 rounded text-xs font-bold">
                                Eliminar Texto Seleccionado
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-10 text-sm italic">
                            Selecciona un texto en la imagen para editarlo.
                        </div>
                    )}

                    <div className="mt-auto pt-6 border-t border-slate-700">
                        <button onClick={downloadComposition} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/20">
                            ⬇️ Descargar Miniatura Final
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const VoiceOverGenerator: React.FC = () => {
    const [script, setScript] = useState('');
    const [voiceName, setVoiceName] = useState('Zephyr');
    const [audioUrl, setAudioUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { setGeneratedAudioBase64 } = useSessionStore();
    const brandKit = useAppStore(state => state.brandKit);

    const handleGenerate = async () => {
        if (!script) { setError('Por favor, ingresa un guión.'); return; }
        setIsLoading(true); setError(''); setAudioUrl('');
        try {
            const audioBase64 = await generateVoiceOver(script, voiceName, brandKit, brandKit?.gemini_api_key);
            setGeneratedAudioBase64(audioBase64);
            const pcmData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
            const audioBlob = pcmToWavBlob(pcmData, 24000, 1, 16);
            setAudioUrl(URL.createObjectURL(audioBlob));
        } catch (err: any) { console.error(err); setError(getFriendlyErrorMessage(err)); } finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Generador de Voz en Off</h3>
            </div>
            <textarea 
                value={script} 
                onChange={(e) => setScript(e.currentTarget.value)} 
                placeholder="Escribe aquí el guión..." 
                className="w-full h-40 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white resize-none" 
            />
            <select 
                value={voiceName} 
                onChange={(e) => setVoiceName(e.currentTarget.value)} 
                className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
                {availableVoices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3.5 px-4 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none transition-all">
                {isLoading ? 'Generando...' : 'Generar Voz'}
            </button>
            {error && <p className="text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-lg">{error}</p>}
            {audioUrl && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <audio controls src={audioUrl} className="w-full" />
                </div>
            )}
        </div>
    );
};

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [numberOfImages, setNumberOfImages] = useState<number>(1);
    const [aspectRatio, setAspectRatio] = useState<string>('9:16');
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isExtractingStyle, setIsExtractingStyle] = useState(false);
    const [showEyeOfHorus, setShowEyeOfHorus] = useState(false);
    const [error, setError] = useState('');
    const { setGeneratedImages } = useSessionStore();
    const { brandKit, credits, deductCredits } = useAppStore();

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) {
             setError('Escribe una idea básica primero para poder mejorarla.');
             return;
        }
        if (credits < 1) {
             setError('Necesitas al menos 1 crédito para usar el Alquimista de Prompts.');
             return;
        }

        setIsEnhancing(true);
        setError('');
        try {
            const enhanced = await enhancePromptForVideo(prompt, brandKit, brandKit?.gemini_api_key);
            setPrompt(enhanced);
            deductCredits(1);
        } catch (err: any) {
            console.error(err);
            setError('Error mejorando el prompt. Intenta de nuevo.');
        } finally {
            setIsEnhancing(false);
        }
    }
    
    const handleEyeOfHorus = async (file: File) => {
        setIsExtractingStyle(true);
        setError('');
        setShowEyeOfHorus(false);
        try {
            const base64 = await fileToBase64(file);
            const styleDescription = await extractVisualStyle(base64, brandKit?.gemini_api_key);
            setPrompt(prev => prev ? `${prev}, ${styleDescription}` : styleDescription);
        } catch (err: any) {
            console.error(err);
            setError('Error analizando la imagen. ' + err.message);
        } finally {
            setIsExtractingStyle(false);
        }
    };
    
    const addStylePreset = (style: string) => {
        setPrompt(prev => {
            if (prev.includes(style)) return prev;
            return prev.trim() ? `${prev.trim()}, ${style}` : style;
        });
    };

    const handleGenerate = async (model: 'imagen' | 'nano') => {
        if (!prompt) { setError('Por favor, ingresa un prompt.'); return; }
        
        const costPerImage = model === 'imagen' ? 10 : 1;
        const totalCost = costPerImage * numberOfImages;

        if (credits < totalCost) {
            setError(`Créditos insuficientes. Necesitas ${totalCost}, tienes ${credits}.`);
            return;
        }

        setIsLoading(true); setError(''); setImageUrls([]);
        try {
            const imagesBase64 = model === 'imagen'
                ? await generateImageWithImagen(prompt, numberOfImages, brandKit?.visual_style, aspectRatio, brandKit?.gemini_api_key)
                : await generateImageWithNano(prompt, numberOfImages, brandKit?.visual_style, aspectRatio, brandKit?.gemini_api_key);
            
            deductCredits(totalCost);
            const urls = imagesBase64.map(base64 => `data:image/jpeg;base64,${base64}`);
            setImageUrls(urls); setGeneratedImages(urls);
        } catch (err: any) { console.error(err); setError(getFriendlyErrorMessage(err)); } finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Generador de Imágenes</h3>
                {brandKit?.visual_style && <span className="text-xs text-green-400 border border-green-600/50 px-2 py-1 rounded bg-green-900/20">Estilo de Marca Activo</span>}
            </div>
            
            {/* Style Chips & Eye of Horus */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                 <button
                    onClick={() => setShowEyeOfHorus(!showEyeOfHorus)}
                    className={`text-xs flex items-center gap-1 border px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${isExtractingStyle ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/50'}`}
                >
                    👁️ {isExtractingStyle ? 'Analizando...' : 'Ojo de Horus'}
                </button>
                {STYLE_PRESETS.map(style => (
                    <button
                        key={style}
                        onClick={() => addStylePreset(style)}
                        className="text-xs bg-slate-800 hover:bg-purple-900/50 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-500/50 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
                    >
                        + {style}
                    </button>
                ))}
            </div>
            
            {showEyeOfHorus && (
                <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl animate-fadeIn">
                    <p className="text-xs text-purple-200 mb-2">Sube una imagen de referencia y la IA extraerá su estilo visual (iluminación, colores, cámara) para aplicarlo a tu prompt.</p>
                    <FileUpload onFileUpload={handleEyeOfHorus} acceptedFileTypes="image/*" label="Arrastra tu referencia aquí" />
                </div>
            )}

            <div className="relative">
                <input 
                    type="text" 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.currentTarget.value)} 
                    placeholder="Ej: Un astronauta tocando el piano..." 
                    className="w-full p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl pr-14 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-500" 
                />
                <button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt.trim()}
                    className="absolute top-2 right-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg transition-all disabled:bg-slate-700 flex items-center justify-center"
                    title="Alquimista de Prompts: Mejorar con IA (1 Crédito)"
                 >
                    {isEnhancing ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <span>✨</span>
                    )}
                 </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <select value={numberOfImages} onChange={(e) => setNumberOfImages(parseInt(e.currentTarget.value))} className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none"><option value={1}>1 Imagen</option><option value={3}>3 Imágenes</option></select>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.currentTarget.value)} className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none"><option value="9:16">Vertical (9:16)</option><option value="16:9">Horizontal (16:9)</option></select>
            </div>
            <div className="flex gap-4">
                <button onClick={() => handleGenerate('nano')} disabled={isLoading} className="flex-1 py-3.5 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-200 hover:text-white rounded-xl font-bold border border-yellow-500/30 transition-all disabled:opacity-50">
                    Rápido (1 Crédito)
                </button>
                <button onClick={() => handleGenerate('imagen')} disabled={isLoading} className="flex-1 py-3.5 bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-white rounded-xl font-bold border border-amber-500/30 transition-all disabled:opacity-50">
                    PRO (10 Créditos)
                </button>
            </div>
            {isLoading && <Loader message="Creando..." />}
            {error && <p className="text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-lg">{error}</p>}
            <div className="grid grid-cols-2 gap-4">{imageUrls.map((url, i) => <div key={i} className="rounded-xl overflow-hidden border border-slate-700"><img src={url} className="w-full h-full object-cover" /></div>)}</div>
        </div>
    );
};

const ThumbnailGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const { brandKit, credits, deductCredits } = useAppStore();

    const handleGenerate = async () => {
        if (!topic.trim()) { setError('Escribe el gancho o título del video.'); return; }
        if (credits < 10) { setError('Créditos insuficientes. Necesitas 10 créditos.'); return; }

        setIsLoading(true); setError(''); setImageUrls([]);
        try {
            // 1. Generate optimized prompt
            const prompt = await generateThumbnailPrompt(topic, brandKit?.gemini_api_key);
            
            // 2. Generate Image (Always Imagen PRO for thumbnails for text rendering capability)
            const imagesBase64 = await generateImageWithImagen(prompt, 2, null, '16:9', brandKit?.gemini_api_key);
            
            deductCredits(10);
            const urls = imagesBase64.map(base64 => `data:image/jpeg;base64,${base64}`);
            setImageUrls(urls);
        } catch (err: any) {
            console.error(err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {editingImage && (
                <ThumbnailEditor 
                    imageUrl={editingImage} 
                    onClose={() => setEditingImage(null)} 
                />
            )}

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">La Portada Magnética 🧲</h3>
            </div>
            <p className="text-sm text-slate-400">Genera miniaturas de alto CTR optimizadas para YouTube. La IA creará expresiones exageradas y composiciones llamativas.</p>
            
            <div className="relative">
                <input 
                    type="text" 
                    value={topic} 
                    onChange={(e) => setTopic(e.currentTarget.value)} 
                    placeholder="Título o Gancho del video (Ej: ¡Probé la pizza más picante!)" 
                    className="w-full p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none text-white" 
                />
            </div>

            <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-bold text-white shadow-lg shadow-red-500/25 transition-all disabled:opacity-50">
                {isLoading ? 'Diseñando Miniaturas...' : 'Generar Portadas Magnéticas (10 Créditos)'}
            </button>
            
            {error && <p className="text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-lg">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {imageUrls.map((url, i) => (
                    <div key={i} className="space-y-2">
                        <div className="rounded-xl overflow-hidden border border-slate-700 shadow-xl aspect-video relative group">
                             <img src={url} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                 <a href={url} download={`thumbnail_${i+1}.jpg`} className="bg-white text-black font-bold py-2 px-4 rounded-full hover:bg-slate-200">Descargar</a>
                                 <button onClick={() => setEditingImage(url)} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-500 flex items-center gap-1">
                                     ✏️ Editar Texto
                                 </button>
                             </div>
                        </div>
                        <p className="text-center text-xs text-slate-500">Opción {i+1}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const VeoVideoGenerator: React.FC = () => {
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isExtractingStyle, setIsExtractingStyle] = useState(false);
    const [showEyeOfHorus, setShowEyeOfHorus] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [error, setError] = useState('');
    const [prompt, setPrompt] = useState('');
    
    const { brandKit, credits, deductCredits, pendingVeoPrompt, setPendingVeoPrompt } = useAppStore();

    useEffect(() => {
        const checkKey = async () => {
            if (brandKit?.gemini_api_key) { setHasApiKey(true); return; }
            if (window.aistudio) { setHasApiKey(await window.aistudio.hasSelectedApiKey()); } else { setHasApiKey(false); }
        }; checkKey();
    }, [brandKit]);
    
    // Auto-fill prompt if coming from Analyzer
    useEffect(() => {
        if (pendingVeoPrompt) {
            setPrompt(pendingVeoPrompt);
            setPendingVeoPrompt(null);
        }
    }, [pendingVeoPrompt, setPendingVeoPrompt]);

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) {
             setError('Escribe una idea básica primero para poder mejorarla.');
             return;
        }
        if (credits < 1) {
             setError('Necesitas al menos 1 crédito para usar el Alquimista de Prompts.');
             return;
        }

        setIsEnhancing(true);
        setError('');
        try {
            const enhanced = await enhancePromptForVideo(prompt, brandKit, brandKit?.gemini_api_key);
            setPrompt(enhanced);
            deductCredits(1);
        } catch (err: any) {
            console.error(err);
            setError('Error mejorando el prompt. Intenta de nuevo.');
        } finally {
            setIsEnhancing(false);
        }
    }

    const handleEyeOfHorus = async (file: File) => {
        setIsExtractingStyle(true);
        setError('');
        setShowEyeOfHorus(false);
        try {
            const base64 = await fileToBase64(file);
            const styleDescription = await extractVisualStyle(base64, brandKit?.gemini_api_key);
            setPrompt(prev => prev ? `${prev}, ${styleDescription}` : styleDescription);
        } catch (err: any) {
            console.error(err);
            setError('Error analizando la imagen. ' + err.message);
        } finally {
            setIsExtractingStyle(false);
        }
    };
    
    const addStylePreset = (style: string) => {
        setPrompt(prev => {
            if (prev.includes(style)) return prev;
            return prev.trim() ? `${prev.trim()}, ${style}` : style;
        });
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        if (credits < 50) {
            setError('Créditos insuficientes. Generar video con VEO cuesta 50 créditos.');
            return;
        }

        setIsLoading(true); setError(''); setLoadingMessage('Generando video (esto toma unos minutos)...');
        try {
            const link = await generateVideoWithVeo(prompt, '16:9', '720p', brandKit?.gemini_api_key);
            deductCredits(50);
            
            const apiKeyForFetch = brandKit?.gemini_api_key || process.env.API_KEY;
            const res = await fetch(`${link}&key=${apiKeyForFetch}`);
            if (!res.ok) throw new Error("Error descargando video");
            setVideoUrl(URL.createObjectURL(await res.blob()));
        } catch (err: any) { setError(getFriendlyErrorMessage(err)); } finally { setIsLoading(false); }
    };

    if (hasApiKey === false) return <ApiKeyModal onKeySelected={() => setHasApiKey(true)} />;
    if (isLoading) return <Loader message={loadingMessage} />;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Generador VEO</h3>
                {brandKit?.visual_style && <span className="text-xs text-green-400 border border-green-600/50 px-2 py-1 rounded bg-green-900/20">Estilo de Marca Activo</span>}
             </div>
             <p className="text-sm text-slate-400">Crea videos cinematográficos de alta calidad a partir de texto.</p>
             
             {/* Style Chips & Eye of Horus */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                 <button
                    onClick={() => setShowEyeOfHorus(!showEyeOfHorus)}
                    className={`text-xs flex items-center gap-1 border px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${isExtractingStyle ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-pink-300 border-pink-500/50'}`}
                >
                    👁️ {isExtractingStyle ? 'Analizando...' : 'Ojo de Horus'}
                </button>
                {STYLE_PRESETS.map(style => (
                    <button
                        key={style}
                        onClick={() => addStylePreset(style)}
                        className="text-xs bg-slate-800 hover:bg-pink-900/50 text-slate-300 hover:text-pink-300 border border-slate-700 hover:border-pink-500/50 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
                    >
                        + {style}
                    </button>
                ))}
            </div>

             {showEyeOfHorus && (
                <div className="bg-pink-900/20 border border-pink-500/30 p-4 rounded-xl animate-fadeIn">
                    <p className="text-xs text-pink-200 mb-2">Sube una imagen (película, foto) y la IA copiará su iluminación y estética para tu video.</p>
                    <FileUpload onFileUpload={handleEyeOfHorus} acceptedFileTypes="image/*" label="Sube referencia para VEO" />
                </div>
            )}
             
             <div className="relative">
                 <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.currentTarget.value)} 
                    placeholder="Describe tu video... (ej: Un gato corriendo)" 
                    className="w-full h-32 p-4 bg-slate-900/50 rounded-xl border border-slate-600/50 focus:ring-2 focus:ring-pink-500 focus:outline-none pr-14 text-white resize-none" 
                 />
                 <button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt.trim()}
                    className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:bg-slate-700 disabled:scale-100"
                    title="Alquimista de Prompts: Mejorar con IA (1 Crédito)"
                 >
                    {isEnhancing ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <span>✨</span>
                    )}
                 </button>
             </div>

             <button onClick={handleGenerate} className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl font-bold text-white shadow-lg shadow-pink-500/25 transition-all transform hover:-translate-y-1">
                 Generar Video con IA (50 Créditos)
             </button>
             {error && <p className="text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-lg">{error}</p>}
             {videoUrl && <video controls src={videoUrl} className="w-full rounded-xl border border-slate-700 shadow-2xl" />}
        </div>
    )
}

const SocialMediaGenerator: React.FC = () => {
    const { generated_scripts, social_metadata, setSocialMetadata } = useSessionStore();
    const brandKit = useAppStore(state => state.brandKit);
    const [scriptText, setScriptText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (generated_scripts?.length > 0 && !scriptText) {
            setScriptText(generated_scripts[0].script.map(s => `Visual: ${s.visuals}\nAudio: ${s.voiceOver}`).join('\n\n'));
        }
    }, [generated_scripts]);

    const handleGenerate = async () => {
        if (!scriptText) return; setIsLoading(true); setError('');
        try {
            setSocialMetadata(await generateSocialMetadata(scriptText, brandKit, brandKit?.gemini_api_key));
        } catch (err: any) { setError(getFriendlyErrorMessage(err)); } finally { setIsLoading(false); }
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Viralizador de Redes</h3>
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <textarea value={scriptText} onChange={(e) => setScriptText(e.currentTarget.value)} className="w-full h-32 bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Guion..." />
                <button onClick={handleGenerate} disabled={isLoading} className="mt-4 w-full bg-purple-600 hover:bg-purple-500 py-2.5 rounded-lg font-bold text-white transition-colors shadow-lg shadow-purple-500/20">Generar Metadatos</button>
            </div>
            {social_metadata && social_metadata.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {social_metadata.map((meta, i) => (
                        <div key={i} className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 shadow-xl">
                            <h4 className="font-bold text-center mb-3 text-white">{meta.platform}</h4>
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Gancho</p>
                                <p className="text-sm text-purple-300 font-medium">{meta.viralTitles[0]}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Descripción</p>
                                <div className="text-xs bg-slate-900/50 p-3 rounded-lg h-24 overflow-y-auto text-slate-300 whitespace-pre-wrap custom-scrollbar border border-slate-800">{meta.description}</div>
                            </div>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    )
}


const CreativeSuiteView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('veoVideo'); 
    
    const tabs = {
        veoVideo: { label: '✨ Generar Video (VEO)', component: <VeoVideoGenerator /> },
        image: { label: 'Imágenes', component: <ImageGenerator /> },
        thumbnail: { label: '🖼️ Miniaturas', component: <ThumbnailGenerator /> },
        voiceover: { label: 'Voz en Off', component: <VoiceOverGenerator /> },
        social: { label: '🚀 Viralizar', component: <SocialMediaGenerator /> },
    };

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center"><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Suite Creativa</h2></div>
            <div className="max-w-6xl mx-auto">
                <div className="flex border-b border-slate-700/50 mb-8 overflow-x-auto">
                    {Object.entries(tabs).map(([key, { label }]) => (
                        <button key={key} onClick={() => setActiveTab(key)} className={`py-3 px-6 font-semibold whitespace-nowrap transition-all ${activeTab === key ? 'border-b-2 border-purple-500 text-purple-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg'}`}>{label}</button>
                    ))}
                </div>
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl">{tabs[activeTab as keyof typeof tabs].component}</div>
            </div>
        </div>
    );
};

export default CreativeSuiteView;
