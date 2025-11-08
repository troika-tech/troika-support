import mongoose from 'mongoose';
import OpenAIService from './OpenAIService';
import { TrainingScenario } from '../../models';
import logger from '../../utils/logger';
import {
  AIMessage,
  EvaluationResult,
  ScenarioContext,
  ConversationContext,
  StreamCallback,
  AIMessageContent,
  SimulationScenario,
  SimulationPersona,
  SimulationDifficulty,
} from './types';
import {
  RESPONSE_ANALYSIS_SYSTEM_PROMPT,
  ROLEPLAY_SIMULATION_SYSTEM_PROMPT,
  ROLEPLAY_SIMULATION_PROMPT,
  ROLEPLAY_CONVERSATION_ANALYSIS_SYSTEM_PROMPT,
  ROLEPLAY_CONVERSATION_ANALYSIS_PROMPT,
} from './prompts';
import { SIMULATION_SCENARIOS } from '../../data/simulationScenarios';

const extractTextFromContent = (content: AIMessageContent): string => {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }

      if (part.type === 'image_url') {
        return '[Image Attachment]';
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
};

const SIMULATION_PERSONA_BEHAVIORS: Record<SimulationPersona, string> = {
  serious: 'Direct, composed, and detail-focused. Ask pointed questions, challenge vague claims, and expect structured answers.',
  busy: 'Short, time-pressed replies. Push for clarity fast, cut off fluff, and remind the salesperson you have limited time.',
  skeptical: 'Assume the rep is overselling. Demand proof, compare competitors, and keep highlighting risks until they earn trust.',
  curious: 'Engage with thoughtful questions and what-if scenarios. You are open-minded but still expect logic and clarity at every step.',
};

const SIMULATION_DIFFICULTY_BEHAVIORS: Record<SimulationDifficulty, string> = {
  easy: 'Be reasonably cooperative once the rep addresses your concern. Offer hints about what you need and reward good answers by moving the deal forward.',
  standard: 'Balance tension with progress. Keep pressure on real objections, expect specifics, and only soften when the rep shows clear understanding.',
  hard: 'Stay guarded and demanding. Layer objections, compare other vendors, and hold your position until the rep provides compelling proof or structure.',
};

const sanitizeJsonResponse = (content: string): string => {
  let sanitized = content.trim();

  if (sanitized.startsWith('```')) {
    sanitized = sanitized.replace(/^```(?:json)?\s*/i, '');
  }

  if (sanitized.endsWith('```')) {
    sanitized = sanitized.replace(/```$/, '');
  }

  return sanitized.trim();
};

class AIService {
  private provider: typeof OpenAIService;
  private simulationScenarios: SimulationScenario[] = SIMULATION_SCENARIOS;

  constructor() {
    // Default to OpenAI (can be extended to support Anthropic)
    this.provider = OpenAIService;
  }

  private formatIndustry(industry?: string): string {
    if (!industry) {
      return '';
    }

    const normalized = industry.toLowerCase();
    const specialCases: Record<string, string> = {
      saas: 'SaaS',
      ecommerce: 'E-commerce',
    };

    if (specialCases[normalized]) {
      return specialCases[normalized];
    }

    return industry
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if AI service is configured and ready
   */
  isReady(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Get provider name
   */
  getProvider(): string {
    return 'openai';
  }

  /**
   * Load scenario context from database or use predefined scenarios
   */
  async loadScenarioContext(scenarioId: string): Promise<ScenarioContext | null> {
    try {
      // First, try to load from database (for MongoDB ObjectId scenarios)
      if (mongoose.Types.ObjectId.isValid(scenarioId)) {
        const scenario = await TrainingScenario.findById(scenarioId);

        if (scenario && scenario.isActive) {
          const firstScenario = scenario.scenarios[0];

          if (firstScenario) {
            return {
              scenarioId: (scenario._id as mongoose.Types.ObjectId).toString(),
              day: scenario.day,
              theme: scenario.theme,
              customerMessage: firstScenario.customerMessage,
              idealResponse: firstScenario.idealResponse,
              coachingNotes: firstScenario.coachingNotes,
              toneGuidelines: firstScenario.toneGuidelines,
              commonMistakes: firstScenario.commonMistakes,
            };
          }
        }
      }

      // If not found in DB, use predefined training ground scenarios
      const predefinedScenario = this.getPredefinedScenario(scenarioId);
      if (predefinedScenario) {
        return predefinedScenario;
      }

      const simulationScenario = this.getSimulationScenarioById(scenarioId);
      if (simulationScenario) {
        return this.mapSimulationScenarioToContext(simulationScenario);
      }

      logger.warn(`Scenario not found: ${scenarioId}`);
      return null;
    } catch (error) {
      logger.error('Error loading scenario context:', error);
      return null;
    }
  }

  /**
   * List configured simulation scenarios with optional difficulty filter
   */
  getSimulationScenarios(difficulty?: SimulationDifficulty): SimulationScenario[] {
    const filtered = difficulty
      ? this.simulationScenarios.filter((scenario) => scenario.difficulty === difficulty)
      : this.simulationScenarios;

    return filtered.map((scenario) => ({
      ...scenario,
      personaOptions: [...scenario.personaOptions],
      tags: [...scenario.tags],
    }));
  }

  private getSimulationScenarioById(scenarioId: string): SimulationScenario | undefined {
    return this.simulationScenarios.find((scenario) => scenario.id === scenarioId);
  }

  private mapSimulationScenarioToContext(scenario: SimulationScenario): ScenarioContext {
    const personaSummary = scenario.personaOptions.length
      ? `Persona cues: ${scenario.personaOptions.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`
      : 'Persona cues: general business buyer.';

    const difficultySummary = `Difficulty: ${scenario.difficulty}`;
    const tagsSummary = scenario.tags.length ? `Focus areas: ${scenario.tags.join(', ')}` : 'Focus: general objection handling.';

    return {
      scenarioId: scenario.id,
      day: 0,
      theme: scenario.theme,
      customerMessage: scenario.starterMessage,
      idealResponse: 'Handle the objection by quantifying value, reinforcing 1 lakh starter pack, and ending with a question.',
      coachingNotes: [personaSummary, difficultySummary, tagsSummary],
      toneGuidelines: ['Calm and confident', 'Value-focused', 'Specific and consultative'],
      commonMistakes: ['Giving vague reassurances', 'Ignoring the stated objection', 'Failing to ask a follow-up question'],
    };
  }

  /**
   * Get predefined scenario context for training ground
   */
  private getPredefinedScenario(scenarioId: string): ScenarioContext | null {
    const scenarios: Record<string, Omit<ScenarioContext, 'scenarioId'>> = {
      'objection-handling': {
        day: 1,
        theme: 'Objection Handling',
        customerMessage: "I'm not sure if this is the right fit for us right now.",
        idealResponse: "I understand your hesitation. Can you share what specific concerns you have?",
        coachingNotes: ['Acknowledge concerns', 'Ask clarifying questions', 'Focus on understanding'],
        toneGuidelines: ['Professional yet empathetic', 'Consultative approach'],
        commonMistakes: ['Being too pushy', 'Not addressing the real concern'],
      },
      'product-demo': {
        day: 2,
        theme: 'Product Demo',
        customerMessage: "Can you show me how this actually works?",
        idealResponse: "Absolutely! Before we dive in, what specific features interest you most?",
        coachingNotes: ['Qualify before demoing', 'Focus on relevant features'],
        toneGuidelines: ['Enthusiastic but not overwhelming', 'Educational'],
        commonMistakes: ['Feature dumping', 'Not asking about needs'],
      },
      'closing-techniques': {
        day: 3,
        theme: 'Closing Techniques',
        customerMessage: "This looks good, but I need to think about it.",
        idealResponse: "Of course. What specific aspects would you like to consider?",
        coachingNotes: ['Create urgency without pressure', 'Identify hidden objections'],
        toneGuidelines: ['Confident yet respectful', 'Assumptive close'],
        commonMistakes: ['Accepting think about it at face value', 'Being too aggressive'],
      },
      'discovery-call': {
        day: 4,
        theme: 'Discovery Call',
        customerMessage: "Hi, I'm interested in learning more about your services.",
        idealResponse: "Great! Can you tell me what prompted you to reach out today?",
        coachingNotes: ['Ask open-ended questions', 'Listen more than speak'],
        toneGuidelines: ['Curious and consultative', 'Professional'],
        commonMistakes: ['Jumping into pitch too quickly', 'Not asking enough questions'],
      },
      'negotiation': {
        day: 5,
        theme: 'Negotiation',
        customerMessage: "Your pricing is higher than I expected. Can you do better?",
        idealResponse: "I appreciate you being upfront. Our pricing reflects the value we provide. What budget did you have in mind?",
        coachingNotes: ['Defend value before discounting', 'Understand budget constraints'],
        toneGuidelines: ['Confident in value', 'Collaborative problem-solving'],
        commonMistakes: ['Discounting immediately', 'Getting defensive'],
      },
      'trial-small-pack-objections': {
        day: 6,
        theme: 'Trial & Small Pack Objections',
        customerMessage: "Can I just try a small package first to test it out?",
        idealResponse: "I understand wanting to start small. What specific outcomes are you hoping to see from a trial?",
        coachingNotes: ['Set proper expectations', 'Explain minimum commitment'],
        toneGuidelines: ['Understanding but educational', 'Consultative'],
        commonMistakes: ['Agreeing to ineffective trial sizes', 'Not explaining rationale'],
      },
      'pricing-discount-objections': {
        day: 7,
        theme: 'Pricing & Discount Objections',
        customerMessage: "Do you have any discounts or promotions running?",
        idealResponse: "Let me focus on the right solution first. What specific results are you looking to achieve?",
        coachingNotes: ['Redirect to value conversation', 'Qualify before discussing discounts'],
        toneGuidelines: ['Value-focused', 'Professional'],
        commonMistakes: ['Leading with discounts', 'Devaluing the product'],
      },
      'targeting-audience-clarity': {
        day: 8,
        theme: 'Targeting & Audience Clarity',
        customerMessage: "I'm not sure who exactly my target audience should be.",
        idealResponse: "Great question. Let's start with your current customers - who's buying from you now?",
        coachingNotes: ['Help clarify ideal customer', 'Use data and insights'],
        toneGuidelines: ['Advisory', 'Strategic partner'],
        commonMistakes: ['Not taking time to help clarify', 'Being too generic'],
      },
      'silent-lead-followups': {
        day: 9,
        theme: 'Silent Lead Follow-ups',
        customerMessage: "[No response to previous messages]",
        idealResponse: "Hi, I wanted to reach out one more time. I had a thought about [value point]. Would it be helpful?",
        coachingNotes: ['Provide new value in follow-up', 'Give permission to say no'],
        toneGuidelines: ['Light and non-pushy', 'Value-focused'],
        commonMistakes: ['Generic checking in messages', 'Being too persistent'],
      },
      'intro-first-message-mastery': {
        day: 10,
        theme: 'Intro & First Message Mastery',
        customerMessage: "[New lead - first contact]",
        idealResponse: "Hi! I noticed [observation]. I work with [companies] helping them [outcome]. Would you be open to a brief conversation?",
        coachingNotes: ['Personalize the message', 'Lead with value'],
        toneGuidelines: ['Friendly and professional', 'Specific and relevant'],
        commonMistakes: ['Generic templates', 'Too much about you'],
      },
      'urgency-value-positioning': {
        day: 11,
        theme: 'Urgency & Value Positioning',
        customerMessage: "I might be interested, but I don't see why I need to decide now.",
        idealResponse: "Fair point. Let me share why timing matters. [Reason]. What would starting next week vs. next month mean for your goals?",
        coachingNotes: ['Create authentic urgency', 'Connect to their goals'],
        toneGuidelines: ['Helpful not pushy', 'Future-focused'],
        commonMistakes: ['Fake scarcity', 'Being too aggressive'],
      },
      'bulk-deal-handling': {
        day: 12,
        theme: 'Bulk Deal Handling (10L–50L)',
        customerMessage: "We're looking at a large order, around 25-30 lakhs. What kind of package can you offer?",
        idealResponse: "That's fantastic! Before I present options, I'd love to understand your expected ROI and timeline.",
        coachingNotes: ['Qualify thoroughly', 'Present tiered options'],
        toneGuidelines: ['Enterprise-level professionalism', 'Strategic partnership'],
        commonMistakes: ['Rushing to discount', 'Not qualifying properly'],
      },
    };

    const scenario = scenarios[scenarioId];
    return scenario ? { ...scenario, scenarioId } : null;
  }

  private buildSimulationSystemPrompt(
    scenario: SimulationScenario,
    persona: SimulationPersona
  ): string {
    const personaGuidance = SIMULATION_PERSONA_BEHAVIORS[persona] || 'Stay pragmatic, grounded, and realistic.';
    const difficultyGuidance =
      SIMULATION_DIFFICULTY_BEHAVIORS[scenario.difficulty] || 'Match the salesperson energy but keep control of the conversation.';

    return `You are the customer in a WhatsApp sales role-play.
Persona cues (${persona}): ${personaGuidance}
Difficulty (${scenario.difficulty.toUpperCase()}): ${difficultyGuidance}

Rules:
- Stay entirely in character as this buyer. Never reveal you are a simulation or give sales coaching.
- Keep responses WhatsApp-short (2-4 sentences) but meaningful.
- Reference the scenario theme (${scenario.theme}) and keep objections tied to ${scenario.tags.join(', ')}.
- React directly to the salesperson's last message before adding a fresh objection or question.
- Maintain natural language, light punctuation, and avoid bullet points.`;
  }

  private buildSimulationPrompt(
    scenario: SimulationScenario,
    conversationHistory: Array<{ role: string; content: string }>
  ): string {
    const history = (conversationHistory?.length ? [...conversationHistory] : []) as Array<{
      role: string;
      content: string;
    }>;

    if (history.length === 0) {
      history.push({
        role: 'assistant',
        content: scenario.starterMessage,
      });
    }

    const formattedHistory = history
      .map((message, index) => {
        const speaker = message.role === 'assistant' ? 'Customer' : 'Sales Rep';
        const cleaned = message.content?.replace(/\s+/g, ' ').trim() || '';
        return `${index + 1}. ${speaker}: "${cleaned}"`;
      })
      .join('\n');

    return `Simulation Scenario: ${scenario.title}
Theme: ${scenario.theme}
Buyer focus tags: ${scenario.tags.join(', ')}

Conversation so far:
${formattedHistory}

Respond only as the customer with the next WhatsApp-style reply (2-4 sentences). Continue naturally from the latest Sales Rep message, press on the core objection, and keep tension alive until they earn movement.`;
  }

  /**
   * Generate next customer reply inside simulation experience
   */
  async generateSimulationReply(
    scenarioId: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    persona?: SimulationPersona,
    callback?: StreamCallback
  ): Promise<string> {
    const scenario = this.getSimulationScenarioById(scenarioId);

    if (!scenario) {
      throw new Error('Simulation scenario not found');
    }

    const validPersona =
      persona && scenario.personaOptions.includes(persona)
        ? persona
        : scenario.personaOptions[0] || 'serious';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.buildSimulationSystemPrompt(scenario, validPersona),
      },
      {
        role: 'user',
        content: this.buildSimulationPrompt(scenario, conversationHistory),
      },
    ];

    if (callback) {
      let fullContent = '';
      await this.provider.generateStreamingResponse(messages, (chunk) => {
        if (!chunk.done) {
          fullContent += chunk.content;
        }
        callback(chunk);
      });
      return fullContent;
    }

    const response = await this.provider.generateResponse(messages);
    return response.content;
  }

  /**
   * Generate customer objection (initial message)
   */
  async generateCustomerObjection(
    scenario: ScenarioContext,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      if (callback) {
        // Streaming response
        let fullContent = '';

        await this.provider.generateCustomerResponseStream(
          scenario,
          [],
          (chunk) => {
            if (!chunk.done) {
              fullContent += chunk.content;
            }
            callback(chunk);
          }
        );

        return fullContent;
      } else {
        // Non-streaming
        const response = await this.provider.generateCustomerResponse(scenario, []);
        return response.content;
      }
    } catch (error) {
      logger.error('Error generating customer objection:', error);
      // Fallback to scenario's default message
      return scenario.customerMessage;
    }
  }

  /**
   * Evaluate salesperson's response
   */
  async evaluateResponse(
    userResponse: string,
    scenarioId: string
  ): Promise<EvaluationResult | null> {
    try {
      const scenario = await this.loadScenarioContext(scenarioId);

      if (!scenario) {
        return null;
      }

      return await this.provider.evaluateResponse(userResponse, scenario);
    } catch (error) {
      logger.error('Error evaluating response:', error);
      return null;
    }
  }

  /**
   * Generate coaching correction with feedback
   */
  async generateCorrection(
    userResponse: string,
    scenarioId: string,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      const scenario = await this.loadScenarioContext(scenarioId);

      if (!scenario) {
        return 'Unable to generate correction. Please try again.';
      }

      if (callback) {
        // Streaming response
        let fullContent = '';

        await this.provider.generateCorrectionStream(
          userResponse,
          scenario,
          (chunk) => {
            if (!chunk.done) {
              fullContent += chunk.content;
            }
            callback(chunk);
          }
        );

        return fullContent;
      } else {
        // Non-streaming
        return await this.provider.generateCorrection(userResponse, scenario);
      }
    } catch (error) {
      logger.error('Error generating correction:', error);
      return 'Keep practicing! Try to focus on clarity and confidence in your response.';
    }
  }

  /**
   * Improve user's response with corrections applied
   */
  async improveResponse(
    userResponse: string,
    corrections: string[]
  ): Promise<string> {
    try {
      return await this.provider.improveResponse(userResponse, corrections);
    } catch (error) {
      logger.error('Error improving response:', error);
      return userResponse;
    }
  }

  /**
   * Generate next AI response in conversation
   * Determines context and generates appropriate response
   */
  async generateNextResponse(
    context: ConversationContext,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      const { currentStep, conversationHistory, scenario } = context;

      let response: string;

      switch (currentStep) {
        case 'customer_objection':
          // Generate customer objection/follow-up
          response = await this.generateCustomerObjection(scenario, callback);
          break;

        case 'coach_correction': {
          // Generate coaching feedback
          const lastUserMessage = conversationHistory
            .filter((m) => m.role === 'user')
            .pop();

          if (lastUserMessage) {
            const lastUserMessageContent = extractTextFromContent(lastUserMessage.content);

            response = await this.generateCorrection(
              lastUserMessageContent,
              scenario.scenarioId,
              callback
            );
          } else {
            response = 'Please provide your response to the customer objection.';
          }
          break;
        }

        default:
          response = 'Continue with your training session.';
          break;
      }

      return response;
    } catch (error) {
      logger.error('Error generating next response:', error);
      return 'An error occurred. Please try again.';
    }
  }

  /**
   * Complete conversation evaluation
   * Evaluates entire conversation and provides summary
   */
  async evaluateConversation(
    conversationHistory: AIMessage[],
    scenario: ScenarioContext
  ): Promise<{
    overallScore: number;
    summary: string;
    keyTakeaways: string[];
  }> {
    try {
      if (conversationHistory.length === 0) {
        return {
          overallScore: 0,
          summary: 'No conversation turns provided.',
          keyTakeaways: [],
        };
      }

      const transcript = conversationHistory
        .map((message, index) => {
          const speaker = message.role === 'assistant' ? 'Customer' : 'Sales Rep';
          return `${index + 1}. ${speaker}: "${extractTextFromContent(message.content)}"`;
        })
        .join('\n');

      if (!transcript.trim()) {
        return {
          overallScore: 0,
          summary: 'No analyzable conversation content.',
          keyTakeaways: [],
        };
      }

      const prompt = ROLEPLAY_CONVERSATION_ANALYSIS_PROMPT(scenario, transcript);
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: ROLEPLAY_CONVERSATION_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.provider.generateResponse(messages);
      const cleanedContent = sanitizeJsonResponse(response.content);
      const parsed = JSON.parse(cleanedContent);

      return {
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 0,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'No summary provided.',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      };
    } catch (error) {
      logger.error('Error evaluating conversation:', error);
      return {
        overallScore: 0,
        summary: 'Unable to evaluate conversation.',
        keyTakeaways: [],
      };
    }
  }

  /**
   * Generate scenario-based conversation starter with industry context
   */
  async generateScenarioWithIndustry(
    scenario: ScenarioContext,
    industry: string | undefined,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      // Create enhanced scenario context with industry
      const formattedIndustry = this.formatIndustry(industry);
      const enhancedScenario = {
        ...scenario,
        industryContext: formattedIndustry || 'general business',
      };

      if (callback) {
        // Streaming response
        let fullContent = '';

        await this.provider.generateCustomerResponseStream(
          enhancedScenario,
          [],
          (chunk) => {
            if (!chunk.done) {
              fullContent += chunk.content;
            }
            callback(chunk);
          }
        );

        return fullContent;
      } else {
        // Non-streaming
        const response = await this.provider.generateCustomerResponse(enhancedScenario, []);
        return response.content;
      }
    } catch (error) {
      logger.error('Error generating scenario with industry:', error);
      // Fallback to scenario's default message
      return scenario.customerMessage;
    }
  }

  /**
   * Analyze user response in real-time
   * Provides instant feedback on strengths and areas for improvement
   */
  async analyzeUserResponse(
    userResponse: string,
    scenario: ScenarioContext,
    conversationContext: Array<{ role: string; content: string }>,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      // Build the full conversation exchange showing Customer -> Salesperson pattern
      const previousExchanges = conversationContext.slice(0, -1); // Exclude the current message
      const conversationHistoryText = previousExchanges.length > 0
        ? `PREVIOUS SALES REP RESPONSES:\n${previousExchanges
            .map((msg, i) => `${i + 1}. "${extractTextFromContent(msg.content)}"`)
            .join('\n')}\n\n`
        : '';

      const analysisPrompt = `SCENARIO: ${scenario.theme}
CUSTOMER MESSAGE: "${scenario.customerMessage}"
${conversationHistoryText}CURRENT SALES REP RESPONSE: "${userResponse}"

COACHING NOTES:
${scenario.coachingNotes.map((note, i) => `${i + 1}. ${note}`).join('\n')}

TONE GUIDELINES:
${scenario.toneGuidelines.join(', ')}

COMMON MISTAKES TO WATCH FOR:
${scenario.commonMistakes.map((mistake, i) => `${i + 1}. ${mistake}`).join('\n')}

Provide feedback with the following sections:
**STRENGTHS**
- ...
**AREAS TO IMPROVE**
- ...
**QUICK TIP**
One sentence with an actionable suggestion. Keep the tone encouraging and specific.`;

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: RESPONSE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ];

      if (callback) {
        // Streaming response
        let fullContent = '';

        await this.provider.generateStreamingResponse(messages, (chunk) => {
          if (!chunk.done) {
            fullContent += chunk.content;
          }
          callback(chunk);
        });

        return fullContent;
      } else {
        // Non-streaming
        const response = await this.provider.generateResponse(messages);
        return response.content;
      }
    } catch (error) {
      logger.error('Error analyzing user response:', error);
      return 'Unable to analyze response at this time. Please continue practicing.';
    }
  }

  /**
   * Continue conversation - Generate next customer message based on conversation history
   */
  async continueConversation(
    scenario: ScenarioContext,
    conversationContext: Array<{ role: string; content: string }>,
    industry: string | undefined,
    callback?: StreamCallback
  ): Promise<string> {
    try {
      const conversationSummary = [
        `Customer: "${scenario.customerMessage}"`,
        ...conversationContext.map(
          (msg, i) => `${i + 1}. Sales Rep: "${extractTextFromContent(msg.content)}"`
        ),
      ]
        .filter(Boolean)
        .join('\n');

      const formattedIndustry = this.formatIndustry(industry);
      const continuePrompt = ROLEPLAY_SIMULATION_PROMPT(
        scenario,
        formattedIndustry,
        conversationSummary
      );

      const messages = [
        {
          role: 'system' as const,
          content: ROLEPLAY_SIMULATION_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: continuePrompt,
        },
      ];

      if (callback) {
        // Streaming response
        let fullContent = '';

        await this.provider.generateStreamingResponse(messages, (chunk) => {
          if (!chunk.done) {
            fullContent += chunk.content;
          }
          callback(chunk);
        });

        return fullContent;
      } else {
        // Non-streaming
        const response = await this.provider.generateResponse(messages);
        return response.content;
      }
    } catch (error) {
      logger.error('Error continuing conversation:', error);
      return 'I appreciate your response. Could you tell me more about how this would benefit my business?';
    }
  }

  /**
   * Generate streaming response with custom messages
   * General-purpose streaming method for AI responses
   */
  async generateStreamingResponse(
    messages: AIMessage[],
    callback: StreamCallback
  ): Promise<void> {
    return await this.provider.generateStreamingResponse(messages, callback);
  }
}

export default new AIService();

