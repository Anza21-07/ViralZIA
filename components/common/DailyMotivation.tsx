
import React, { useState, useEffect } from 'react';

const MOTIVATIONAL_QUOTES = [
    {
        text: "El algoritmo favorece a los audaces. Hoy no crees contenido, crea impacto.",
        author: "Filosofía ViralZIA"
    },
    {
        text: "Tu creatividad es el combustible; la IA es el motor. Juntos sois imparables.",
        author: "El Manifiesto del Creador"
    },
    {
        text: "Un video viral no es suerte, es estrategia aplicada con emoción.",
        author: "Estrategia Viral"
    },
    {
        text: "La perfección es enemiga de la viralidad. Publica, aprende, repite.",
        author: "Principio de Iteración"
    },
    {
        text: "Tienes en tus manos el estudio de cine más potente de la historia. ¿Qué historia contarás hoy?",
        author: "ViralZIA"
    },
    {
        text: "No persigas tendencias, créalas. Tienes las herramientas para liderar.",
        author: "Visión de Futuro"
    }
];

const DailyMotivation: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);

    useEffect(() => {
        // Check local storage for last seen date
        const lastSeenDate = localStorage.getItem('viralzia_daily_motivation_date');
        const today = new Date().toDateString();

        if (lastSeenDate !== today) {
            // Select random quote
            const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
            setQuote(randomQuote);
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        // Save today as seen
        localStorage.setItem('viralzia_daily_motivation_date', new Date().toDateString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />

            {/* Card */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-purple-500/20 animate-fadeIn scale-100 transform transition-all text-center overflow-hidden">
                
                {/* Decorative Orbs inside card */}
                <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                        <span className="text-3xl">🚀</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
                        Iniciando Motores Creativos
                    </h3>

                    <blockquote className="text-xl text-white font-medium leading-relaxed mb-6 italic">
                        "{quote.text}"
                    </blockquote>

                    <cite className="text-sm text-purple-400 font-bold not-italic uppercase tracking-widest mb-8 block">
                        — {quote.author}
                    </cite>

                    <button
                        onClick={handleDismiss}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-10 rounded-full shadow-lg shadow-purple-500/30 transition-all transform hover:scale-105 hover:-translate-y-1"
                    >
                        ¡Vamos a Crear!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyMotivation;
