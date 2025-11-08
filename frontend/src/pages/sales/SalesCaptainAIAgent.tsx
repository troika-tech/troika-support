import { useState, useEffect, useRef, FormEvent, ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  SupportAgent as AgentIcon,
  Person as PersonIcon,
  SmartToy as AIIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCallback } from 'react';
import AssistantMessage from '../../components/chat/AssistantMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  metadata?: {
    sourcesUsed?: number;
    topSources?: Array<{
      title: string;
      source: string;
      score: number;
    }>;
  };
}

const SalesCaptainAIAgent = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  const updateStreamingMessage = useCallback((messageId: string, updater: (prev: Message) => Message) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) {
          return msg;
        }
        return updater(msg);
      })
    );
  }, []);

  const handleAttachmentButtonClick = () => {
    if (isLoading || attachments.length >= 5) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setAttachments((prev) => {
      const remainingSlots = Math.max(0, 5 - prev.length);
      const nextFiles = files.slice(0, remainingSlots).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      return [...prev, ...nextFiles];
    });

    event.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);

      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }

      return next;
    });
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items || []);

    if (!items.length) {
      return;
    }

    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) {
      return;
    }

    event.preventDefault();

    const remainingSlots = Math.max(0, 5 - attachments.length);

    if (remainingSlots === 0) {
      return;
    }

    const files = imageItems.slice(0, remainingSlots).map((item) => item.getAsFile()).filter(Boolean) as File[];

    if (!files.length) {
      return;
    }

    setAttachments((prev) => {
      const nextFiles = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      return [...prev, ...nextFiles];
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const attachmentsSnapshot = attachments.slice();
    let imageDataUrls: string[] = [];

    if (attachmentsSnapshot.length > 0) {
      try {
        imageDataUrls = await Promise.all(
          attachmentsSnapshot.map((attachment) => readFileAsDataUrl(attachment.file))
        );
      } catch (fileError) {
        console.error('Failed to read attachment:', fileError);
        setError('Failed to read one of the attachments. Please try again.');
        return;
      }
    }

    const messageContent = input.trim() || 'Please review the attached customer chat screenshots.';

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setIsAssistantTyping(true);

    const streamId = `assistant-${Date.now()}`;
    setCurrentStreamId(streamId);
    setMessages((prev) => [
      ...prev,
      {
        id: streamId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    try {
      // Get conversation context (last 5 messages)
      const conversationContext = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.images && msg.images.length > 0
          ? `${msg.content}\n\n[Attached ${msg.images.length} image${msg.images.length > 1 ? 's' : ''}]`
          : msg.content,
        imageCount: msg.images?.length || 0,
      }));

      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:5000/api/ai/sales-captain/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: userMessage.content,
          conversationContext,
          companyId: user?.companyId,
          service: 'ai_agent', // Filter by AI Agent service
          images: imageDataUrls,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      let metadata: any = {};
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');

        while (boundary !== -1) {
          const eventString = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (eventString) {
            let payload: any = null;

            const lines = eventString.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const jsonString = line.slice(5).trim();
                try {
                  payload = JSON.parse(jsonString);
                } catch (parseError) {
                  payload = { type: 'text', content: jsonString };
                }
              }
            }

            if (payload) {
              try {
                if (payload.type === 'connected') {
                  console.log('Connected to Sales Captain');
                } else if (payload.type === 'search_complete') {
                  console.log(`Found ${payload.resultsFound} relevant sources`);
                } else if (payload.type === 'content') {
                  fullContent += payload.content;
                  updateStreamingMessage(streamId, (prev) => ({
                    ...prev,
                    content: (prev.content || '') + payload.content,
                  }));
                } else if (payload.type === 'done') {
                  metadata = payload.metadata;
                } else if (payload.type === 'error') {
                  throw new Error(payload.error);
                }
              } catch (parseError) {
                console.error('Error processing SSE data:', parseError);
              }
            }
          }

          boundary = buffer.indexOf('\n\n');
        }
      }

      // Add complete assistant message
      updateStreamingMessage(streamId, (prev) => ({
        ...prev,
        content: fullContent,
        timestamp: new Date(),
        metadata,
      }));
      setCurrentStreamId(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setCurrentStreamId(null);
      setMessages((prev) => prev.filter((msg) => msg.id !== streamId));
    } finally {
      attachmentsSnapshot.forEach((attachment) => URL.revokeObjectURL(attachment.preview));
      setAttachments([]);
      setIsLoading(false);
      setIsAssistantTyping(false);
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, rgba(156, 39, 176, 0.08) 0%, rgba(158, 229, 255, 0.05) 50%, rgba(255, 255, 255, 1) 100%)',
      }}
    >
      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 8, md: 12 },
          py: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {messages.length === 0 && !isAssistantTyping && (
          <Stack
            spacing={3}
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%', textAlign: 'center' }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #9C27B0, #673AB7)',
              }}
            >
              <AIIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>
                Hi {user?.profile?.firstName || 'there'}! 👋
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={600}>
                I'm your Sales Captain for AI Chat & Calling Agents - here to help you during customer conversations. Ask me anything about:
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              <Chip label="AI Agent capabilities" variant="outlined" />
              <Chip label="Call & chat automation" variant="outlined" />
              <Chip label="Pricing & packages" variant="outlined" />
              <Chip label="Handling objections" variant="outlined" />
              <Chip label="Best practices" variant="outlined" />
            </Stack>
          </Stack>
        )}

        <Box sx={{ width: '100%', maxWidth: '900px' }}>
          {messages.map((message) => {
            if (message.role === 'assistant') {
              return (
                <Box key={message.id} sx={{ mb: 4 }}>
                  <AssistantMessage
                    message={message}
                    isStreaming={currentStreamId === message.id}
                    assistantName="Sales Captain AI Agent"
                    avatarNode={<AgentIcon fontSize="small" />}
                    accentColor="#9C27B0"
                    secondaryAccentColor="#673AB7"
                  />
                </Box>
              );
            }

            return (
              <Stack
                key={message.id}
                direction="row"
                spacing={2}
                sx={{
                  mb: 3,
                  justifyContent: 'flex-end',
                }}
              >
                <Box
                  sx={{
                    maxWidth: { xs: '90%', sm: '50%', lg: '45%' },
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      background: 'linear-gradient(135deg, #9C27B0, #673AB7)',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Paper>

                  {message.images && message.images.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        mt: 1.5,
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      {message.images.map((imageSrc, index) => (
                        <Box
                          key={`${message.id}-img-${index}`}
                          component="img"
                          src={imageSrc}
                          alt={`Attachment ${index + 1}`}
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 2,
                            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                          }}
                        />
                      ))}
                    </Stack>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, ml: 1, textAlign: 'right' }}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>

                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'primary.main',
                    flexShrink: 0,
                  }}
                >
                  <PersonIcon />
                </Avatar>
              </Stack>
            );
          })}

          {error && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                background: 'rgba(211, 47, 47, 0.1)',
                border: '1px solid',
                borderColor: 'error.main',
                borderRadius: 2,
              }}
            >
              <Typography color="error">{error}</Typography>
            </Paper>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Input */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <form onSubmit={handleSubmit}>
          {attachments.length > 0 && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                mb: 2,
                flexWrap: 'wrap',
              }}
            >
              {attachments.map((attachment, index) => (
                <Box
                  key={`${attachment.preview}-${index}`}
                  sx={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <Box
                    component="img"
                    src={attachment.preview}
                    alt={`Attachment ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveAttachment(index)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.8)',
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}

          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <Stack direction="row" spacing={2} alignItems="flex-end">
            <IconButton
              onClick={handleAttachmentButtonClick}
              disabled={isLoading || attachments.length >= 5}
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: attachments.length >= 5 ? 'divider' : '#9C27B0',
                color: attachments.length >= 5 ? 'text.disabled' : '#673AB7',
              }}
            >
              <AttachFileIcon />
            </IconButton>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask me anything about AI Agents... (e.g., 'How do our AI calling agents work?')"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              sx={{
                width: 48,
                height: 48,
                bgcolor: '#9C27B0',
                color: 'white',
                '&:hover': {
                  bgcolor: '#673AB7',
                },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                },
              }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default SalesCaptainAIAgent;
