
/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore, useAppStore } from '../store/appStore';
import { ChatMessage } from '../types';
import { sendMentorMessage } from '../services/geminiService';
import Loader from './common/Loader';
import { marked } from 'marked';
import { supabase } from '../services/supabaseClient';

const MentorView: React.FC = () => {
    const { chat_history, addChatMessage, generated_scripts, id: sessionId } = useSessionStore();
    const brandKit = useAppStore(state => state.brandKit);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat_history]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        addChatMessage(userMessage);
        setInput('');
        setIsLoading(true);

        try {
            // Only send context if we have generated scripts
            const responseText = await sendMentorMessage(
                chat_history || [], 
                userMessage.text, 
                generated_scripts, 
                brandKit, 
                brandKit?.gemini_api_key
            );

            const aiMessage: ChatMessage = {
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };

            addChatMessage(aiMessage);
            await saveChatToSupabase([...(chat_history || []), userMessage, aiMessage]);

        } catch (error) {
            console.error("Error in Mentor Chat:", error);
            const errorMessage: ChatMessage = {
                role: 'model',
                text: "Lo siento, tuve un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.",
                timestamp: Date.now()
            };
            addChatMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const saveChatToSupabase = async (history: ChatMessage[]) => {
        if (!sessionId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // We update the session with the new chat history
        await supabase
            .from('sessions')
            .update({ 
                chat_history: history,
                updated_at: new Date().toISOString() 
            })
            .eq('id', sessionId)
            .eq('user_id', user.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 h-[calc(100vh-100px)] flex flex-col animate-fadeIn">
            <div className="text-center mb-4 flex-shrink-0">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    ViralZ Mentor IA
                </h2>
                <p className="text-slate-400 mt-2">
                    Tu experto en Storytelling y Copywriting.
                </p>
            </div>

            <div className="flex-grow bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/50 relative">
                {/* Context Indicator */}
                {generated_scripts && generated_scripts.length > 0 && (
                    <div className="bg-indigo-900/30 p-2 text-xs text-indigo-200 text-center border-b border-indigo-800/30 backdrop-blur-sm z-10">
                        ✨ El Mentor tiene acceso al contexto de tus guiones actuales ({generated_scripts.length}).
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {(!chat_history || chat_history.length === 0) && (
                        <div className="text-center text-slate-500 mt-10">
                            <div className="text-5xl mb-4 opacity-50">🧞‍♂️</div>
                            <p className="text-lg font-medium">¡Hola! Soy tu Mentor Viral.</p>
                            <p className="text-sm mt-2">Pídeme cosas como:</p>
                            <ul className="text-sm mt-3 space-y-2 italic text-slate-400">
                                <li>"Haz que el gancho del guion sea más polémico."</li>
                                <li>"¿Cómo puedo mejorar la retención en la mitad del video?"</li>
                                <li>"Reescribe la escena 2 para que sea más emotiva."</li>
                            </ul>
                        </div>
                    )}
                    
                    {chat_history?.map((msg, index) => (
                        <div 
                            key={index} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div 
                                className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-5 shadow-lg backdrop-blur-sm border ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600/80 text-white rounded-br-none border-indigo-500/50' 
                                        : 'bg-slate-800/80 text-slate-200 rounded-bl-none border-slate-700/50'
                                }`}
                            >
                                <div 
                                    className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} 
                                />
                                <div className={`text-[10px] mt-2 opacity-60 font-medium uppercase tracking-wide ${msg.role === 'user' ? 'text-right text-indigo-200' : 'text-left text-slate-400'}`}>
                                    {msg.role === 'user' ? 'Tú' : 'Mentor IA'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="bg-slate-800/80 rounded-2xl rounded-bl-none p-4 border border-slate-700/50 flex items-center space-x-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-800/50 backdrop-blur-md">
                    <form onSubmit={handleSend} className="relative flex items-end gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe tu consulta o pide un cambio..."
                            className="w-full bg-slate-900/50 text-white rounded-xl border border-slate-700/50 p-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none max-h-32 min-h-[60px] shadow-inner placeholder-slate-500"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 transition-all flex-shrink-0 h-[60px] w-[60px] flex items-center justify-center shadow-lg shadow-indigo-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-[10px] text-center text-slate-600 mt-3 font-medium tracking-wide">
                        SHIFT + ENTER para salto de línea • IA Potenciada por Gemini 2.5 Pro
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MentorView;