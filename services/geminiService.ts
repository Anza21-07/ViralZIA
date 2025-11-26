
import { GoogleGenAI, Type, Modality, Content } from "@google/genai";
import { 
    AnalysisResult, 
    GeneratedScript, 
    TrendAnalysisResult, 
    ScriptScene, 
    FAQ, 
    LandingPageAnalysis, 
    ProblemSolution,
    BrandKit,
    SocialPlatformMetadata,
    ChatMessage,
    ScriptStrategy,
    HookVariant,
    ViralScore
} from '../types';

// API_KEY is handled by the environment or passed user key
const getAIClient = (userApiKey?: string) => {
    const apiKey = userApiKey || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key faltante. Por favor configura tu API Key en el Kit de Marca o en las variables de entorno.");
    }
    return new GoogleGenAI({ apiKey });
};

const createSystemInstructionFromBrandKit = (brandKit: BrandKit | null): string | undefined => {
    if (!brandKit) {
        return undefined;
    }
    
    const instructions: string[] = [];

    if (brandKit.tone_of_voice || brandKit.visual_style || brandKit.target_audience || brandKit.content_language) {
        instructions.push("Sigue estas directrices de marca en todas tus respuestas:");
    }

    if (brandKit.tone_of_voice) instructions.push(`- Tono de Voz: ${brandKit.tone_of_voice}`);
    if (brandKit.visual_style) instructions.push(`- Estilo Visual Deseado para las descripciones: ${brandKit.visual_style}`);
    if (brandKit.target_audience) instructions.push(`- Público Objetivo al que te diriges: ${brandKit.target_audience}`);
    
    if (brandKit.content_language && brandKit.content_language !== 'es') {
        const languageMap: Record<string, string> = {
            'en': 'English',
            'pt': 'Portuguese',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'ru': 'Russian',
            'zh': 'Chinese (Mandarin)',
            'ja': 'Japanese',
            'he': 'Hebrew'
        };
        
        const targetLang = languageMap[brandKit.content_language] || brandKit.content_language;
        instructions.push(`- Language: All generated text (scripts, analysis, etc.) MUST be in ${targetLang}.`);
    }

    return instructions.length > 0 ? instructions.join('\n') : undefined;
}

export const analyzeTrendsWithGoogleSearch = async (topic: string, apiKey?: string): Promise<TrendAnalysisResult> => {
    const ai = getAIClient(apiKey);
    const prompt = `
        Actúa como un estratega experto en contenido viral para plataformas como TikTok y YouTube.
        Analiza las tendencias actuales y emergentes relacionadas con el tema: "${topic}".

        Tu análisis debe incluir:
        1.  **Tendencias Actuales:** ¿Qué formatos, sonidos o desafíos son populares ahora mismo en este nicho?
        2.  **Ángulos Únicos:** Proporciona 3-5 ideas de video con ángulos frescos y originales que puedan captar la atención.
        3.  **Títulos Atractivos:** Sugiere 3 títulos optimizados para el clic para una de las ideas de video.
        4.  **Resumen General:** Un párrafo final con tu recomendación estratégica principal.

        Formatea tu respuesta usando Markdown para una fácil lectura.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    return {
        analysis: response.text,
        sources: sources,
    };
};

export const findFrequentlyAskedQuestions = async (topic: string, apiKey?: string): Promise<TrendAnalysisResult> => {
    const ai = getAIClient(apiKey);
    const prompt = `
        Actúa como un analista experto en SEO y comunidades online.
        Tu tarea es investigar y encontrar las preguntas más frecuentes (FAQs) que la gente hace sobre el tema: "${topic}".
        Utiliza la búsqueda de Google para basar tus respuestas en datos reales de búsqueda.

        Tu respuesta DEBE SER un objeto JSON válido con dos claves:
        1.  "analysis": Un string que contiene un breve análisis introductorio en formato Markdown.
        2.  "faqs": Un array de objetos, donde cada objeto representa una pregunta y tiene las claves "question" (string) y "contentPotential" (string con una breve sugerencia de qué tipo de video respondería mejor a esa pregunta).
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    
    let jsonString = response.text;
    const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    }

    try {
        const parsedJson = JSON.parse(jsonString);
        return {
            analysis: parsedJson.analysis,
            faqs: parsedJson.faqs,
            sources: sources,
        };
    } catch (e) {
        console.error("Failed to parse JSON from FAQ search. Raw response:", response.text);
        throw new Error("La IA devolvió una respuesta inesperada o en un formato incorrecto. Por favor, intenta de nuevo.");
    }
};

const getDeepAnalysisPrompt = (selectedTopic: string) => `
    Actúa como un estratega de marketing digital de élite y un copywriter experto. Tu misión es realizar una auditoría completa y profunda del producto digital presentado en el contenido proporcionado.

    **INSTRUCCIÓN CRÍTICA PRINCIPAL:**
    Tu análisis debe centrarse EXCLUSIVAMENTE en el siguiente tema/producto del documento: "${selectedTopic}". Ignora categóricamente cualquier información no relacionada con este tema específico.

    **PROCESO DE ANÁLISIS OBLIGATORIO (8 Pasos):**
    Primero, realiza un análisis interno completo siguiendo estos 8 pasos en orden:
    1.  **Descripción del producto:** Identifica el nombre, formato, objetivo y extras del tema seleccionado.
    2.  **Propuesta de valor:** Define la promesa central, el valor ampliado y un resumen.
    3.  **Avatar o cliente ideal:** Describe el perfil socioemocional, motivaciones y dolores que resuelve.
    4.  **Estructura de la landing page y copywriting:** Analiza el 'hero section', la demostración de contenido, el plan de estudios, los bonos, la sección de objeciones y la garantía.
    5.  **Gatillos mentales usados:** Enumera los principios de persuasión evidentes (Autoridad, Prueba social, Escasez, etc.).
    6.  **Análisis de branding y estilo:** Evalúa el nombre, tono de voz, estética y promesa emocional.
    7.  **Recomendaciones estratégicas:** Proporciona 5-7 recomendaciones accionables para mejorar la conversión.
    8.  **Conclusión general:** Un resumen final de la auditoría.

    **GENERACIÓN DE ACTIVOS (Después del análisis):**
    Una vez completada tu auditoría interna, y basándote EXCLUSIVAMENTE en ella, genera los siguientes activos.
    -   **5 Buyer Personas:** Perfiles detallados y relevantes para el producto.
    -   **initialProblemsAndSolutions:** Genera una lista de EXACTAMENTE 10 problemas comunes que los principiantes enfrentan.
    -   **growthProblemsAndSolutions:** Genera una lista de EXACTAMENTE 10 problemas más avanzados o aspiracionales para clientes que ya conocen el tema.

    **INSTRUCCIONES CRÍTICAS E INQUEBRANTABLES:**
    1.  **Fuente Única de Verdad:** El contenido proporcionado (documento) es tu ÚNICA fuente de información. IGNORA categóricamente cualquier conocimiento previo.
    2.  **Confirmación Obligatoria:** En el campo 'productName' de 'productDescription', DEBES citar textualmente el nombre del producto que identificaste para confirmar que has analizado el contenido correcto.
    3.  **Completitud Obligatoria:** Asegúrate de que las listas 'initialProblemsAndSolutions' y 'growthProblemsAndSolutions' contengan EXACTAMENTE 10 elementos cada una. La completitud es crucial.

    Tu respuesta DEBE ser un único objeto JSON válido que se ajuste al esquema proporcionado.
`;

const getDeepAnalysisSchema = () => ({
    type: Type.OBJECT,
    properties: {
        productDescription: { type: Type.OBJECT, properties: { productName: { type: Type.STRING }, format: { type: Type.STRING }, objective: { type: Type.STRING }, extras: { type: Type.STRING } } },
        valueProposition: { type: Type.OBJECT, properties: { centralPromise: { type: Type.STRING }, extendedValue: { type: Type.ARRAY, items: { type: Type.STRING } }, summary: { type: Type.STRING } } },
        idealAvatar: { type: Type.OBJECT, properties: { socioemotionalProfile: { type: Type.ARRAY, items: { type: Type.STRING } }, mainMotivations: { type: Type.ARRAY, items: { type: Type.STRING } }, painsResolved: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        landingPageStructure: { type: Type.OBJECT, properties: { heroSection: { type: Type.ARRAY, items: { type: Type.STRING } }, contentDemonstration: { type: Type.ARRAY, items: { type: Type.STRING } }, studyPlan: { type: Type.ARRAY, items: { type: Type.STRING } }, bonuses: { type: Type.ARRAY, items: { type: Type.STRING } }, objectionHandling: { type: Type.ARRAY, items: { type: Type.STRING } }, guarantee: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        mentalTriggers: { type: Type.OBJECT, properties: { triggers: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        brandingStyle: { type: Type.OBJECT, properties: { nameAnalysis: { type: Type.STRING }, toneOfVoice: { type: Type.STRING }, expectedAesthetics: { type: Type.STRING }, emotionalPromise: { type: Type.STRING } } },
        strategicRecommendations: { type: Type.OBJECT, properties: { recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        conclusion: { type: Type.STRING },
        buyerPersonas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, profile: { type: Type.STRING }, motivations: { type: Type.ARRAY, items: { type: Type.STRING } }, fearsAndObjections: { type: Type.ARRAY, items: { type: Type.STRING } }, activatingMessages: { type: Type.ARRAY, items: { type: Type.STRING } }, idealChannels: { type: Type.STRING }, contentType: { type: Type.STRING } } } },
        initialProblemsAndSolutions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { problem: { type: Type.STRING }, solution: { type: Type.STRING } } } },
        growthProblemsAndSolutions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { problem: { type: Type.STRING }, solution: { type: Type.STRING } } } }
    },
    required: ["productDescription", "valueProposition", "idealAvatar", "landingPageStructure", "mentalTriggers", "brandingStyle", "strategicRecommendations", "conclusion", "buyerPersonas", "initialProblemsAndSolutions", "growthProblemsAndSolutions"]
});

export const identifyTopicsFromContent = async (content: string, mimeType: string, apiKey?: string): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const prompt = `Analiza el siguiente documento. Identifica los principales productos o temas que se están vendiendo o discutiendo. Tu respuesta DEBE ser un array JSON de strings. Si solo hay un tema, devuelve un array con un solo elemento. Si hay más de uno, inclúyelos. Ejemplo: ["Velas Artesanales", "Jabones Artesanales"].`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { data: content, mimeType } }, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text);
};

export const analyzeLandingPageFromContent = async (content: string, mimeType: string, selectedTopic: string, apiKey?: string): Promise<Omit<LandingPageAnalysis, 'id' | 'createdAt' | 'url'>> => {
    const ai = getAIClient(apiKey);
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: {
            parts: [
                { inlineData: { data: content, mimeType } },
                { text: getDeepAnalysisPrompt(selectedTopic) }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: getDeepAnalysisSchema()
        }
    });

    return JSON.parse(response.text);
};

export const analyzeTranscriptOnly = async (transcript: string, apiKey?: string): Promise<AnalysisResult> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Analiza la siguiente transcripción de un video. Proporciona un análisis detallado para optimizar los siguientes puntos clave con el objetivo de viralizar el contenido.
    La respuesta DEBE ser un objeto JSON válido. El análisis debe basarse únicamente en el texto proporcionado.

    Puntos a analizar:
    1.  Interés de la temática del vídeo (basado en el texto).
    2.  Hook (gancho inicial).
    3.  Estructura del contenido.
    4.  Calidad de edición y visual (dar sugerencias generales ya que no se puede ver el video).
    5.  Dinamismo del ritmo narrativo (inferido del guión).
    6.  Estrategias para maximizar la retención del público.

    Transcripción del usuario:
    ${transcript}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          thematicInterest: { type: Type.STRING, description: "Análisis del interés de la temática." },
          hook: { type: Type.STRING, description: "Análisis del gancho del video." },
          contentStructure: { type: Type.STRING, description: "Análisis de la estructura del contenido." },
          editingQuality: { type: Type.STRING, description: "Sugerencias sobre la calidad de edición y visual, asumiendo un video estándar." },
          narrativeRhythm: { type: Type.STRING, description: "Análisis del ritmo narrativo inferido del texto." },
          retentionStrategies: { type: Type.STRING, description: "Sugerencias para maximizar la retención." },
        },
        required: ["thematicInterest", "hook", "contentStructure", "editingQuality", "narrativeRhythm", "retentionStrategies"],
      },
    },
  });

  return JSON.parse(response.text);
};

export const generateImprovedScripts = async (
    analysis: AnalysisResult, 
    transcript: string, 
    brandKit: BrandKit | null, 
    strategy: ScriptStrategy, 
    apiKey?: string
): Promise<GeneratedScript[]> => {
  const ai = getAIClient(apiKey);

  // Selección de Estrategia
  let strategyInstruction = "";
  if (strategy === 'direct') {
      strategyInstruction = `
      **ESTRATEGIA: ESTRUCTURA DE VALOR DIRECTO**
      Objetivo: Velocidad y Utilidad. Ideal para tips, hacks y educación.
      Estructura Obligatoria:
      1. GANCHO FUERTE (0-5s): Promesa clara y directa. Sin rodeos.
      2. DESARROLLO DE VALOR (5-45s): Entrega la solución paso a paso o el dato clave.
      3. CTA (45-60s): Llamado a la acción claro.
      `;
  } else {
      strategyInstruction = `
      **ESTRATEGIA: ESTRUCTURA DE ALTA RETENCIÓN (VIRAL TWIST)**
      Objetivo: Retención máxima y dopamina. Ideal para storytelling y entretenimiento.
      Estructura Obligatoria:
      1. DOLOR DEL AVATAR / GANCHO EMOCIONAL (0-8s): Toca la herida emocional del usuario inmediatamente. Haz que sientan "esto es para mí".
      2. DESARROLLO (8-30s): Comienza la narrativa o explicación normal.
      3. **GIRO INESPERADO (PLOT TWIST) / PATTERN BREAK** (30-40s): Introduce un cambio brusco, una revelación sorprendente, un chiste o un cambio de ángulo visual que "resetee" la atención del cerebro. ESTO ES CRÍTICO.
      4. RESOLUCIÓN Y CTA (40-60s): Cierra la historia con el aprendizaje y pide la acción.
      `;
  }

  const prompt = `
    Basado en el siguiente análisis de video y la transcripción original, genera 1 guion mejorado.
    Actúa como un director de cine experto y estratega viral.
    
    ${strategyInstruction}

    Para cada escena, además de los visuales y la voz en off, debes proponer un 'cinematicShot' (ej: "Primer plano", "Plano general aéreo", "Cámara en mano siguiendo al sujeto").
    
    El 'script' para cada guion debe ser un array de objetos JSON.
    La respuesta DEBE ser un array con UN SOLO objeto JSON (el guion generado) que tiene 'title' (string) y 'script' (array de escenas).

    Análisis del video:
    ${JSON.stringify(analysis, null, 2)}

    Transcripción Original:
    ${transcript || "No se proporcionó transcripción."}
  `;
  
  const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena, comenzando en 1." },
        cinematicShot: { type: Type.STRING, description: "Descripción del plano cinematográfico (ej. 'Primer plano', 'Plano general aéreo')." },
        visuals: { type: Type.STRING, description: "Descripción de los elementos visuales, acciones y planos de cámara." },
        voiceOver: { type: Type.STRING, description: "El texto exacto para la narración en off. Dejar vacío si no hay narración en esta escena." }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };

  const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro', 
    contents: prompt,
    config: {
      ...(systemInstruction && { systemInstruction }),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            script: {
              type: Type.ARRAY,
              items: sceneSchema
            },
          },
          required: ["title", "script"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateHookVariations = async (
    fullScriptText: string,
    brandKit: BrandKit | null,
    apiKey?: string
): Promise<HookVariant[]> => {
    const ai = getAIClient(apiKey);
    
    const prompt = `
        Actúa como un estratega de Hooks Virales para TikTok/Reels.
        
        Analiza el siguiente guion completo. Tu objetivo es reescribir SOLAMENTE LA ESCENA 1 (El Gancho) usando 3 enfoques psicológicos diferentes para testear retención.
        
        LOS 3 ENFOQUES:
        1. CURIOSIDAD: Plantea una pregunta o misterio que obligue a ver hasta el final.
        2. POLÉMICA / CONTROVERSIA: Una afirmación que desafíe creencias comunes del nicho.
        3. VISUAL / ACCIÓN: Comienza in media res, con una acción o descripción visual impactante.

        CONTEXTO DEL GUION:
        ${fullScriptText}

        Responde con un array JSON de 3 objetos (uno por enfoque).
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['Curiosidad', 'Polémica', 'Visual/Acción'] },
                visuals: { type: Type.STRING, description: "Nueva descripción visual para la escena 1" },
                voiceOver: { type: Type.STRING, description: "Nuevo texto de gancho" },
                explanation: { type: Type.STRING, description: "Breve explicación de por qué funcionará este gancho" }
            },
            required: ["type", "visuals", "voiceOver", "explanation"]
        }
    };

    const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            ...(systemInstruction && { systemInstruction })
        }
    });

    return JSON.parse(response.text);
}

export const auditScriptQuality = async (
    scriptText: string,
    brandKit: BrandKit | null,
    apiKey?: string
): Promise<ViralScore> => {
    const ai = getAIClient(apiKey);
    const prompt = `
        Actúa como un Crítico de Cine y Experto en Algoritmos de Viralidad.
        Audita el siguiente guion de video corto (TikTok/Reels).
        
        Evalúa 3 factores clave (0-100):
        1. Hook (Gancho): ¿Captura la atención en 3 segundos?
        2. Pacing (Ritmo): ¿Es dinámico o aburrido?
        3. CTA (Llamada a la Acción): ¿Es clara y motivadora?
        
        Calcula un puntaje general promedio.
        Proporciona una crítica constructiva breve y UNA recomendación de arreglo específica.

        GUION:
        ${scriptText}
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.NUMBER, description: "Puntaje General 0-100" },
            hookScore: { type: Type.NUMBER, description: "Puntaje del Gancho" },
            pacingScore: { type: Type.NUMBER, description: "Puntaje del Ritmo" },
            ctaScore: { type: Type.NUMBER, description: "Puntaje del CTA" },
            critique: { type: Type.STRING, description: "Feedback general corto" },
            fixRecommendation: { type: Type.STRING, description: "Una acción específica para mejorar el puntaje" }
        },
        required: ["score", "hookScore", "pacingScore", "ctaScore", "critique", "fixRecommendation"]
    };

    const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Use Flash for speed/cost
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            ...(systemInstruction && { systemInstruction })
        }
    });

    return JSON.parse(response.text);
};

// NOTE: Keeping older functions compatible for now, but they default to 'direct' logic internally if not updated.
// For full consistency, we could update all, but the user specifically focused on the "VideoAnalyzerView" flow.

export const generateScriptFromIdea = async (analysisText: string, brandKit: BrandKit | null, apiKey?: string): Promise<GeneratedScript> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Actúa como un guionista experto y director de cine para videos cortos virales (TikTok, YouTube Shorts).
    Estructura: GANCHO FUERTE -> DESARROLLO DE VALOR -> CTA.
    Basado en el siguiente análisis de tendencias, crea un guion completo y atractivo para un video de aproximadamente 1 minuto.
    
    El guion debe ser estructurado como un array de objetos de escena.
    La respuesta DEBE ser un único objeto JSON con las claves 'title' (string) y 'script' (un array de objetos de escena).

    Análisis de tendencias para usar como inspiración:
    ---
    ${analysisText}
    ---
  `;

  const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena, comenzando en 1." },
        cinematicShot: { type: Type.STRING, description: "Descripción del plano cinematográfico (ej. 'Primer plano', 'Plano general aéreo')." },
        visuals: { type: Type.STRING, description: "Descripción de los elementos visuales, acciones, planos de cámara y textos en pantalla." },
        voiceOver: { type: Type.STRING, description: "El texto exacto para la narración en off. Dejar vacío si no hay narración." }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };

  const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      ...(systemInstruction && { systemInstruction }),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          script: {
            type: Type.ARRAY,
            items: sceneSchema
          },
        },
        required: ["title", "script"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateScriptFromFaq = async (faq: FAQ, brandKit: BrandKit | null, apiKey?: string): Promise<GeneratedScript> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Actúa como un guionista experto.
    Estructura: GANCHO FUERTE -> DESARROLLO DE VALOR -> CTA.
    Tu tarea es crear un guion completo que responda a una pregunta frecuente. El video debe durar aproximadamente 1 minuto.
    
    La respuesta DEBE ser un único objeto JSON con las claves 'title' (string) y 'script' (un array de objetos de escena).

    Pregunta a responder: "${faq.question}"
    Sugerencia de contenido: "${faq.contentPotential}"
  `;

  const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena, comenzando en 1." },
        cinematicShot: { type: Type.STRING, description: "Descripción del plano cinematográfico (ej. 'Primer plano', 'Plano general aéreo')." },
        visuals: { type: Type.STRING, description: "Descripción de los elementos visuales, acciones, planos de cámara y textos en pantalla." },
        voiceOver: { type: Type.STRING, description: "El texto exacto para la narración en off." }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };
  
  const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      ...(systemInstruction && { systemInstruction }),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          script: {
            type: Type.ARRAY,
            items: sceneSchema
          },
        },
        required: ["title", "script"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateScriptFromProblemSolution = async (problem: ProblemSolution, brandKit: BrandKit | null, apiKey?: string): Promise<GeneratedScript> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Actúa como un guionista experto.
    Estructura: GANCHO FUERTE -> DESARROLLO DE VALOR -> CTA.
    Tu objetivo es crear un guion de video que aborde un problema específico y presente una solución de manera atractiva.

    El guion debe ser un objeto JSON con 'title' (string) y 'script' (array de escenas).

    Problema a resolver: "${problem.problem}"
    Concepto de la solución a presentar en el video: "${problem.solution}"
  `;
  
   const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena, comenzando en 1." },
        cinematicShot: { type: Type.STRING, description: "Descripción del plano cinematográfico (ej. 'Primer plano', 'Cámara en mano')." },
        visuals: { type: Type.STRING, description: "Descripción de los elementos visuales, acciones y textos en pantalla." },
        voiceOver: { type: Type.STRING, description: "El texto exacto para la narración en off." }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };

  const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      ...(systemInstruction && { systemInstruction }),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          script: {
            type: Type.ARRAY,
            items: sceneSchema
          },
        },
        required: ["title", "script"]
      }
    }
  });

  return JSON.parse(response.text);
}

export const generateScriptFromCreativeBrief = async (brief: string, brandKit: BrandKit | null, apiKey?: string): Promise<GeneratedScript> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Actúa como un copywriter experto y director de cine.
    Estructura: GANCHO FUERTE -> DESARROLLO DE VALOR -> CTA.
    
    A continuación, te proporciono un brief creativo. Tu tarea es convertirlo en un guion de video estructurado de aproximadamente 1 minuto.
    
    El formato de tu respuesta DEBE ser un único objeto JSON con las claves 'title' (string) y 'script' (un array de objetos de escena).

    Brief Creativo del Usuario:
    ---
    ${brief}
    ---
  `;

  const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena, comenzando en 1." },
        cinematicShot: { type: Type.STRING, description: "Descripción detallada del plano cinematográfico (ej. 'Plano detalle', 'Cámara lenta')." },
        visuals: { type: Type.STRING, description: "Descripción detallada de los elementos visuales, acciones, y textos en pantalla." },
        voiceOver: { type: Type.STRING, description: "El texto exacto para la narración en off." }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };

  const systemInstruction = createSystemInstructionFromBrandKit(brandKit);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      ...(systemInstruction && { systemInstruction }),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          script: {
            type: Type.ARRAY,
            items: sceneSchema
          },
        },
        required: ["title", "script"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const parseScriptFromText = async (text: string, apiKey?: string): Promise<GeneratedScript> => {
  const ai = getAIClient(apiKey);
  const prompt = `
    Eres un asistente de producción de video y guionista experto.
    Tu tarea es leer el texto proporcionado y convertirlo en un formato estructurado JSON para producción de video.

    **INSTRUCCIONES DE TÍTULO (CRÍTICO):**
    - NO uses el título que viene en el texto (ej: "Guion 1", "Versión Final", "El Guion Refinado").
    - **DETECTA EL TEMA:** Lee el contenido y genera un título viral corto (máx 6 palabras) que describa de qué trata el video.
    - Ejemplo: Si el texto habla de café y Rumi, el título debe ser "El Espejo de Rumi" o "Tu Café y el Alma".

    **INSTRUCCIONES DE CONTENIDO:**
    - Extrae las escenas.
    - **VoiceOver:** Debe ser EXACTAMENTE el texto que se dice en el guion original. No resumas ni cambies las palabras del narrador.
    - **Visuals:** Si el texto tiene descripciones visuales, úsalas. Si faltan, INFIERE visuales cinematográficos que acompañen al audio para crear un video dinámico.
    - **CinematicShot:** Infiere el mejor plano (Primer plano, Plano general, etc.) para cada escena.

    Texto del guion a procesar:
    ---
    ${text}
    ---
  `;

  const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        scene: { type: Type.NUMBER, description: "Número de la escena" },
        cinematicShot: { type: Type.STRING, description: "Plano cinematográfico (inferido si falta)" },
        visuals: { type: Type.STRING, description: "Descripción visual (extraída o inferida)" },
        voiceOver: { type: Type.STRING, description: "Texto EXACTO para narración" }
    },
    required: ["scene", "cinematicShot", "visuals", "voiceOver"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Un título viral y creativo basado en el TEMA del guion (NO usar el título del input)." },
          script: {
            type: Type.ARRAY,
            items: sceneSchema
          },
        },
        required: ["title", "script"]
      }
    }
  });

  const parsed = JSON.parse(response.text);
  if (!parsed.script) {
      parsed.script = [];
  }
  return parsed;
};

export const generateImagePromptsFromScript = async (scriptText: string, brandKit: BrandKit | null, apiKey?: string): Promise<string[]> => {
  const ai = getAIClient(apiKey);
  const brandKitContext = brandKit?.visual_style 
    ? `Aplica el siguiente estilo visual a todos los prompts: "${brandKit.visual_style}".` 
    : '';

  const prompt = `
    Based on the following video script, generate a list of 5-10 detailed, scene-by-scene prompts for an AI image generator. 
    ${brandKitContext}
    The prompts should be descriptive and create visually compelling images that match the script's narrative.
    The response MUST be a JSON array of strings.

    Script:
    ---
    ${scriptText}
    ---
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          description: "A detailed prompt for an AI image generator."
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateVoiceOver = async (
    script: string, 
    voiceName: string, 
    brandKit: BrandKit | null, // Param kept for compatibility
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    
    // Validate script is not empty or undefined to avoid 400/500 errors
    if (!script || script.trim().length === 0) {
        throw new Error("Texto vacío para audio.");
    }

    // Using explicit string "AUDIO" instead of Modality enum to avoid runtime serialization issues.

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No se pudo generar el audio.");
    }
    return base64Audio;
};

export const generateImageWithImagen = async (
    prompt: string, 
    numberOfImages: number = 1, 
    visualStyle?: string | null, 
    aspectRatio: string = '16:9', 
    apiKey?: string
): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const finalPrompt = visualStyle ? `Estilo visual: ${visualStyle}. \n\nPrompt: ${prompt}` : prompt;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
            numberOfImages: numberOfImages,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio, 
        },
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("No se pudo generar ninguna imagen.");
    }

    const base64Images = response.generatedImages.map(img => img.image.imageBytes);
    return base64Images;
};

export const generateImageWithNano = async (
    prompt: string, 
    numberOfImages: number = 1, 
    visualStyle?: string | null, 
    aspectRatio: string = '9:16',
    apiKey?: string
): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const images: string[] = [];
    
    let ratioInstructions = "";
    switch(aspectRatio) {
        case '9:16': ratioInstructions = "vertical 9:16 aspect ratio, tall portrait format"; break;
        case '16:9': ratioInstructions = "wide 16:9 aspect ratio, cinematic landscape format"; break;
        case '1:1': ratioInstructions = "square 1:1 aspect ratio"; break;
        case '3:4': ratioInstructions = "vertical 3:4 aspect ratio"; break;
        case '4:3': ratioInstructions = "horizontal 4:3 aspect ratio"; break;
        default: ratioInstructions = "vertical 9:16 aspect ratio"; break;
    }

    const finalPrompt = visualStyle 
        ? `${visualStyle} style. ${prompt}. ${ratioInstructions}` 
        : `${prompt}. ${ratioInstructions}`;

    for (let i = 0; i < numberOfImages; i++) {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [{ text: finalPrompt }],
                    },
                    config: {
                        // Using explicit string "IMAGE" to avoid potential Enum issues
                        responseModalities: ["IMAGE"],
                    },
                });

                const candidate = response.candidates?.[0];
                for (const part of candidate?.content?.parts ?? []) {
                    if (part.inlineData) {
                        images.push(part.inlineData.data);
                        break;
                    }
                }
                break; 
            } catch (e: any) {
                attempts++;
                if (attempts >= maxAttempts) throw e;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
            }
        }
    }
    
    if (images.length === 0) throw new Error("No se pudo generar imagen.");
    
    return images;
};

export const enhancePromptForVideo = async (
    rawInput: string, 
    brandKit: BrandKit | null, 
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const systemInstruction = `
        Actúa como un "Prompt Engineer" experto en modelos de video generativo.
        Enriquece el prompt con iluminación, movimiento de cámara, estilo visual y atmósfera.
        ${brandKit?.visual_style ? `Estilo visual: "${brandKit.visual_style}"` : ''}
        Responde ÚNICAMENTE con el prompt mejorado en Inglés.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: rawInput,
        config: { systemInstruction }
    });

    return response.text.trim();
};

export const enhanceVisualDescription = async (
    rawInput: string,
    brandKit: BrandKit | null,
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const systemInstruction = `
        Actúa como un Director de Fotografía. Mejora la descripción visual.
        Hazla más descriptiva y cinematográfica. Especifica planos y acciones.
        ${brandKit?.visual_style ? `Estilo visual: "${brandKit.visual_style}"` : ''}
        Responde ÚNICAMENTE con la descripción mejorada.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: rawInput,
        config: { systemInstruction }
    });

    return response.text.trim();
};

export const enhanceVoiceOver = async (
    rawInput: string,
    brandKit: BrandKit | null,
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const systemInstruction = `
        Actúa como un Copywriter experto en videos virales.
        Mejora el texto de Voz en Off. Hazlo más natural, con hooks fuertes y mejor ritmo.
        ${brandKit?.tone_of_voice ? `Tono: "${brandKit.tone_of_voice}"` : ''}
        Responde ÚNICAMENTE con el texto mejorado.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: rawInput,
        config: { systemInstruction }
    });

    return response.text.trim();
};

export const enhanceTrendTopic = async (
    rawTopic: string,
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);

    const systemInstruction = `
        Actúa como un Estratega de Tendencias de Mercado.
        El usuario te dará un tema simple o genérico (ej: "zapatos", "crypto", "fitness").
        Tu tarea es convertirlo en una consulta de investigación de alto potencial para descubrir oportunidades virales y nichos rentables.
        
        Hazlo más específico, orientado a tendencias emergentes y problemas actuales del consumidor.
        Ejemplo: "Zapatos" -> "Tendencias emergentes en calzado urbano sostenible para Gen Z en 2025".
        
        Responde ÚNICAMENTE con el tema mejorado.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: rawTopic,
        config: { systemInstruction }
    });

    return response.text.trim();
};

export const generateVideoWithVeo = async (prompt: string, aspectRatio: string = '16:9', resolution: string = '720p', apiKey?: string): Promise<string> => {
    const ai = getAIClient(apiKey);
    
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: resolution as '720p' | '1080p',
            aspectRatio: aspectRatio as '16:9' | '9:16'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Falló la generación de video.");
    
    return videoUri;
}

export const generateSocialMetadata = async (scriptText: string, brandKit: BrandKit | null, apiKey?: string): Promise<SocialPlatformMetadata[]> => {
    const ai = getAIClient(apiKey);
    const systemInstruction = createSystemInstructionFromBrandKit(brandKit);
    
    const prompt = `
        Actúa como un Social Media Manager experto.
        Genera metadatos virales para TikTok, Instagram y YouTube Shorts basados en el siguiente guion.
        Para cada plataforma: 3 Hooks, 1 Descripción con storytelling, Hashtags.
        Responde con un ARRAY JSON.
        
        Guion: ${scriptText}
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                platform: { type: Type.STRING, enum: ['TikTok', 'Instagram', 'YouTube Shorts'] },
                viralTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                hashtags: {
                    type: Type.OBJECT,
                    properties: {
                        niche: { type: Type.ARRAY, items: { type: Type.STRING } },
                        trend: { type: Type.ARRAY, items: { type: Type.STRING } },
                        community: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            ...(systemInstruction && { systemInstruction })
        }
    });

    return JSON.parse(response.text);
}

export const extractVisualStyle = async (imageBase64: string, apiKey?: string): Promise<string> => {
    const ai = getAIClient(apiKey);
    const prompt = "Analiza el estilo visual. Describe iluminación, colores, plano y atmósfera. Responde en inglés.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: prompt }
            ]
        }
    });

    return response.text.trim();
}

export const generateThumbnailPrompt = async (topic: string, apiKey?: string): Promise<string> => {
    const ai = getAIClient(apiKey);
    const prompt = `
        Diseña un prompt para una miniatura de YouTube de ALTO CTR sobre: "${topic}".
        Describe expresión facial exagerada, alto contraste, fondo llamativo.
        Responde solo con el prompt en inglés.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text.trim();
}

export const generateContentRemix = async (
    scriptContent: string, 
    format: 'Twitter Thread' | 'LinkedIn Post' | 'Blog Post' | 'Newsletter',
    brandKit: BrandKit | null, 
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    const systemInstruction = createSystemInstructionFromBrandKit(brandKit);
    
    const prompts = {
        'Twitter Thread': 'Convierte en Hilo de Twitter viral.',
        'LinkedIn Post': 'Convierte en post de LinkedIn profesional.',
        'Blog Post': 'Convierte en artículo de blog SEO.',
        'Newsletter': 'Convierte en correo de newsletter.'
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompts[format]}\n\nOriginal:\n${scriptContent}`,
        config: { ...(systemInstruction && { systemInstruction }) }
    });

    return response.text;
}

export const sendMentorMessage = async (
    history: ChatMessage[], 
    newMessage: string, 
    contextScripts: GeneratedScript[], 
    brandKit: BrandKit | null, 
    apiKey?: string
): Promise<string> => {
    const ai = getAIClient(apiKey);
    
    const systemInstruction = `
        Eres "Mentor Viral", un experto en creación de contenido, storytelling y viralidad.
        Tu objetivo es ayudar al usuario a mejorar sus guiones y estrategia.
        Tienes acceso al contexto de los guiones que el usuario está creando.
        Sé conciso, práctico y motivador.
        ${brandKit ? `Ten en cuenta la marca del usuario: ${JSON.stringify(brandKit)}` : ''}
    `;

    const context = contextScripts.length > 0 
        ? `CONTEXTO ACTUAL (Guiones del usuario):\n${JSON.stringify(contextScripts.map(s => ({title: s.title, scenes: s.script})), null, 2)}\n\n`
        : '';

    const chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        })),
        config: { systemInstruction }
    });

    const response = await chat.sendMessage({ message: context + newMessage });
    return response.text;
};