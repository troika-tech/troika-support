import apiService from './api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface EvaluationResult {
  score: number;
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

export interface AIStatus {
  isReady: boolean;
  provider: string;
  message: string;
}

class AIService {
  /**
   * Check AI service status
   */
  async getStatus(): Promise<AIStatus> {
    return apiService.get<AIStatus>('/ai/status');
  }

  /**
   * Evaluate user's response
   */
  async evaluateResponse(
    userResponse: string,
    scenarioId: string
  ): Promise<{ evaluation: EvaluationResult }> {
    return apiService.post('/ai/evaluate', {
      userResponse,
      scenarioId,
    });
  }

  /**
   * Generate coaching correction (non-streaming)
   */
  async generateCorrection(
    userResponse: string,
    scenarioId: string
  ): Promise<{ correction: string }> {
    return apiService.post('/ai/correction', {
      userResponse,
      scenarioId,
    });
  }

  /**
   * Generate coaching correction (streaming SSE)
   */
  async generateCorrectionStream(
    userResponse: string,
    scenarioId: string,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/api/ai/correction/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userResponse,
        scenarioId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Streaming error');
    }
  }

  /**
   * Generate customer objection (non-streaming)
   */
  async generateCustomerObjection(scenarioId: string): Promise<{ objection: string }> {
    return apiService.post('/ai/customer-objection', {
      scenarioId,
    });
  }

  /**
   * Generate customer objection (streaming SSE)
   */
  async generateCustomerObjectionStream(
    scenarioId: string,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/api/ai/customer-objection/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scenarioId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Streaming error');
    }
  }

  /**
   * Improve response with corrections
   */
  async improveResponse(
    userResponse: string,
    corrections: string[]
  ): Promise<{ improvedResponse: string }> {
    return apiService.post('/ai/improve', {
      userResponse,
      corrections,
    });
  }

  /**
   * Evaluate complete conversation
   */
  async evaluateConversation(
    conversationHistory: Array<{ role: string; content: string }>,
    scenarioId: string
  ): Promise<{
    evaluation: {
      overallScore: number;
      summary: string;
      keyTakeaways: string[];
    };
  }> {
    return apiService.post('/ai/evaluate-conversation', {
      conversationHistory,
      scenarioId,
    });
  }

  /**
   * Generate scenario with industry context (streaming SSE)
   */
  async generateScenarioStream(
    scenarioId: string,
    industry: string | undefined,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/api/ai/generate-scenario/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scenarioId,
        industry,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Streaming error');
    }
  }

  /**
   * Analyze user response (streaming SSE)
   */
  async analyzeResponseStream(
    userResponse: string,
    scenarioId: string,
    conversationContext: Array<{ role: string; content: string }>,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/api/ai/analyze-response/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userResponse,
        scenarioId,
        conversationContext,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value} = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Streaming error');
    }
  }

  /**
   * Continue conversation - Generate next customer message (streaming SSE)
   */
  async continueConversationStream(
    scenarioId: string,
    conversationContext: Array<{ role: string; content: string }>,
    industry: string | undefined,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/api/ai/continue-conversation/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scenarioId,
        conversationContext,
        industry,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Streaming error');
    }
  }
}

export default new AIService();
