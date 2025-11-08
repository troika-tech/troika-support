import { Router } from 'express';
import {
  getStatus,
  evaluateResponse,
  generateCorrection,
  generateCorrectionStream,
  generateCustomerObjection,
  generateCustomerObjectionStream,
  improveResponse,
  evaluateConversation,
  generateScenarioStream,
  analyzeResponseStream,
  continueConversationStream,
  salesCaptainStream,
} from '../controllers/ai.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const evaluateSchema = z.object({
  body: z.object({
    userResponse: z.string().min(1, 'User response is required'),
    scenarioId: z.string().min(1, 'Scenario ID is required'),
  }),
});

const correctionSchema = z.object({
  body: z.object({
    userResponse: z.string().min(1, 'User response is required'),
    scenarioId: z.string().min(1, 'Scenario ID is required'),
  }),
});

const customerObjectionSchema = z.object({
  body: z.object({
    scenarioId: z.string().min(1, 'Scenario ID is required'),
  }),
});

const improveSchema = z.object({
  body: z.object({
    userResponse: z.string().min(1, 'User response is required'),
    corrections: z.array(z.string()).min(1, 'At least one correction is required'),
  }),
});

const evaluateConversationSchema = z.object({
  body: z.object({
    conversationHistory: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      })
    ),
    scenarioId: z.string().min(1, 'Scenario ID is required'),
  }),
});

const generateScenarioSchema = z.object({
  body: z.object({
    scenarioId: z.string().min(1, 'Scenario ID is required'),
    industry: z.string().optional(),
  }),
});

const analyzeResponseSchema = z.object({
  body: z.object({
    userResponse: z.string().min(1, 'User response is required'),
    scenarioId: z.string().min(1, 'Scenario ID is required'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }),
});

const continueConversationSchema = z.object({
  body: z.object({
    scenarioId: z.string().min(1, 'Scenario ID is required'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }),
});

const salesCaptainSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
    companyId: z.string().optional(),
  }),
});

// Public route - check AI service status
router.get('/status', getStatus);

// Protected routes
router.post(
  '/evaluate',
  authenticate,
  validate(evaluateSchema),
  evaluateResponse
);

router.post(
  '/correction',
  authenticate,
  validate(correctionSchema),
  generateCorrection
);

router.post(
  '/correction/stream',
  authenticate,
  validate(correctionSchema),
  generateCorrectionStream
);

router.post(
  '/customer-objection',
  authenticate,
  validate(customerObjectionSchema),
  generateCustomerObjection
);

router.post(
  '/customer-objection/stream',
  authenticate,
  validate(customerObjectionSchema),
  generateCustomerObjectionStream
);

router.post(
  '/improve',
  optionalAuth,
  validate(improveSchema),
  improveResponse
);

router.post(
  '/evaluate-conversation',
  optionalAuth,
  validate(evaluateConversationSchema),
  evaluateConversation
);

router.post(
  '/generate-scenario/stream',
  optionalAuth,
  validate(generateScenarioSchema),
  generateScenarioStream
);

router.post(
  '/analyze-response/stream',
  optionalAuth,
  validate(analyzeResponseSchema),
  analyzeResponseStream
);

router.post(
  '/continue-conversation/stream',
  optionalAuth,
  validate(continueConversationSchema),
  continueConversationStream
);

router.post(
  '/sales-captain/stream',
  optionalAuth,
  validate(salesCaptainSchema),
  salesCaptainStream
);

export default router;
