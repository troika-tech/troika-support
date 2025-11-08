import { NextFunction, Request, Response } from 'express';
import AIService from '../services/ai/AIService';
import { sendSuccess } from '../utils/helpers';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';
import { SimulationDifficulty, SimulationPersona } from '../services/ai/types';

const isSimulationDifficulty = (value: string): value is SimulationDifficulty =>
  ['easy', 'standard', 'hard'].includes(value);

const isSimulationPersona = (value: string): value is SimulationPersona =>
  ['serious', 'busy', 'skeptical', 'curious'].includes(value);

export const getSimulationSituations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawDifficulty = typeof req.query.difficulty === 'string'
      ? req.query.difficulty.toLowerCase()
      : undefined;

    const difficulty = rawDifficulty && isSimulationDifficulty(rawDifficulty)
      ? rawDifficulty
      : undefined;

    const scenarios = AIService.getSimulationScenarios(difficulty);

    sendSuccess(res, { scenarios }, 'Simulation scenarios fetched');
  } catch (error) {
    next(error);
  }
};

export const simulationRespondStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { scenarioId, persona, conversationHistory } = req.body;

    if (!scenarioId) {
      throw new BadRequestError('scenarioId is required');
    }

    const sanitizedHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (message) =>
              message &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string' &&
              message.content.trim().length > 0
          )
          .map((message) => ({
            role: message.role,
            content: message.content,
          }))
      : [];

    const personaValue =
      typeof persona === 'string' && isSimulationPersona(persona.toLowerCase())
        ? (persona.toLowerCase() as SimulationPersona)
        : undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write('data: {"type":"connected"}\n\n');

    await AIService.generateSimulationReply(
      scenarioId,
      sanitizedHistory,
      personaValue,
      (chunk) => {
        if (!chunk.done) {
          const data = JSON.stringify({
            type: 'content',
            content: chunk.content,
          });
          res.write(`data: ${data}\n\n`);
        } else {
          res.write('data: {"type":"done"}\n\n');
          res.end();
        }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorPayload = JSON.stringify({
      type: 'error',
      error: errorMessage,
    });
    res.write(`data: ${errorPayload}\n\n`);
    res.end();
    logger.error('Simulation streaming error:', error);
  }
};
