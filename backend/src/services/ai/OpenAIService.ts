import OpenAI from 'openai';
import logger from '../../utils/logger';
import {
  AIMessage,
  AIResponse,
  EvaluationResult,
  ScenarioContext,
  StreamCallback,
} from './types';
import {
  TRAINING_GROUND_CONVERSATION_SYSTEM_PROMPT,
  TRAINING_GROUND_CUSTOMER_SYSTEM_PROMPT,
  TRAINING_GROUND_SCENARIO_PROMPT,
  RESPONSE_ANALYSIS_SYSTEM_PROMPT,
  EVALUATION_PROMPT,
  CORRECTION_PROMPT,
  RESPONSE_IMPROVEMENT_PROMPT,
} from './prompts';

class OpenAIService {
  private client: OpenAI | null = null;
  private model: string = 'gpt-4o-mini'; // Using GPT-4o-mini for cost efficiency
  private visionModel: string = 'gpt-4o-mini';

  /**
   * Get or create OpenAI client (lazy initialization)
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      this.client = new OpenAI({
        apiKey,
      });
    }

    return this.client;
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Generate a response (non-streaming)
   */
  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        tokenUsage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      logger.error('OpenAI generate response error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Generate a streaming response (SSE)
   */
  async generateStreamingResponse(
    messages: AIMessage[],
    callback: StreamCallback
  ): Promise<void> {
    try {
      const stream = await this.getClient().chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';

        if (content) {
          fullContent += content;
          callback({
            content,
            done: false,
          });
        }
      }

      // Send final chunk
      callback({
        content: '',
        done: true,
      });

      logger.info('Streaming response completed', {
        contentLength: fullContent.length,
      });
    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  /**
   * Generate customer objection response
   */
  async generateCustomerResponse(
    scenario: ScenarioContext,
    conversationHistory: AIMessage[]
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: TRAINING_GROUND_CUSTOMER_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: TRAINING_GROUND_SCENARIO_PROMPT(scenario),
      },
      ...conversationHistory,
    ];

    return this.generateResponse(messages);
  }

  /**
   * Generate customer objection response (streaming)
   */
  async generateCustomerResponseStream(
    scenario: ScenarioContext,
    conversationHistory: AIMessage[],
    callback: StreamCallback
  ): Promise<void> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: TRAINING_GROUND_CUSTOMER_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: TRAINING_GROUND_SCENARIO_PROMPT(scenario),
      },
      ...conversationHistory,
    ];

    return this.generateStreamingResponse(messages, callback);
  }

  /**
   * Evaluate salesperson's response
   */
  async evaluateResponse(
    userResponse: string,
    scenario: ScenarioContext
  ): Promise<EvaluationResult> {
    try {
      const prompt = EVALUATION_PROMPT(userResponse, scenario.idealResponse, scenario);

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: RESPONSE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.generateResponse(messages);

      // Parse JSON response
      const evaluation = JSON.parse(response.content);

      logger.info('Response evaluated', {
        score: evaluation.score,
        userId: 'unknown',
      });

      return evaluation as EvaluationResult;
    } catch (error) {
      logger.error('Evaluation error:', error);

      // Return default evaluation on error
      return {
        score: 50,
        strengths: ['Attempted to respond'],
        weaknesses: ['Unable to evaluate properly'],
        corrections: ['Try to be more specific'],
        improvedVersion: userResponse,
        metrics: {
          confidence: 50,
          clarity: 50,
          structure: 50,
          objectionHandling: 50,
          closing: 50,
        },
        coachingNotes: 'Keep practicing!',
      };
    }
  }

  /**
   * Generate coaching correction
   */
  async generateCorrection(
    userResponse: string,
    scenario: ScenarioContext
  ): Promise<string> {
    try {
      const prompt = CORRECTION_PROMPT(userResponse, scenario);

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: RESPONSE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.generateResponse(messages);

      return response.content;
    } catch (error) {
      logger.error('Correction generation error:', error);
      return 'Great attempt! Keep practicing to refine your approach.';
    }
  }

  /**
   * Generate coaching correction (streaming)
   */
  async generateCorrectionStream(
    userResponse: string,
    scenario: ScenarioContext,
    callback: StreamCallback
  ): Promise<void> {
    try {
      const prompt = CORRECTION_PROMPT(userResponse, scenario);

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: RESPONSE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      return this.generateStreamingResponse(messages, callback);
    } catch (error) {
      logger.error('Streaming correction error:', error);
      throw error;
    }
  }

  /**
   * Improve user's response based on corrections
   */
  async improveResponse(userResponse: string, corrections: string[]): Promise<string> {
    try {
      const prompt = RESPONSE_IMPROVEMENT_PROMPT(userResponse, corrections);

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: RESPONSE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.generateResponse(messages);

      return response.content.trim();
    } catch (error) {
      logger.error('Response improvement error:', error);
      return userResponse; // Return original on error
    }
  }

  /**
   * Generate Troika Sales Captain response
   */
  async generateCoachResponse(
    conversationHistory: AIMessage[],
    _scenario: ScenarioContext
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: TRAINING_GROUND_CONVERSATION_SYSTEM_PROMPT,
      },
      ...conversationHistory,
    ];

    return this.generateResponse(messages);
  }

  /**
   * Generate Troika Sales Captain response (streaming)
   */
  async generateCoachResponseStream(
    conversationHistory: AIMessage[],
    _scenario: ScenarioContext,
    callback: StreamCallback
  ): Promise<void> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: TRAINING_GROUND_CONVERSATION_SYSTEM_PROMPT,
      },
      ...conversationHistory,
    ];

    return this.generateStreamingResponse(messages, callback);
  }

  /**
   * Generate embedding for a single text using text-embedding-3-small
   * @param text - Text to generate embedding for
   * @returns 1536-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.getClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      logger.info('Generated embedding', {
        textLength: text.length,
        embeddingDimensions: embedding.length,
      });

      return embedding;
    } catch (error) {
      logger.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of 1536-dimensional embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI supports batch embedding (up to 2048 inputs)
      const response = await this.getClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });

      const embeddings = response.data.map(item => item.embedding);

      logger.info('Generated batch embeddings', {
        count: texts.length,
        embeddingDimensions: embeddings[0]?.length || 0,
      });

      return embeddings;
    } catch (error) {
      logger.error('Batch embedding generation error:', error);
      throw new Error('Failed to generate batch embeddings');
    }
  }

  /**
   * Transcribe text from an image using GPT-4o vision capabilities
   */
  async transcribeImage(imageDataUrl: string): Promise<string> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: this.visionModel,
        temperature: 0,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: 'You are an OCR assistant. Extract all readable text from the image. Preserve speaker names, timestamps, and message order exactly as they appear. If no text is present, reply with NO_TEXT_DETECTED.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe every word visible in this screenshot. Include emojis as text (e.g., :smile:).'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
      });

      const transcript = response.choices[0]?.message?.content?.trim() ?? '';

      logger.info('Image transcription completed', {
        hasTranscript: transcript.length > 0,
        tokenUsage: response.usage,
      });

      return transcript;
    } catch (error) {
      logger.error('Image transcription error:', error);
      throw new Error('Failed to transcribe image');
    }
  }
}

export default new OpenAIService();
