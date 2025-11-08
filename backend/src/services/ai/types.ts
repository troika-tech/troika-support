// AI Service Types

export type AIMessageContent =
  | string
  | Array<
      | {
          type: 'text';
          text: string;
        }
      | {
          type: 'image_url';
          image_url: {
            url: string;
          };
        }
    >;

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: AIMessageContent;
}

export interface AIResponse {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EvaluationResult {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  corrections: string[];
  improvedVersion: string;
  metrics: {
    confidence: number;
    clarity: number;
    structure: number;
    objectionHandling: number;
    closing: number;
  };
  coachingNotes: string;
}

export interface ScenarioContext {
  scenarioId: string;
  day: number;
  theme: string;
  customerMessage: string;
  idealResponse: string;
  coachingNotes: string[];
  toneGuidelines: string[];
  commonMistakes: string[];
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  conversationHistory: AIMessage[];
  scenario: ScenarioContext;
  currentStep: 'customer_objection' | 'salesperson_response' | 'coach_correction' | 'salesperson_repeat';
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export type StreamCallback = (chunk: StreamChunk) => void;

export type SimulationDifficulty = 'easy' | 'standard' | 'hard';

export type SimulationPersona = 'serious' | 'busy' | 'skeptical' | 'curious';

export interface SimulationScenario {
  id: string;
  theme: string;
  title: string;
  personaOptions: SimulationPersona[];
  difficulty: SimulationDifficulty;
  starterMessage: string;
  tags: string[];
}
