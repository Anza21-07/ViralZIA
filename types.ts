

/// <reference lib="dom" />

export interface AnalysisResult {
  thematicInterest: string;
  hook: string;
  contentStructure: string;
  editingQuality: string;
  narrativeRhythm: string;
  retentionStrategies: string;
}

export type AppView = 'analyzer' | 'creativeSuite' | 'myAnalyses' | 'trends' | 'brandKit' | 'admin' | 'mentor' | 'profile' | 'performance';

export type ScriptStrategy = 'direct' | 'retention';

export interface ScriptScene {
  scene: number;
  cinematicShot: string;
  visuals: string;
  voiceOver: string;
  audio_volume?: number; // 1.0 is default (100%)
}

export interface HookVariant {
    type: 'Curiosidad' | 'Polémica' | 'Visual/Acción';
    visuals: string;
    voiceOver: string;
    explanation: string;
}

// New Interface for Viral Thermometer
export interface ViralScore {
    score: number; // 0-100
    hookScore: number;
    pacingScore: number;
    ctaScore: number;
    critique: string; // General feedback
    fixRecommendation: string; // Specific action to take
}

export interface GeneratedScript {
  title: string;
  script: ScriptScene[];
  hook_variations?: HookVariant[];
  viral_score?: ViralScore; // Store the audit result
}

export interface FAQ {
  question: string;
  contentPotential: string;
}

export interface TrendAnalysisResult {
    analysis: string; // The main markdown analysis text
    faqs?: FAQ[]; // The structured list of questions, only for FAQ mode
    sources: any[]; // Array of grounding chunks
}

export interface TrendState {
    topic: string;
    result: TrendAnalysisResult | null;
    isLoading: boolean;
    error: string | null;
}

// --- Social Media Types ---
export interface SocialPlatformMetadata {
    platform: 'TikTok' | 'Instagram' | 'YouTube Shorts';
    viralTitles: string[];
    description: string;
    hashtags: {
        niche: string[];
        trend: string[];
        community: string[];
    };
}

export interface OAuthConfig {
    platform: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
}

// --- Mentor / Chat Types ---
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

// --- Performance & Metrics Types ---
export type ProjectStatus = 'idea' | 'scripting' | 'production' | 'published' | 'viral' | 'archived';

export interface MetricEntry {
    id: string;
    session_id: string;
    recorded_at: string;
    platform: 'TikTok' | 'Instagram' | 'YouTube' | 'Other';
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    watch_time_avg: string;
}

export interface Session {
  id: string;
  created_at: string; // Renamed from createdAt to match Supabase convention
  title: string;
  original_transcript: string; // Renamed from originalTranscript
  analysis: AnalysisResult | null;
  generated_scripts: GeneratedScript[]; // Renamed from generatedScripts
  image_prompts: { [scriptIndex: number]: string[] }; // Renamed from imagePrompts
  social_metadata?: SocialPlatformMetadata[]; // New field for Social Media
  chat_history?: ChatMessage[]; // New field for Mentor Chat
  // Fields below are for client-side state only, not persisted to DB
  storyboardImages: { [scriptIndex: number]: { [promptIndex: number]: string } }; 
  generatedImages: string[]; 
  generatedAudioBase64: string;
  
  // New fields for Performance View
  status?: ProjectStatus;
  published_title?: string;
  published_description?: string;
  published_url?: string;
  published_at?: string;
  published_platform?: string;
}

// --- Brand Kit type ---
export interface BrandKit {
  user_id: string;
  tone_of_voice: string;
  visual_style: string;
  target_audience: string;
  content_language?: string; 
  gemini_api_key?: string; // New field for BYOK
}

// --- New Deep Analysis types for Landing Page Analyst ---

export interface ProductDescription {
  productName: string;
  format: string;
  objective: string;
  extras: string;
}

export interface ValueProposition {
  centralPromise: string;
  extendedValue: string[];
  summary: string;
}

export interface IdealAvatar {
  socioemotionalProfile: string[];
  mainMotivations: string[];
  painsResolved: string[];
}

export interface LandingPageStructure {
  heroSection: string[];
  contentDemonstration: string[];
  studyPlan: string[];
  bonuses: string[];
  objectionHandling: string[];
  guarantee: string[];
}

export interface MentalTriggers {
  triggers: string[];
}

export interface BrandingStyle {
  nameAnalysis: string;
  toneOfVoice: string;
  expectedAesthetics: string;
  emotionalPromise: string;
}

export interface StrategicRecommendations {
  recommendations: string[];
}

export interface BuyerPersona {
  name: string;
  profile: string;
  motivations: string[];
  fearsAndObjections: string[];
  activatingMessages: string[];
  idealChannels: string;
  contentType: string;
}

export interface ProblemSolution {
  problem: string;
  solution: string;
}

export interface LandingPageAnalysis {
  id: string;
  created_at: string;
  url: string;
  product_description: ProductDescription;
  value_proposition: ValueProposition;
  ideal_avatar: IdealAvatar;
  landing_page_structure: LandingPageStructure;
  mental_triggers: MentalTriggers;
  branding_style: BrandingStyle;
  strategic_recommendations: StrategicRecommendations;
  conclusion: string;
  buyer_personas: BuyerPersona[];
  initial_problems_and_solutions: ProblemSolution[];
  growth_problems_and_solutions: ProblemSolution[];
}


export interface LandingPageAnalysisState {
    url: string;
    result: LandingPageAnalysis | null;
    isLoading: boolean;
    error: string | null;
    identifiedTopics: string[] | null;
    selectedTopic: string | null;
    preAnalysisLoading: boolean;
}

// --- Access Requests ---
export interface AccessRequest {
    id: string;
    email: string;
    name: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

// Window interface extension for aistudio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // FIX: Make aistudio optional to resolve "All declarations of 'aistudio' must have identical modifiers." error.
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
    jspdf: any; // Add jspdf to window
  }
}