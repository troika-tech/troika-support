import { Request, Response, NextFunction } from 'express';
import AIService from '../services/ai/AIService';
import ImageTranscriptionService from '../services/ai/ImageTranscriptionService';
import RAGService from '../services/ai/RAGService';
import {
  SALES_CAPTAIN_WHATSAPP_SYSTEM_PROMPT,
  SALES_CAPTAIN_AI_AGENT_SYSTEM_PROMPT,
} from '../services/ai/prompts';
import { AIMessage } from '../services/ai/types';
import { sendSuccess } from '../utils/helpers';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Check if AI service is ready
 * GET /api/ai/status
 */
export const getStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const isReady = AIService.isReady();
    const provider = AIService.getProvider();

    sendSuccess(res, {
      isReady,
      provider,
      message: isReady
        ? 'AI service is ready'
        : 'AI service is not configured. Please add API keys.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate user's response
 * POST /api/ai/evaluate
 */
export const evaluateResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userResponse, scenarioId } = req.body;

    if (!userResponse || !scenarioId) {
      throw new BadRequestError('userResponse and scenarioId are required');
    }

    const evaluation = await AIService.evaluateResponse(userResponse, scenarioId);

    if (!evaluation) {
      throw new BadRequestError('Unable to evaluate response. Scenario not found.');
    }

    sendSuccess(res, { evaluation }, 'Response evaluated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate coaching correction
 * POST /api/ai/correction
 */
export const generateCorrection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userResponse, scenarioId } = req.body;

    if (!userResponse || !scenarioId) {
      throw new BadRequestError('userResponse and scenarioId are required');
    }

    const correction = await AIService.generateCorrection(userResponse, scenarioId);

    sendSuccess(res, { correction }, 'Correction generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate coaching correction (Streaming SSE)
 * POST /api/ai/correction/stream
 */
export const generateCorrectionStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { userResponse, scenarioId } = req.body;

    if (!userResponse || !scenarioId) {
      throw new BadRequestError('userResponse and scenarioId are required');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Generate correction with streaming
    await AIService.generateCorrection(userResponse, scenarioId, (chunk) => {
      if (!chunk.done) {
        // Send content chunk
        const data = JSON.stringify({
          type: 'content',
          content: chunk.content,
        });
        res.write(`data: ${data}\n\n`);
      } else {
        // Send completion message
        res.write('data: {"type":"done"}\n\n');
        res.end();
      }
    });
  } catch (error) {
    // Send error through SSE
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();

    logger.error('Streaming correction error:', error);
  }
};

/**
 * Generate customer objection
 * POST /api/ai/customer-objection
 */
export const generateCustomerObjection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scenarioId } = req.body;

    if (!scenarioId) {
      throw new BadRequestError('scenarioId is required');
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    const objection = await AIService.generateCustomerObjection(scenario);

    sendSuccess(res, { objection }, 'Customer objection generated');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate customer objection (Streaming SSE)
 * POST /api/ai/customer-objection/stream
 */
export const generateCustomerObjectionStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { scenarioId } = req.body;

    if (!scenarioId) {
      throw new BadRequestError('scenarioId is required');
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Generate objection with streaming
    await AIService.generateCustomerObjection(scenario, (chunk) => {
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
    });
  } catch (error) {
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();

    logger.error('Streaming objection error:', error);
  }
};

/**
 * Improve user's response
 * POST /api/ai/improve
 */
export const improveResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userResponse, corrections } = req.body;

    if (!userResponse || !corrections || !Array.isArray(corrections)) {
      throw new BadRequestError(
        'userResponse and corrections (array) are required'
      );
    }

    const improvedResponse = await AIService.improveResponse(
      userResponse,
      corrections
    );

    sendSuccess(
      res,
      { improvedResponse },
      'Response improved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate complete conversation
 * POST /api/ai/evaluate-conversation
 */
export const evaluateConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationHistory, scenarioId } = req.body;

    if (!conversationHistory || !scenarioId) {
      throw new BadRequestError(
        'conversationHistory and scenarioId are required'
      );
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    const evaluation = await AIService.evaluateConversation(
      conversationHistory,
      scenario
    );

    sendSuccess(res, { evaluation }, 'Conversation evaluated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate scenario with industry context (Streaming SSE)
 * POST /api/ai/generate-scenario/stream
 */
export const generateScenarioStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { scenarioId, industry } = req.body;

    if (!scenarioId) {
      throw new BadRequestError('scenarioId is required');
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Generate scenario-based objection with industry context
    await AIService.generateScenarioWithIndustry(scenario, industry, (chunk) => {
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
    });
  } catch (error) {
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();

    logger.error('Streaming scenario generation error:', error);
  }
};

/**
 * Analyze user response in real-time (Streaming SSE)
 * POST /api/ai/analyze-response/stream
 */
export const analyzeResponseStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { userResponse, scenarioId, conversationContext } = req.body;

    if (!userResponse || !scenarioId) {
      throw new BadRequestError('userResponse and scenarioId are required');
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Analyze user response
    await AIService.analyzeUserResponse(
      userResponse,
      scenario,
      conversationContext || [],
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
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();

    logger.error('Streaming response analysis error:', error);
  }
};

/**
 * Continue conversation - Generate next customer message (Streaming SSE)
 * POST /api/ai/continue-conversation/stream
 */
export const continueConversationStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { scenarioId, conversationContext, industry } = req.body;

    if (!scenarioId) {
      throw new BadRequestError('scenarioId is required');
    }

    const scenario = await AIService.loadScenarioContext(scenarioId);

    if (!scenario) {
      throw new BadRequestError('Scenario not found');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write('data: {"type":"connected"}\\n\\n');

    // Continue conversation with context
    await AIService.continueConversation(
      scenario,
      conversationContext || [],
      industry,
      (chunk) => {
        if (!chunk.done) {
          const data = JSON.stringify({
            type: 'content',
            content: chunk.content,
          });
          res.write(`data: ${data}\\n\\n`);
        } else {
          res.write('data: {"type":"done"}\\n\\n');
          res.end();
        }
      }
    );
  } catch (error) {
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\\n\\n`);
    res.end();

    logger.error('Streaming continue conversation error:', error);
  }
};

/**
 * Sales Captain - AI assistance with RAG (Streaming SSE)
 * POST /api/ai/sales-captain/stream
 */
export const salesCaptainStream = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { query, conversationContext, companyId, service, images } = req.body;

    if (!query) {
      throw new BadRequestError('query is required');
    }

    if (!service || (service !== 'whatsapp' && service !== 'ai_agent')) {
      throw new BadRequestError('service is required and must be either "whatsapp" or "ai_agent"');
    }

    const validatedImages: string[] = [];

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        throw new BadRequestError('images must be an array of data URLs');
      }

      if (images.length > 5) {
        throw new BadRequestError('A maximum of 5 images can be attached');
      }

      const dataUrlPattern = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
      const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

      images.forEach((image: unknown, index: number) => {
        if (typeof image !== 'string' || !dataUrlPattern.test(image)) {
          throw new BadRequestError(`Image at position ${index + 1} is not a valid image data URL`);
        }

        const base64 = image.split(',')[1];
        if (!base64) {
          throw new BadRequestError(`Image at position ${index + 1} is not a valid base64 string`);
        }

        const estimatedSize = Math.ceil((base64.length * 3) / 4);

        if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
          throw new BadRequestError(`Image at position ${index + 1} exceeds the 5MB limit`);
        }

        validatedImages.push(image);
      });
    }

    logger.info('Sales Captain query received', {
      queryLength: query.length,
      hasContext: !!conversationContext,
      companyId,
      service,
      imageCount: validatedImages.length,
    });

    // Generate transcripts for uploaded images to enhance RAG and prompt context
    let imageTranscriptions: string[] = [];
    if (validatedImages.length > 0) {
      imageTranscriptions = await ImageTranscriptionService.transcribeImages(validatedImages);
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Step 1: Perform RAG search to find relevant knowledge
    const searchOptions: any = {
      limit: 5,
      minScore: 0.7,
      filters: {
        services: service, // Filter by service
      },
    };

    // Add company filter if provided
    if (companyId) {
      searchOptions.filters.companyId = companyId;
    }

    // Build enhanced query using OCR transcript when available
    const cleanedTranscriptionsForSearch = imageTranscriptions
      .map((text) => text.trim())
      .filter((text) => text && text.toUpperCase() !== 'NO_TEXT_DETECTED');

    const ragQuery = [query, ...cleanedTranscriptionsForSearch].join('\n\n').trim() || query;

    // Search for relevant knowledge
    const searchResults = await RAGService.searchSimilar(ragQuery, searchOptions);

    // Send search status
    const searchStatus = JSON.stringify({
      type: 'search_complete',
      resultsFound: searchResults.length,
    });
    res.write(`data: ${searchStatus}\n\n`);

    logger.info('RAG search completed', {
      resultsFound: searchResults.length,
      topScore: searchResults[0]?.score || 0,
      ragQueryLength: ragQuery.length,
    });

    // Step 2: Format context from search results
    const contextString = RAGService.formatContext(searchResults);

    const captainSystemPrompt =
      service === 'whatsapp'
        ? SALES_CAPTAIN_WHATSAPP_SYSTEM_PROMPT
        : SALES_CAPTAIN_AI_AGENT_SYSTEM_PROMPT;

    // Step 3: Build conversation history with RAG context
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: captainSystemPrompt,
      },
      {
        role: 'user',
        content: `${contextString}\n\nUse this knowledge base context when crafting the next reply.`,
      },
    ];

    // Add conversation context if provided
    if (conversationContext && Array.isArray(conversationContext)) {
      const sanitizedContext: AIMessage[] = conversationContext
        .slice(-10)
        .map((msg: any) => {
          const role = msg?.role === 'assistant' ? 'assistant' : 'user';
          const baseContent = typeof msg?.content === 'string' ? msg.content : '';
          const imageCount = typeof msg?.imageCount === 'number'
            ? msg.imageCount
            : Array.isArray(msg?.images)
              ? msg.images.length
              : 0;
          const imagesNote = imageCount > 0
            ? `${baseContent ? '\n\n' : ''}[Attached ${imageCount} image${imageCount > 1 ? 's' : ''} in this turn]`
            : '';
          const content = `${baseContent}${imagesNote}`.trim()
            || (role === 'assistant' ? 'Assistant response omitted.' : 'User message omitted.');

          return {
            role,
            content,
          };
        });

      messages.push(...sanitizedContext);
    }

    const trimmedQuery = typeof query === 'string' ? query.trim() : '';
    const userTextSegments: string[] = [];

    if (trimmedQuery) {
      userTextSegments.push(trimmedQuery);
    }

    if (validatedImages.length > 0) {
      userTextSegments.push(
        `[Attached ${validatedImages.length} customer chat screenshot${validatedImages.length > 1 ? 's' : ''}]`
      );
    }

    if (cleanedTranscriptionsForSearch.length > 0) {
      const formattedTranscriptions = cleanedTranscriptionsForSearch
        .map((text, index) => `Screenshot ${index + 1} Transcript:\n${text}`)
        .join('\n\n');

      userTextSegments.push(`Transcribed Customer Chats:\n${formattedTranscriptions}`);
    }

    const userPrimaryText = userTextSegments.join('\n\n') || 'Please review the attached customer chat screenshots.';

    // Add current query with optional images
    if (validatedImages.length > 0) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrimaryText,
          },
          ...validatedImages.map((imageUrl) => ({
            type: 'image_url' as const,
            image_url: {
              url: imageUrl,
            },
          })),
        ],
      });
    } else {
    messages.push({
      role: 'user',
        content: userPrimaryText,
    });
    }

    // Step 4: Generate AI response with streaming
    await AIService.generateStreamingResponse(messages, (chunk) => {
      if (!chunk.done) {
        const data = JSON.stringify({
          type: 'content',
          content: chunk.content,
        });
        res.write(`data: ${data}\n\n`);
      } else {
        // Send completion with metadata
        const doneData = JSON.stringify({
          type: 'done',
          metadata: {
            sourcesUsed: searchResults.length,
            topSources: searchResults.slice(0, 3).map(r => ({
              title: r.document.title,
              source: r.document.source,
              score: r.score,
            })),
          },
        });
        res.write(`data: ${doneData}\n\n`);
        res.end();
      }
    });

    logger.info('Sales Captain response completed');
  } catch (error) {
    const errorData = JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();

    logger.error('Sales Captain streaming error:', error);
  }
};
