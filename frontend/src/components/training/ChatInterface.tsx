import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Avatar,
  IconButton,
  Button,
} from '@mui/material';
import { Send as SendIcon, SmartToy as BotIcon, Person as PersonIcon, Refresh as RefreshIcon, ArrowForward as ContinueIcon } from '@mui/icons-material';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'initial-assistant' | 'assistant';
  };
}

interface ChatInterfaceProps {
  scenarioId: string;
  scenarioName: string;
  initialMessage?: string;
  newAIMessage?: string;
  onUserMessage?: (message: string) => void;
  onContinue?: () => void;
  onRetry?: () => void;
  isAnalyzing?: boolean;
}

const ChatInterface = ({
  scenarioId: _scenarioId,
  scenarioName,
  initialMessage,
  newAIMessage,
  onUserMessage,
  onContinue,
  onRetry,
  isAnalyzing = false
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessageIdRef = useRef<string | null>(null);

  // Handle streamed initial AI message (update as chunks arrive)
  useEffect(() => {
    // Reset conversation when new scenario generation starts
    if (initialMessage === '') {
      initialMessageIdRef.current = null;
      setMessages([]);
      setIsWaitingForAction(false);
      setInput('');
      return;
    }

    if (!initialMessage) {
      return;
    }

    setMessages((prev) => {
      // First chunk – create the initial assistant message
      if (!initialMessageIdRef.current) {
        const messageId = Date.now().toString();
        initialMessageIdRef.current = messageId;
        return [
          {
            id: messageId,
            role: 'assistant',
            content: initialMessage,
            timestamp: new Date(),
            metadata: { type: 'initial-assistant' },
          },
        ];
      }

      // Subsequent chunks – update existing initial assistant message
      return prev.map((msg) =>
        msg.id === initialMessageIdRef.current
          ? {
              ...msg,
              content: initialMessage,
              // Keep original timestamp for ordering, avoid flicker
            }
          : msg
      );
    });
  }, [initialMessage]);

  // Add new AI message when it's provided
  useEffect(() => {
    if (newAIMessage) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: newAIMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [newAIMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isWaitingForAction) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsWaitingForAction(true);

    // Trigger analysis callback if provided
    if (onUserMessage) {
      onUserMessage(userInput);
    }
  };

  const handleRetry = () => {
    // Remove the last user message from UI
    setMessages((prev) => prev.slice(0, -1));
    setIsWaitingForAction(false);

    // Notify parent to remove from conversation history
    if (onRetry) {
      onRetry();
    }
  };

  const handleContinue = () => {
    setIsWaitingForAction(false);
    if (onContinue) {
      onContinue();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isWaitingForAction) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Messages Container */}
      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          p: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography color="text.secondary" gutterBottom>
              Waiting for scenario to be generated...
            </Typography>
          </Box>
        )}

        {messages.map((message, index) => {
          const isLastUserMessage = message.role === 'user' && index === messages.length - 1;

          return (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                }}
              >
                {message.role === 'assistant' && (
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <BotIcon />
                  </Avatar>
                )}
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
                {message.role === 'user' && (
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                  </Avatar>
                )}
              </Box>

              {/* Continue and Retry Buttons - Show below last user message */}
              {isLastUserMessage && isWaitingForAction && !isAnalyzing && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end', pr: 7 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RefreshIcon />}
                    onClick={handleRetry}
                    size="small"
                  >
                    Retry
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<ContinueIcon />}
                    onClick={handleContinue}
                    size="small"
                  >
                    Continue
                  </Button>
                </Box>
              )}
            </Box>
          );
        })}

        <div ref={messagesEndRef} />
      </Paper>

      {/* Input Area */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response here..."
            variant="outlined"
            disabled={isWaitingForAction}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!input.trim() || isWaitingForAction}
            sx={{ mb: 0.5 }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {isWaitingForAction
              ? 'Choose an action below your message: Retry or Continue'
              : 'Press Enter to send, Shift+Enter for new line'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatInterface;
