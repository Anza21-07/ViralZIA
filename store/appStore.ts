

import { create } from 'zustand';
import { AnalysisResult, GeneratedScript, Session, TrendAnalysisResult, TrendState, ScriptScene, LandingPageAnalysis, LandingPageAnalysisState, BrandKit, SocialPlatformMetadata, ChatMessage } from '../types';
import { supabase } from '../services/supabaseClient';

interface AppState {
    session: Session;
    trends: TrendState;
    landingPageAnalysis: LandingPageAnalysisState;
    brandKit: BrandKit | null;
    
    // --- Economy System ---
    credits: number;
    fetchCredits: () => Promise<void>; // Action to sync credits from DB
    deductCredits: (amount: number) => Promise<boolean>; // Async to wait for DB transaction

    // --- Workflow Bridge ---
    pendingVeoPrompt: string | null;
    setPendingVeoPrompt: (prompt: string | null) => void;
    
    setSession: (session: Session) => void;
    setTitle: (title: string) => void;
    setOriginalTranscript: (transcript: string) => void;
    setAnalysis: (analysis: AnalysisResult | null) => void;
    setGeneratedScripts: (scripts: GeneratedScript[]) => void;
    setImagePrompts: (scriptIndex: number, prompts: string[]) => void;
    setStoryboardImage: (scriptIndex: number, promptIndex: number, imageUrl: string) => void;
    updateScriptScene: (scriptIndex: number, sceneIndex: number, field: keyof Omit<ScriptScene, 'scene'>, value: string) => void;
    setGeneratedImages: (images: string[]) => void;
    setGeneratedAudioBase64: (audio: string) => void;
    setSocialMetadata: (metadata: SocialPlatformMetadata[]) => void; 
    addChatMessage: (message: ChatMessage) => void; 
    setChatHistory: (history: ChatMessage[]) => void; 
    clearSession: () => void;

    // Actions for Trends State
    setTrendsTopic: (topic: string) => void;
    setTrendsResult: (result: TrendAnalysisResult | null) => void;
    setIsTrendsLoading: (isLoading: boolean) => void;
    setTrendsError: (error: string | null) => void;

    // Actions for Landing Page Analyst State
    setLandingPageUrl: (url: string) => void;
    setLandingPageAnalysisResult: (result: LandingPageAnalysis | null) => void;
    setIsLandingPageLoading: (isLoading: boolean) => void;
    setLandingPageError: (error: string | null) => void;
    setIdentifiedTopics: (topics: string[] | null) => void;
    setSelectedTopic: (topic: string | null) => void;
    setPreAnalysisLoading: (isLoading: boolean) => void;

    // Actions for Brand Kit
    setBrandKit: (brandKit: BrandKit | null) => void;
}


const initialSessionState: Session = {
    id: crypto.randomUUID(), 
    created_at: '',
    title: 'Nueva Sesión',
    original_transcript: '',
    analysis: null,
    generated_scripts: [],
    image_prompts: {},
    storyboardImages: {},
    generatedImages: [],
    generatedAudioBase64: '',
    social_metadata: [],
    chat_history: [],
};

const initialTrendsState: TrendState = {
    topic: '',
    result: null,
    isLoading: false,
    error: null,
};

const initialLandingPageState: LandingPageAnalysisState = {
    url: '',
    result: null,
    isLoading: false,
    error: null,
    identifiedTopics: null,
    selectedTopic: null,
    preAnalysisLoading: false,
};

export const useAppStore = create<AppState>((set, get) => ({
    session: initialSessionState,
    trends: initialTrendsState,
    landingPageAnalysis: initialLandingPageState,
    brandKit: null,

    // Economy & Bridge Init
    credits: 0, // Start with 0 until fetched
    
    fetchCredits: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', user.id)
                .single();

            if (data) {
                set({ credits: data.credits });
            } else if (error) {
                // Handle case where user exists but profile doesn't (legacy users before trigger)
                if (error.code === 'PGRST116') { // Row not found
                    console.log("Profile missing. Initializing via RPC...");
                    // Use RPC to safely create profile bypassing INSERT RLS restrictions on table
                    const { error: rpcError } = await supabase.rpc('initialize_user_credits');
                    
                    if (!rpcError) {
                        set({ credits: 500 });
                    } else {
                        console.error("Error creating fallback profile:", JSON.stringify(rpcError));
                    }
                } else {
                    console.error("Error fetching credits:", error.message || error);
                }
            }
        } catch (e) {
            console.error("Fetch credits exception:", e);
        }
    },

    deductCredits: async (amount) => {
        // Optimistic check
        const currentCredits = get().credits;
        if (currentCredits < amount) return false;

        // Optimistic update
        set({ credits: currentCredits - amount });

        try {
            // Secure server-side deduction
            const { data, error } = await supabase.rpc('deduct_credits', { amount_to_deduct: amount });
            
            if (error) {
                console.error("Transaction failed:", error);
                // Rollback on error
                set({ credits: currentCredits });
                return false;
            }
            
            // Update with confirmed balance from server
            set({ credits: data });
            return true;
        } catch (e) {
            console.error("Deduction exception:", e);
            set({ credits: currentCredits });
            return false;
        }
    },

    pendingVeoPrompt: null,
    setPendingVeoPrompt: (prompt) => set({ pendingVeoPrompt: prompt }),

    // Session actions
    setSession: (session) => set(state => ({ 
        session: { 
            ...state.session, 
            ...session,
            generated_scripts: session.generated_scripts || [],
            image_prompts: session.image_prompts || {},
            social_metadata: session.social_metadata || [],
            chat_history: session.chat_history || [],
            storyboardImages: session.storyboardImages || state.session.storyboardImages || {},
            generatedImages: session.generatedImages || [],
            generatedAudioBase64: session.generatedAudioBase64 || ''
        } 
    })),
    setTitle: (title) => set(state => ({ session: { ...state.session, title } })),
    setOriginalTranscript: (transcript) => set(state => ({ session: { ...state.session, original_transcript: transcript } })),
    setAnalysis: (analysis) => set(state => ({ session: { ...state.session, analysis } })),
    setGeneratedScripts: (scripts) => set(state => ({ session: { ...state.session, generated_scripts: scripts } })),
    setImagePrompts: (scriptIndex, prompts) => set(state => ({
        session: {
            ...state.session,
            image_prompts: { ...state.session.image_prompts, [scriptIndex]: prompts }
        }
    })),
    setStoryboardImage: (scriptIndex, promptIndex, imageUrl) => set(state => ({
        session: {
            ...state.session,
            storyboardImages: {
                ...state.session.storyboardImages,
                [scriptIndex]: {
                    ...state.session.storyboardImages[scriptIndex],
                    [promptIndex]: imageUrl,
                }
            }
        }
    })),
    updateScriptScene: (scriptIndex, sceneIndex, field, value) => set(state => {
        const newScripts = [...state.session.generated_scripts];
        if (newScripts[scriptIndex] && newScripts[scriptIndex].script[sceneIndex]) {
            const newScene = { ...newScripts[scriptIndex].script[sceneIndex], [field]: value };
            const newScriptArray = [...newScripts[scriptIndex].script];
            newScriptArray[sceneIndex] = newScene;
            newScripts[scriptIndex] = { ...newScripts[scriptIndex], script: newScriptArray };
        }
        return {
            session: {
                ...state.session,
                generated_scripts: newScripts
            }
        };
    }),
    setGeneratedImages: (images) => set(state => ({ session: { ...state.session, generatedImages: images } })),
    setGeneratedAudioBase64: (audio) => set(state => ({ session: { ...state.session, generatedAudioBase64: audio } })),
    setSocialMetadata: (metadata) => set(state => ({ session: { ...state.session, social_metadata: metadata } })),
    
    // Chat Actions
    addChatMessage: (message) => set(state => ({ 
        session: { 
            ...state.session, 
            chat_history: [...(state.session.chat_history || []), message] 
        } 
    })),
    setChatHistory: (history) => set(state => ({
        session: { ...state.session, chat_history: history }
    })),

    clearSession: () => set({ session: { ...initialSessionState, id: crypto.randomUUID(), created_at: new Date().toISOString(), storyboardImages: {} } }),

    // Trends actions
    setTrendsTopic: (topic) => set(state => ({ trends: { ...state.trends, topic } })),
    setTrendsResult: (result) => set(state => ({ trends: { ...state.trends, result } })),
    setIsTrendsLoading: (isLoading) => set(state => ({ trends: { ...state.trends, isLoading } })),
    setTrendsError: (error) => set(state => ({ trends: { ...state.trends, error } })),

    // Landing Page Analyst actions
    setLandingPageUrl: (url) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, url } })),
    setLandingPageAnalysisResult: (result) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, result } })),
    setIsLandingPageLoading: (isLoading) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, isLoading } })),
    setLandingPageError: (error) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, error } })),
    setIdentifiedTopics: (topics) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, identifiedTopics: topics } })),
    setSelectedTopic: (topic) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, selectedTopic: topic } })),
    setPreAnalysisLoading: (isLoading) => set(state => ({ landingPageAnalysis: { ...state.landingPageAnalysis, preAnalysisLoading: isLoading } })),
    
    // Brand Kit actions
    setBrandKit: (brandKit) => set({ brandKit }),
}));

// Expose session state directly for convenience
export const useSessionStore = () => useAppStore(state => ({
    ...state.session,
    setSession: state.setSession,
    setTitle: state.setTitle,
    setOriginalTranscript: state.setOriginalTranscript,
    setAnalysis: state.setAnalysis,
    setGeneratedScripts: state.setGeneratedScripts,
    setImagePrompts: state.setImagePrompts,
    setStoryboardImage: state.setStoryboardImage,
    updateScriptScene: state.updateScriptScene,
    setGeneratedImages: state.setGeneratedImages,
    setGeneratedAudioBase64: state.setGeneratedAudioBase64,
    setSocialMetadata: state.setSocialMetadata,
    addChatMessage: state.addChatMessage,
    setChatHistory: state.setChatHistory,
    clearSession: state.clearSession,
}));