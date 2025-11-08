# AI Service Documentation

AI-powered coaching system using OpenAI GPT-4o-mini with streaming support (SSE).

## Overview

The AI service powers the Troika Sales Captain persona, providing:
- Real-time customer objections
- Response evaluation and scoring
- Coaching corrections and feedback
- Improved response generation
- Conversation analysis

## Architecture

```
AIService (Main Interface)
    ↓
OpenAIService (Provider Implementation)
    ↓
OpenAI API (GPT-4o-mini with streaming)
```

## Files

- **types.ts** - TypeScript interfaces and types
- **prompts.ts** - Troika Sales Captain prompts and templates
- **OpenAIService.ts** - OpenAI API integration with streaming
- **AIService.ts** - Main AI service wrapper
- **index.ts** - Exports

## Features

### 1. Streaming Responses (SSE)

Real-time AI responses using Server-Sent Events:

```typescript
// Controller example
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

await AIService.generateCorrection(userResponse, scenarioId, (chunk) => {
  if (!chunk.done) {
    res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
  } else {
    res.write('data: {"type":"done"}\n\n');
    res.end();
  }
});
```

### 2. Response Evaluation

Evaluates sales rep responses with detailed metrics:

```typescript
const evaluation = await AIService.evaluateResponse(userResponse, scenarioId);

// Returns:
{
  score: 85,
  strengths: ["Clear communication", "Confident tone"],
  weaknesses: ["Could improve closing"],
  corrections: ["Add a forward-moving question"],
  improvedVersion: "...",
  metrics: {
    confidence: 90,
    clarity: 85,
    structure: 80,
    objectionHandling: 88,
    closing: 82
  },
  coachingNotes: "Great start! Focus on..."
}
```

### 3. Coaching Corrections

Generates Troika Sales Captain-style feedback:

```typescript
const correction = await AIService.generateCorrection(userResponse, scenarioId);

// Returns formatted coaching:
// "What You Did Well: ..."
// "Let's Refine That: ..."
// "Improved Version: ..."
// "Why This Works Better: ..."
```

### 4. Customer Objections

Generates realistic customer responses:

```typescript
const scenario = await AIService.loadScenarioContext(scenarioId);
const objection = await AIService.generateCustomerObjection(scenario);
```

## API Endpoints

Base URL: `/api/ai`

### 1. Get AI Status
```
GET /api/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isReady": true,
    "provider": "openai",
    "message": "AI service is ready"
  }
}
```

---

### 2. Evaluate Response
```
POST /api/ai/evaluate
Authorization: Bearer <token>
```

**Request:**
```json
{
  "userResponse": "I understand your concern...",
  "scenarioId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "score": 85,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "corrections": ["..."],
      "improvedVersion": "...",
      "metrics": { ... },
      "coachingNotes": "..."
    }
  }
}
```

---

### 3. Generate Correction
```
POST /api/ai/correction
Authorization: Bearer <token>
```

**Request:**
```json
{
  "userResponse": "Maybe we can try...",
  "scenarioId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "correction": "What You Did Well:\n- You attempted to engage..."
  }
}
```

---

### 4. Generate Correction (Streaming)
```
POST /api/ai/correction/stream
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "userResponse": "Maybe we can try...",
  "scenarioId": "507f1f77bcf86cd799439011"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"type":"connected"}

data: {"type":"content","content":"What"}

data: {"type":"content","content":" You"}

data: {"type":"content","content":" Did"}

...

data: {"type":"done"}
```

**Client-side consumption:**
```javascript
const eventSource = new EventSource('/api/ai/correction/stream', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'content') {
    // Append content to UI
    displayContent(data.content);
  } else if (data.type === 'done') {
    eventSource.close();
  } else if (data.type === 'error') {
    console.error(data.error);
    eventSource.close();
  }
};
```

---

### 5. Generate Customer Objection
```
POST /api/ai/customer-objection
Authorization: Bearer <token>
```

**Request:**
```json
{
  "scenarioId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "objection": "I just want to try with 5,000 messages first."
  }
}
```

---

### 6. Generate Customer Objection (Streaming)
```
POST /api/ai/customer-objection/stream
Authorization: Bearer <token>
```

Same SSE format as correction streaming.

---

### 7. Improve Response
```
POST /api/ai/improve
Authorization: Bearer <token>
```

**Request:**
```json
{
  "userResponse": "We can maybe try...",
  "corrections": [
    "Remove weak phrases like 'maybe'",
    "Add a forward-moving question",
    "Sound more confident"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "improvedResponse": "I understand. Let's make sure you get meaningful results..."
  }
}
```

---

### 8. Evaluate Conversation
```
POST /api/ai/evaluate-conversation
Authorization: Bearer <token>
```

**Request:**
```json
{
  "conversationHistory": [
    { "role": "assistant", "content": "Customer objection..." },
    { "role": "user", "content": "My response..." },
    { "role": "assistant", "content": "Coaching feedback..." }
  ],
  "scenarioId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "overallScore": 87,
      "summary": "Strong performance overall...",
      "keyTakeaways": ["...", "...", "..."]
    }
  }
}
```

---

## Prompts

### Troika Sales Captain System Prompt

The core personality prompt defines:
- Calm, confident, senior sales leader persona
- 70% English + 30% Hinglish
- Advisory tone, not pushy
- Always explains "why" before "what"
- Ends with forward-moving questions

### Customer Persona Prompt

Generates realistic customer responses based on scenario context.

### Evaluation Prompt

Structured prompt for evaluating responses with metrics and feedback.

### Correction Prompt

Generates encouraging, supportive coaching feedback.

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
AI_PROVIDER=openai  # Default: openai (future: anthropic)
```

### Model Configuration

Default model: `gpt-4o-mini`

Can be changed in `OpenAIService.ts`:
```typescript
private model: string = 'gpt-4o-mini';
```

Options:
- `gpt-4o-mini` - Recommended (cost-efficient, fast)
- `gpt-4o` - More capable, higher cost
- `gpt-4-turbo` - Alternative

## Usage Examples

### Basic Response Evaluation

```typescript
import AIService from './services/ai/AIService';

const evaluation = await AIService.evaluateResponse(
  "I understand your concern. Let's start with the 1 lakh pack.",
  scenarioId
);

console.log(`Score: ${evaluation.score}`);
console.log(`Strengths: ${evaluation.strengths.join(', ')}`);
```

### Streaming Correction

```typescript
await AIService.generateCorrection(
  userResponse,
  scenarioId,
  (chunk) => {
    if (!chunk.done) {
      process.stdout.write(chunk.content);
    } else {
      console.log('\n[Done]');
    }
  }
);
```

### Generate Improved Response

```typescript
const improved = await AIService.improveResponse(
  "Maybe we can try the 1 lakh pack",
  ["Remove 'maybe'", "Sound confident", "Add question"]
);

console.log(improved);
// "Let's start with the 1 lakh pack. Which city are you targeting?"
```

## Token Usage

Approximate token usage per request:

| Operation | Prompt Tokens | Completion Tokens | Total |
|-----------|---------------|-------------------|-------|
| Customer Objection | 200 | 50 | 250 |
| Evaluation | 300 | 400 | 700 |
| Correction | 250 | 300 | 550 |
| Improve Response | 150 | 100 | 250 |

**Cost Estimation (GPT-4o-mini):**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

Example: 1,000 training sessions ≈ $0.50 - $1.00

## Error Handling

All AI methods include fallback responses:

```typescript
try {
  const response = await AIService.generateCorrection(...);
} catch (error) {
  // Returns default coaching message
  // "Keep practicing! Try to focus on..."
}
```

Errors are logged but don't crash the application.

## Testing

### Test AI Status

```bash
curl http://localhost:5000/api/ai/status
```

### Test Evaluation

```bash
curl -X POST http://localhost:5000/api/ai/evaluate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "I think we can try the starter pack",
    "scenarioId": "SCENARIO_ID"
  }'
```

### Test Streaming

```bash
curl -X POST http://localhost:5000/api/ai/correction/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Maybe we can do that",
    "scenarioId": "SCENARIO_ID"
  }'
```

## Performance

- **Streaming latency**: ~200-500ms to first token
- **Full response time**: 1-3 seconds
- **Concurrent requests**: Limited by OpenAI rate limits
- **Token rate limit**: 90,000 TPM (tokens per minute)

## Best Practices

1. **Use streaming for better UX** - Users see responses in real-time
2. **Cache scenario contexts** - Load once, reuse multiple times
3. **Handle errors gracefully** - Always provide fallback responses
4. **Log token usage** - Monitor costs
5. **Rate limit client requests** - Prevent API quota exhaustion
6. **Validate inputs** - Use Zod schemas in routes

## Future Enhancements

1. **Anthropic Claude support** - Add alternative provider
2. **Response caching** - Cache common evaluations
3. **Fine-tuned model** - Train on sales data
4. **Multi-language support** - Beyond Hinglish
5. **Voice tone analysis** - Analyze audio recordings
6. **Sentiment analysis** - Track emotional tone
7. **A/B testing** - Compare prompt variations

---

**AI Service is production-ready with streaming support!** ✅
