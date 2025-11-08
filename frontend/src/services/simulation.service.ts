import apiService from './api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type SimulationDifficulty = 'easy' | 'standard' | 'hard';

export type SimulationPersona = 'serious' | 'busy' | 'skeptical' | 'curious';

export interface SimulationSituation {
  id: string;
  theme: string;
  title: string;
  personaOptions: SimulationPersona[];
  difficulty: SimulationDifficulty;
  starterMessage: string;
  tags: string[];
}

export interface SimulationMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

class SimulationService {
  async getSituations(difficulty?: SimulationDifficulty): Promise<{
    scenarios: SimulationSituation[];
  }> {
    const config = difficulty ? { params: { difficulty } } : undefined;
    return apiService.get('/simulation/situations', config);
  }

  async streamResponse(
    params: {
      scenarioId: string;
      persona?: SimulationPersona;
      conversationHistory: SimulationMessagePayload[];
    },
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const makeRequest = async (accessToken?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      return fetch(`${API_URL}/api/simulation/respond/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    };

    const handleExpiredSession = (): never => {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    };

    let token = localStorage.getItem('accessToken') || undefined;
    let response: Response;

    try {
      response = await makeRequest(token);

      if (response.status === 401) {
        try {
          const refreshResponse = await fetch(`${API_URL}/api/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
          });

          if (!refreshResponse.ok) {
            handleExpiredSession();
          }

          const refreshJson = await refreshResponse.json();
          const newAccessToken = refreshJson?.data?.accessToken;

          if (!newAccessToken) {
            handleExpiredSession();
          }

          localStorage.setItem('accessToken', newAccessToken);
          token = newAccessToken;
          response = await makeRequest(token);
        } catch {
          handleExpiredSession();
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to start simulation stream');
      return;
    }

    if (!response.ok || !response.body) {
      if (response.status === 401) {
        try {
          handleExpiredSession();
        } catch (sessionError) {
          onError(sessionError instanceof Error ? sessionError.message : 'Session expired');
          return;
        }
      }

      onError('Failed to start simulation stream');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let completed = false;
    let buffer = '';

    const flushBuffer = () => {
      let eventBoundary = buffer.indexOf('\n\n');

      while (eventBoundary !== -1) {
        const rawEvent = buffer.slice(0, eventBoundary);
        buffer = buffer.slice(eventBoundary + 2);

        const lines = rawEvent.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith('data: ')) {
            continue;
          }

          const payload = trimmed.substring(6).trim();

          if (!payload) {
            continue;
          }

          try {
            const data = JSON.parse(payload);

            if (data.type === 'content') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              completed = true;
              onComplete();
              return true;
            } else if (data.type === 'error') {
              onError(data.error || 'Simulation stream error');
              return true;
            }
          } catch {
            // Skip malformed payloads
          }
        }

        eventBoundary = buffer.indexOf('\n\n');
      }

      return false;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');

        const shouldStop = flushBuffer();
        if (shouldStop) {
          return;
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Simulation streaming error');
      return;
    }

    if (!completed && buffer.trim().length > 0) {
      buffer += '\n\n';
      const shouldStop = flushBuffer();
      if (shouldStop) {
        return;
      }
    }

    if (!completed) {
      onComplete();
    }
  }
}

export default new SimulationService();
