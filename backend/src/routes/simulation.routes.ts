import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  getSimulationSituations,
  simulationRespondStream,
} from '../controllers/simulation.controller';

const router = Router();

const simulationRespondSchema = z.object({
  body: z.object({
    scenarioId: z.string().min(1, 'scenarioId is required'),
    persona: z.enum(['serious', 'busy', 'skeptical', 'curious']).optional(),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1, 'content is required'),
        })
      )
      .optional(),
  }),
});

router.get('/situations', optionalAuth, getSimulationSituations);

router.post(
  '/respond/stream',
  authenticate,
  validate(simulationRespondSchema),
  simulationRespondStream
);

export default router;
