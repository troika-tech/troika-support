# AI Service Testing Guide

Complete guide to test the AI-powered coaching system with OpenAI GPT-4o-mini streaming.

## Prerequisites

1. **OpenAI API Key**
   - Get your API key from https://platform.openai.com/api-keys
   - Add to `backend/.env`:
     ```bash
     OPENAI_API_KEY=sk-your-api-key-here
     ```

2. **MongoDB Running**
   - Ensure MongoDB is running
   - At least one training scenario in database

3. **User Authenticated**
   - Login and get access token
   - Use for Authorization header

## Quick Start

### 1. Check AI Service Status

```bash
curl http://localhost:5000/api/ai/status
```

**Expected Response:**
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

If `isReady: false`, check your `OPENAI_API_KEY` in `.env`.

---

## Testing Non-Streaming Endpoints

### 2. Generate Customer Objection

```bash
curl -X POST http://localhost:5000/api/ai/customer-objection \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "SCENARIO_ID_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer objection generated",
  "data": {
    "objection": "I want to try with 5,000 messages first. I don't want to invest big in the beginning."
  }
}
```

---

### 3. Evaluate User Response

```bash
curl -X POST http://localhost:5000/api/ai/evaluate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Sure, we can start with 5000 messages if you want.",
    "scenarioId": "SCENARIO_ID_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Response evaluated successfully",
  "data": {
    "evaluation": {
      "score": 45,
      "strengths": [
        "Acknowledged customer concern",
        "Polite tone"
      ],
      "weaknesses": [
        "Agreed to below minimum pack size",
        "Didn't explain why 1 lakh is recommended",
        "No forward-moving question"
      ],
      "corrections": [
        "Explain the reasoning behind 1 lakh minimum",
        "Position it as ensuring meaningful results",
        "End with a question about target city"
      ],
      "improvedVersion": "I understand. The reason we start from 1 lakh messages is to ensure your campaign gets real visibility and meaningful response. If we send too few, the result becomes unpredictable. So to test properly, we activate from the 1 lakh starter pack. Which city are you planning to target first?",
      "metrics": {
        "confidence": 40,
        "clarity": 60,
        "structure": 50,
        "objectionHandling": 30,
        "closing": 40
      },
      "coachingNotes": "Good start with acknowledgment, but avoid agreeing to below-minimum packages. Always explain the 'why' and guide them to the correct decision."
    }
  }
}
```

---

### 4. Generate Coaching Correction

```bash
curl -X POST http://localhost:5000/api/ai/correction \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Maybe we can try with the starter pack",
    "scenarioId": "SCENARIO_ID_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Correction generated successfully",
  "data": {
    "correction": "**What You Did Well:**\n- You mentioned the starter pack\n\n**Let's Refine That:**\nAvoid weak phrases like 'maybe' and 'try'. They reduce confidence. Be more assertive and explain the value.\n\n**Improved Version:**\n\"I understand. Let's start with the 1 lakh starter pack. This ensures your campaign has real impact and generates meaningful response. Which city are you planning to target first?\"\n\n**Why This Works Better:**\n- Removed hesitant language\n- Explained the reasoning behind 1 lakh\n- Ended with a forward-moving question\n- Sounds confident and advisory"
  }
}
```

---

### 5. Improve Response

```bash
curl -X POST http://localhost:5000/api/ai/improve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "I think we can maybe start with that pack",
    "corrections": [
      "Remove weak phrases: I think, maybe",
      "Sound more confident",
      "Add a forward-moving question"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Response improved successfully",
  "data": {
    "improvedResponse": "Let's start with that pack. It will ensure your campaign has real impact. Which city are you targeting first?"
  }
}
```

---

## Testing Streaming Endpoints (SSE)

### 6. Test Streaming Correction with curl

```bash
curl -X POST http://localhost:5000/api/ai/correction/stream \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "userResponse": "Maybe we can do that",
    "scenarioId": "SCENARIO_ID_HERE"
  }'
```

**Expected Output (real-time streaming):**
```
data: {"type":"connected"}

data: {"type":"content","content":"**What"}

data: {"type":"content","content":" You"}

data: {"type":"content","content":" Did"}

data: {"type":"content","content":" Well:**\n"}

...

data: {"type":"done"}
```

---

### 7. Test Streaming Customer Objection

```bash
curl -X POST http://localhost:5000/api/ai/customer-objection/stream \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "scenarioId": "SCENARIO_ID_HERE"
  }'
```

---

## Frontend Integration Examples

### JavaScript/TypeScript Client

#### Non-Streaming Request

```javascript
const evaluateResponse = async (userResponse, scenarioId, accessToken) => {
  const response = await fetch('http://localhost:5000/api/ai/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userResponse,
      scenarioId
    })
  });

  const data = await response.json();
  return data.data.evaluation;
};
```

---

#### Streaming Request (SSE)

```javascript
const streamCorrection = (userResponse, scenarioId, accessToken, onChunk, onComplete) => {
  // Note: EventSource doesn't support POST with body, so we need fetch with ReadableStream
  fetch('http://localhost:5000/api/ai/correction/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userResponse,
      scenarioId
    })
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const readChunk = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          onComplete();
          return;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));

            if (data.type === 'content') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onComplete();
            } else if (data.type === 'error') {
              console.error(data.error);
            }
          }
        });

        readChunk();
      });
    };

    readChunk();
  });
};

// Usage
streamCorrection(
  userResponse,
  scenarioId,
  accessToken,
  (content) => {
    // Append each chunk to UI
    document.getElementById('feedback').innerText += content;
  },
  () => {
    console.log('Streaming complete');
  }
);
```

---

#### React Hook Example

```typescript
import { useState } from 'react';

export const useAIStreaming = () => {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const streamCorrection = async (userResponse: string, scenarioId: string) => {
    setContent('');
    setIsStreaming(true);

    const response = await fetch('/api/ai/correction/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ userResponse, scenarioId })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));

          if (data.type === 'content') {
            setContent(prev => prev + data.content);
          }
        }
      });
    }

    setIsStreaming(false);
  };

  return { content, isStreaming, streamCorrection };
};
```

---

## Complete Training Flow Test

### Step-by-Step Simulation

1. **Login** → Get access token
2. **Get Scenario** → Load training scenario
3. **Generate Customer Objection** → AI plays customer
4. **User Responds** → Sales rep types response
5. **Evaluate Response** → Get score and metrics
6. **Generate Correction (Streaming)** → Real-time feedback
7. **Improve Response** → Get corrected version
8. **User Repeats** → Practice improved version
9. **Evaluate Conversation** → Get overall summary

### Bash Script

```bash
#!/bin/bash

# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}' \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"

# 2. Get Scenario (replace with actual ID)
SCENARIO_ID="ACTUAL_SCENARIO_ID"

# 3. Generate Customer Objection
echo "\n=== Customer Objection ==="
curl -s -X POST http://localhost:5000/api/ai/customer-objection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scenarioId\":\"$SCENARIO_ID\"}" \
  | jq '.data.objection'

# 4. User Response (example)
USER_RESPONSE="Maybe we can try with the starter pack"

# 5. Evaluate Response
echo "\n=== Evaluation ==="
curl -s -X POST http://localhost:5000/api/ai/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userResponse\":\"$USER_RESPONSE\",\"scenarioId\":\"$SCENARIO_ID\"}" \
  | jq '.data.evaluation.score'

# 6. Generate Correction (Streaming)
echo "\n=== Coaching Correction (Streaming) ==="
curl -X POST http://localhost:5000/api/ai/correction/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -N \
  -d "{\"userResponse\":\"$USER_RESPONSE\",\"scenarioId\":\"$SCENARIO_ID\"}"
```

---

## Troubleshooting

### Issue: `isReady: false`

**Solution:**
- Check `OPENAI_API_KEY` in `backend/.env`
- Restart server after adding key

### Issue: 401 Unauthorized

**Solution:**
- Get fresh access token via `/api/auth/login`
- Check token is in Authorization header

### Issue: Scenario not found

**Solution:**
- Create training scenarios in database
- Use valid scenario ID

### Issue: Streaming not working

**Solution:**
- Use `-N` flag with curl
- Check nginx buffering if behind proxy
- Ensure proper SSE headers

### Issue: Rate limit exceeded

**Solution:**
- Check OpenAI rate limits
- Implement request throttling
- Upgrade OpenAI tier if needed

---

## Performance Metrics

| Operation | Time to First Token | Total Time | Tokens Used |
|-----------|---------------------|------------|-------------|
| Customer Objection | ~200-400ms | 1-2s | 200-300 |
| Evaluation | ~300-500ms | 2-3s | 600-800 |
| Correction | ~200-400ms | 2-4s | 400-600 |
| Improve Response | ~200-300ms | 1-2s | 200-300 |

**Note:** Times vary based on:
- OpenAI API response time
- Network latency
- Server load
- Prompt complexity

---

## Cost Estimation

**GPT-4o-mini Pricing:**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

**Per Training Session (average):**
- Customer Objection: ~$0.0002
- Evaluation: ~$0.0005
- Correction: ~$0.0004
- Total: **~$0.0011 per session**

**1,000 Training Sessions: ~$1.10**

---

**Ready to test the AI-powered coaching system!** 🚀
