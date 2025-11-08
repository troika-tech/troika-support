import { useState, useCallback } from 'react';
import aiService from '../services/ai.service';

export const useAIStreaming = () => {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamCorrection = useCallback(
    async (userResponse: string, scenarioId: string) => {
      setContent('');
      setError(null);
      setIsStreaming(true);

      try {
        await aiService.generateCorrectionStream(
          userResponse,
          scenarioId,
          (chunk) => {
            setContent((prev) => prev + chunk);
          },
          () => {
            setIsStreaming(false);
          },
          (err) => {
            setError(err);
            setIsStreaming(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Streaming failed');
        setIsStreaming(false);
      }
    },
    []
  );

  const streamCustomerObjection = useCallback(
    async (scenarioId: string) => {
      setContent('');
      setError(null);
      setIsStreaming(true);

      try {
        await aiService.generateCustomerObjectionStream(
          scenarioId,
          (chunk) => {
            setContent((prev) => prev + chunk);
          },
          () => {
            setIsStreaming(false);
          },
          (err) => {
            setError(err);
            setIsStreaming(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Streaming failed');
        setIsStreaming(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    content,
    isStreaming,
    error,
    streamCorrection,
    streamCustomerObjection,
    reset,
  };
};
