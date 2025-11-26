
/// <reference lib="dom" />
import React, { useState } from 'react';
import { 
    analyzeTrendsWithGoogleSearch, 
    findFrequentlyAskedQuestions, 
    generateScriptFromFaq, 
    generateScriptFromIdea, 
    analyzeLandingPageFromContent, 
    generateScriptFromProblemSolution,
    identifyTopicsFromContent,
    enhanceTrendTopic
} from '../services/geminiService';
import { useAppStore, useSessionStore } from '../store/appStore';
import Loader from './common/Loader';
import { marked } from 'marked';
import { AppView, FAQ, LandingPageAnalysis, ProblemSolution } from '../types';
import FileUpload from './common/FileUpload';
import { fileToBase64 } from '../services/utils';
import { supabase } from '../services/supabaseClient';

type SearchMode = 'trends' | 'faq' | 'landingPage';

interface TrendsViewProps {
    setCurrentView: (view: AppView) => void;
}

// --- Sub-components for Deep Analysis Report ---

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl shadow-lg hover:border-purple-500/20 transition-colors">
        <h3 className="text-xl font-semibold text-purple-400 mb-4 border-b border-slate-700/50 pb-2">{title}</h3>
        {children}
    </div>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
    <ul className="space-y-2 list-disc list-inside text-slate-300">
        {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
);

const ProblemSolutionList: React.FC<{
    problems: ProblemSolution[];
    onGenerate: (problem: ProblemSolution, index: number) => void;
    generatingIndex: number | null;
}> = ({ problems, onGenerate, generatingIndex }) => (
    <div className="space-y-4">
        {problems.map((ps, index) => (
            <div key={index} className="bg-slate-700/50 p-5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border border-slate-600/30">
                <div className="flex-grow">
                    <p className="text-sm text-slate-300"><strong>Problema:</strong> {ps.problem}</p>
                    <p className="text-sm text-green-400 mt-1"><strong>Solución Estratégica:</strong> {ps.solution}</p>
                </div>
                <button
                    onClick={() => onGenerate(ps, index)}
                    disabled={generatingIndex !== null}
                    className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 disabled:bg-slate-600 transition-colors w-full sm:w-auto flex-shrink-0 ml-0 sm:ml-4 shadow-lg shadow-green-500/20"
                >
                    {generatingIndex === index ? 'Creando...' : 'Crear Guion'}
                </button>
            </div>
        ))}
    </div>
);


const DeepAnalysisReport: React.FC<{ result: LandingPageAnalysis; onGenerateScript: (problem: ProblemSolution, index: number, list: 'initial' | 'growth') => void; generatingInfo: { list: string | null; index: number | null } }> = ({ result, onGenerateScript, generatingInfo }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-white">Auditoría Estratégica de Marketing</h2>
            <p className="text-center text-slate-400">Análisis basado en: "{result.url}"</p>

            <AnalysisSection title="1. Descripción del producto">
                <div className="space-y-2 text-slate-300">
                    <p><strong>Producto:</strong> {result.product_description.productName}</p>
                    <p><strong>Formato:</strong> {result.product_description.format}</p>
                    <p><strong>Objetivo:</strong> {result.product_description.objective}</p>
                    <p><strong>Extras:</strong> {result.product_description.extras}</p>
                </div>
            </AnalysisSection>

            <AnalysisSection title="2. Propuesta de valor">
                <div className="space-y-3">
                    <div>
                        <h4 className="font-semibold text-slate-200">Promesa Central:</h4>
                        <p className="text-slate-300 italic">"{result.value_proposition.centralPromise}"</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200">Propuesta Ampliada:</h4>
                        <BulletList items={result.value_proposition.extendedValue} />
                    </div>
                     <div>
                        <h4 className="font-semibold text-slate-200">En Resumen:</h4>
                        <p className="text-slate-300">{result.value_proposition.summary}</p>
                    </div>
                </div>
            </AnalysisSection>
            
            <AnalysisSection title="3. Avatar o Cliente Ideal">
                 <div className="space-y-3">
                    <div>
                        <h4 className="font-semibold text-slate-200">Perfil Socioemocional:</h4>
                        <BulletList items={result.ideal_avatar.socioemotionalProfile} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200">Motivaciones Principales:</h4>
                        <BulletList items={result.ideal_avatar.mainMotivations} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200">Dolores que Resuelve:</h4>
                        <BulletList items={result.ideal_avatar.painsResolved} />
                    </div>
                </div>
            </AnalysisSection>

             <AnalysisSection title="4. Estructura de la Landing Page y Copywriting">
                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-ul:list-disc prose-li:text-slate-300">
                    <h4>Encabezado / Hero section</h4>
                    <BulletList items={result.landing_page_structure.heroSection} />
                    <h4 className="mt-4">Demostración de contenido</h4>
                    <BulletList items={result.landing_page_structure.contentDemonstration} />
                    <h4 className="mt-4">Plan de estudios</h4>
                    <BulletList items={result.landing_page_structure.studyPlan} />
                     <h4 className="mt-4">Bonos</h4>
                    <BulletList items={result.landing_page_structure.bonuses} />
                     <h4 className="mt-4">Sección de objeciones</h4>
                    <BulletList items={result.landing_page_structure.objectionHandling} />
                    <h4 className="mt-4">Garantía</h4>
                    <BulletList items={result.landing_page_structure.guarantee} />
                </div>
            </AnalysisSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnalysisSection title="5. Gatillos Mentales Usados">
                     <BulletList items={result.mental_triggers.triggers} />
                </AnalysisSection>

                <AnalysisSection title="6. Análisis de Branding y Estilo">
                    <div className="space-y-2 text-slate-300">
                        <p><strong>Nombre:</strong> {result.branding_style.nameAnalysis}</p>
                        <p><strong>Tono de voz:</strong> {result.branding_style.toneOfVoice}</p>
                        <p><strong>Estética:</strong> {result.branding_style.expectedAesthetics}</p>
                        <p><strong>Promesa emocional:</strong> {result.branding_style.emotionalPromise}</p>
                    </div>
                </AnalysisSection>
            </div>


            <AnalysisSection title="7. Recomendaciones Estratégicas">
                <BulletList items={result.strategic_recommendations.recommendations} />
            </AnalysisSection>
            
             <AnalysisSection title="8. Conclusión General">
                <p className="text-slate-300">{result.conclusion}</p>
            </AnalysisSection>


            <h2 className="text-3xl font-bold text-center text-white pt-8">Activos de Marketing Generados</h2>
            
            <AnalysisSection title="5 Buyer Personas Estratégicos">
                <div className="space-y-6">
                    {result.buyer_personas.map((persona, index) => (
                        <div key={index} className="bg-slate-700/50 p-5 rounded-lg border border-slate-600/30">
                            <h4 className="text-lg font-bold text-green-400">{index + 1}. {persona.name}</h4>
                            <p className="text-sm text-slate-300 mt-2"><strong>Perfil:</strong> {persona.profile}</p>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h5 className="font-semibold text-slate-200 text-sm">Motivaciones:</h5>
                                    <BulletList items={persona.motivations} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-200 text-sm">Miedos y Objeciones:</h5>
                                    <BulletList items={persona.fearsAndObjections} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <h5 className="font-semibold text-slate-200 text-sm">Mensajes que la activan:</h5>
                                <p className="text-sm text-slate-300 italic">{persona.activatingMessages.join(' ')}</p>
                            </div>
                             <div className="mt-3">
                                <h5 className="font-semibold text-slate-200 text-sm">Canales / Contenido:</h5>
                                <p className="text-sm text-slate-300">{persona.idealChannels} / {persona.contentType}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </AnalysisSection>

            <AnalysisSection title="10 Problemas y Soluciones (Barreras de Entrada)">
                <ProblemSolutionList 
                    problems={result.initial_problems_and_solutions}
                    onGenerate={(ps, index) => onGenerateScript(ps, index, 'initial')}
                    generatingIndex={generatingInfo.list === 'initial' ? generatingInfo.index : null}
                />
            </AnalysisSection>
             <AnalysisSection title="10 Problemas y Soluciones (Nuevas Perspectivas de Crecimiento)">
                <ProblemSolutionList 
                    problems={result.growth_problems_and_solutions}
                    onGenerate={(ps, index) => onGenerateScript(ps, index, 'growth')}
                    generatingIndex={generatingInfo.list === 'growth' ? generatingInfo.index : null}
                />
            </AnalysisSection>

        </div>
    );
};


const TrendsView: React.FC<TrendsViewProps> = ({ setCurrentView }) => {
    const { 
        trends: { topic, result: trendResult, isLoading: isTrendLoading, error: trendError },
        setTrendsTopic, setTrendsResult, setIsTrendsLoading, setTrendsError,
        credits, deductCredits
    } = useAppStore();

    const {
        landingPageAnalysis: { result: landingPageResult, isLoading: isLandingPageLoading, error: landingPageError, identifiedTopics, selectedTopic, preAnalysisLoading },
        setLandingPageAnalysisResult, setIsLandingPageLoading, setLandingPageError,
        setIdentifiedTopics, setSelectedTopic, setPreAnalysisLoading,
    } = useAppStore();

    const { clearSession, setTitle, setGeneratedScripts } = useSessionStore();
    const brandKit = useAppStore(state => state.brandKit);
    
    const [searchMode, setSearchMode] = useState<SearchMode>('trends');
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [generatingFaqIndex, setGeneratingFaqIndex] = useState<number | null>(null);
    const [generatingProblemInfo, setGeneratingProblemInfo] = useState<{list: 'initial' | 'growth' | null, index: number | null}>({list: null, index: null});
    
    const [isEnhancingTopic, setIsEnhancingTopic] = useState(false);

    const handleEnhanceTopic = async () => {
        if (!topic.trim()) {
             setTrendsError('Escribe un tema básico primero.');
             return;
        }
        if (credits < 1) {
             setTrendsError('Necesitas al menos 1 crédito para usar el Alquimista de Tendencias.');
             return;
        }

        setIsEnhancingTopic(true);
        setTrendsError(null);
        try {
            const enhanced = await enhanceTrendTopic(topic, brandKit?.gemini_api_key);
            setTrendsTopic(enhanced);
            deductCredits(1);
        } catch (err: any) {
            console.error(err);
            setTrendsError('Error al refinar el tema.');
        } finally {
            setIsEnhancingTopic(false);
        }
    };

    const handleSearch = async () => {
        setIsTrendsLoading(true);
        setTrendsError(null);
        setTrendsResult(null);
        try {
            if (!topic.trim()) {
                setTrendsError('Por favor, introduce un tema para analizar.'); return;
            }
            
            let analysisResult;
            if (searchMode === 'trends') {
                analysisResult = await analyzeTrendsWithGoogleSearch(topic, brandKit?.gemini_api_key);
            } else if (searchMode === 'faq') {
                analysisResult = await findFrequentlyAskedQuestions(topic, brandKit?.gemini_api_key);
            }
            
            setTrendsResult(analysisResult);
        } catch (err: any) {
            console.error(err);
            setTrendsError(err.message || 'Ocurrió un error. Inténtalo de nuevo.');
        } finally {
            setIsTrendsLoading(false);
        }
    };
    
    const handlePreAnalysis = async () => {
        if (!pdfFile) {
            setLandingPageError('Por favor, sube un archivo PDF para analizar.');
            return;
        }
        setPreAnalysisLoading(true);
        setLandingPageError(null);
        setLandingPageAnalysisResult(null);
        setIdentifiedTopics(null);
        setSelectedTopic(null);

        try {
            const fileContent = await fileToBase64(pdfFile);
            const topics = await identifyTopicsFromContent(fileContent, pdfFile.type, brandKit?.gemini_api_key);
            if (topics.length === 1) {
                // If only one topic, select it automatically and proceed to full analysis
                setSelectedTopic(topics[0]);
                await handleAnalyzeLandingPage(topics[0]);
            } else {
                 setIdentifiedTopics(topics);
            }
        } catch (err: any) {
            console.error(err);
            setLandingPageError(err.message || 'Ocurrió un error al identificar los temas del documento.');
        } finally {
            setPreAnalysisLoading(false);
        }
    };

    const handleAnalyzeLandingPage = async (topicToAnalyze?: string) => {
        const finalTopic = topicToAnalyze || selectedTopic;
        if (!pdfFile || !finalTopic) {
            setLandingPageError('Se requiere un archivo PDF y un tema seleccionado.');
            return;
        }

        setIsLandingPageLoading(true);
        setLandingPageError(null);
        setLandingPageAnalysisResult(null);
        
        try {
            const fileContent = await fileToBase64(pdfFile);
            const analysisData = await analyzeLandingPageFromContent(fileContent, pdfFile.type, finalTopic, brandKit?.gemini_api_key);
            
            const sourceIdentifier = `Archivo: ${pdfFile.name} (Tema: ${finalTopic})`;
            const fullResult = { 
                ...analysisData, 
                id: crypto.randomUUID(), 
                created_at: new Date().toISOString(), 
                url: sourceIdentifier 
            };
            
            // FIX: The `user()` method is synchronous and deprecated. Replaced with the asynchronous `getUser()` method to align with Supabase v2 authentication standards.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase.from('landing_page_analyses').insert({ ...fullResult, user_id: user.id });
            if (error) throw error;

            setLandingPageAnalysisResult(fullResult);

        } catch(err: any) {
            console.error(err);
            setLandingPageError(err.message || 'Ocurrió un error al realizar el análisis profundo. Inténtalo de nuevo.');
        } finally {
            setIsLandingPageLoading(false);
        }
    }
    
    const handlePdfUpload = (file: File) => {
        setPdfFile(file);
        setLandingPageAnalysisResult(null);
        setIdentifiedTopics(null);
        setSelectedTopic(null);
        setLandingPageError(null);
    }

    const handleCreateScriptFromProblem = async (problem: ProblemSolution, index: number, list: 'initial' | 'growth') => {
        setGeneratingProblemInfo({ list, index });
        setLandingPageError(null);
         try {
            const newScript = await generateScriptFromProblemSolution(problem, brandKit, brandKit?.gemini_api_key);
            clearSession();
            setTitle(newScript.title);
            setGeneratedScripts([newScript]);
            setCurrentView('analyzer');
        } catch (err: any) {
            console.error(err);
            setLandingPageError(err.message || "No se pudo generar el guion.");
        } finally {
            setGeneratingProblemInfo({ list: null, index: null });
        }
    }

    const handleCreateScript = async () => {
        if (!trendResult?.analysis) return;
        setIsGeneratingScript(true); setTrendsError(null);
        try {
            const newScript = await generateScriptFromIdea(trendResult.analysis, brandKit, brandKit?.gemini_api_key);
            clearSession(); setTitle(newScript.title); setGeneratedScripts([newScript]); setCurrentView('analyzer');
        } catch (err: any) {
            console.error(err); setTrendsError(err.message || "No se pudo generar el guion.");
        } finally {
            setIsGeneratingScript(false);
        }
    };
    
    const handleCreateScriptFromFaq = async (faq: FAQ, index: number) => {
        setGeneratingFaqIndex(index); setTrendsError(null);
        try {
            const newScript = await generateScriptFromFaq(faq, brandKit, brandKit?.gemini_api_key);
            clearSession(); setTitle(newScript.title); setGeneratedScripts([newScript]); setCurrentView('analyzer');
        } catch (err: any) {
            console.error(err); setTrendsError(err.message || "No se pudo generar el guion.");
        } finally {
            setGeneratingFaqIndex(null);
        }
    };
    
    const trendSanitizedHtml = trendResult?.analysis ? marked.parse(trendResult.analysis) : '';
    const isLoading = isTrendLoading || isLandingPageLoading || preAnalysisLoading;
    const error = trendError || landingPageError;

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Radar de Tendencias y Estrategia</h2>
                <p className="text-slate-400 mt-2">Investiga tu nicho, descubre preguntas de audiencia o audita productos.</p>
            </div>

            <div className="max-w-3xl mx-auto bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-2xl space-y-6">
                <div className="flex border-b border-slate-700/50 mb-4 overflow-x-auto">
                    <button onClick={() => setSearchMode('trends')} className={`py-3 px-5 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${searchMode === 'trends' ? 'bg-slate-800/50 text-purple-400 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}>Análisis de Tendencias</button>
                    <button onClick={() => setSearchMode('faq')} className={`py-3 px-5 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${searchMode === 'faq' ? 'bg-slate-800/50 text-purple-400 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}>Preguntas Frecuentes</button>
                    <button onClick={() => setSearchMode('landingPage')} className={`py-3 px-5 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${searchMode === 'landingPage' ? 'bg-slate-800/50 text-purple-400 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}>Analista de Landing Page</button>
                </div>
                
                {(searchMode === 'trends' || searchMode === 'faq') && (
                    <div className="relative">
                        <input 
                            type="text" 
                            value={topic} 
                            onChange={(e) => setTrendsTopic(e.target.value)} 
                            placeholder="Ej: recetas veganas, finanzas personales, tendencias fitness..."
                            className="w-full p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none pr-14 text-white placeholder-slate-500"
                        />
                        <button
                            onClick={handleEnhanceTopic}
                            disabled={isEnhancingTopic || !topic.trim()}
                            className="absolute top-3 right-3 bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg shadow-lg transition-all disabled:bg-slate-700"
                            title="Alquimista: Refinar búsqueda con IA (1 Crédito)"
                            >
                            {isEnhancingTopic ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <span>✨</span>
                            )}
                            </button>
                        <button onClick={handleSearch} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:from-transparent disabled:to-transparent disabled:shadow-none transition-all mt-4"> {isLoading ? 'Buscando...' : 'Buscar'} </button>
                    </div>
                )}

                 {searchMode === 'landingPage' && (
                    <div className="space-y-6">
                        <div>
                            <FileUpload onFileUpload={handlePdfUpload} acceptedFileTypes="application/pdf" label="Sube el PDF de la landing page"/>
                            {pdfFile && <p className="text-center text-sm text-slate-400 mt-2 font-mono">Archivo: {pdfFile.name}</p>}
                        </div>

                        {!identifiedTopics && !landingPageResult && (
                             <button onClick={handlePreAnalysis} disabled={isLoading || !pdfFile} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:from-transparent disabled:to-transparent disabled:shadow-none transition-all">
                                {preAnalysisLoading ? 'Identificando Temas...' : 'Paso 1: Identificar Temas del PDF'}
                            </button>
                        )}

                        {identifiedTopics && !landingPageResult && (
                            <div className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-xl space-y-4">
                                <h4 className="font-semibold text-center text-white">Paso 2: Selecciona el tema para el análisis</h4>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {identifiedTopics.map(topic => (
                                        <button 
                                            key={topic}
                                            onClick={() => setSelectedTopic(topic)}
                                            className={`py-2 px-4 rounded-lg font-semibold transition-colors ${selectedTopic === topic ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => handleAnalyzeLandingPage()} disabled={isLoading || !selectedTopic} className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:from-transparent disabled:to-transparent disabled:shadow-none transition-all">
                                    {isLandingPageLoading ? 'Realizando Auditoría...' : 'Paso 3: Realizar Auditoría Completa'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isLoading && !preAnalysisLoading && <div className="flex justify-center"><Loader message={isLandingPageLoading ? "Realizando auditoría profunda..." : "Realizando análisis..."} /></div>}
            {isGeneratingScript && <div className="flex justify-center"><Loader message="Generando guion..." /></div>}
            {error && <p className="text-center text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-xl">{error}</p>}

            {(searchMode === 'trends' || searchMode === 'faq') && trendResult && (
                 <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <h2 className="text-2xl font-bold text-center text-white">Resultados de la Búsqueda</h2>
                    <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-purple-400 prose-strong:text-white prose-ul:list-disc prose-li:text-slate-300 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl shadow-xl" dangerouslySetInnerHTML={{ __html: trendSanitizedHtml }} />
                    {searchMode === 'trends' && trendResult.analysis && !trendResult.faqs && ( <div className="text-center"><button onClick={handleCreateScript} disabled={isGeneratingScript} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-8 rounded-full hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:from-transparent disabled:to-transparent disabled:shadow-none transition-all transform hover:-translate-y-1">{isGeneratingScript ? 'Creando...' : 'Crear Guion con este Análisis'}</button></div> )}
                    {searchMode === 'faq' && trendResult.faqs && (<div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl shadow-xl space-y-6"><h3 className="text-lg font-semibold text-purple-400 border-b border-slate-700/50 pb-2">Preguntas Encontradas</h3>{trendResult.faqs.map((faq, index) => (<div key={index} className="bg-slate-700/30 p-5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border border-slate-600/30"><div className="flex-grow"><h4 className="font-bold text-white text-lg">{faq.question}</h4><p className="text-sm text-slate-300 mt-1">{faq.contentPotential}</p></div><button onClick={() => handleCreateScriptFromFaq(faq, index)} disabled={generatingFaqIndex !== null} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 disabled:bg-slate-600 transition-colors w-full sm:w-auto flex-shrink-0 ml-0 sm:ml-4 shadow-lg shadow-green-500/20">{generatingFaqIndex === index ? 'Creando...' : 'Crear Guion'}</button></div>))}</div>)}
                    {trendResult.sources.length > 0 && (<div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl shadow-xl"><h3 className="text-lg font-semibold text-purple-400 mb-3">Fuentes Utilizadas</h3><ul className="space-y-2">{trendResult.sources.map((source, index) => (<li key={index} className="bg-slate-700/30 p-3 rounded-lg"><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 hover:underline break-all">{source.web.title}</a></li>))}</ul></div>)}
                </div>
            )}

            {searchMode === 'landingPage' && landingPageResult && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                   <DeepAnalysisReport result={landingPageResult} onGenerateScript={handleCreateScriptFromProblem} generatingInfo={{ list: generatingProblemInfo.list, index: generatingProblemInfo.index }} />
                </div>
            )}
        </div>
    );
};

export default TrendsView;
