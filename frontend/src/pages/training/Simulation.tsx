import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  RestartAlt as ResetIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import simulationService, {
  SimulationDifficulty,
  SimulationPersona,
  SimulationSituation,
  SimulationMessagePayload,
} from '@/services/simulation.service';
import aiService from '@/services/ai.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const difficultyOptions: Array<{
  label: string;
  value: SimulationDifficulty;
  description: string;
}> = [
  { label: 'Easy', value: 'easy', description: 'Cooperative but still expects clarity.' },
  { label: 'Standard', value: 'standard', description: 'Balanced pushback with realistic tension.' },
  { label: 'Hard', value: 'hard', description: 'Demanding, layered objections, tougher to convince.' },
];

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatTimestamp = (timestamp: Date) =>
  timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Simulation: React.FC = () => {
  const [difficulty, setDifficulty] = useState<SimulationDifficulty>('standard');
  const [scenarios, setScenarios] = useState<SimulationSituation[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(true);
  const [selectedScenario, setSelectedScenario] = useState<SimulationSituation | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<SimulationPersona | ''>('');
  const [simulationActive, setSimulationActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [conversationReview, setConversationReview] = useState<{
    overallScore: number;
    summary: string;
    keyTakeaways: string[];
  } | null>(null);
  const streamingMessageId = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const controlButtonBaseSx = {
    minWidth: 150,
    height: 56,
    px: 3,
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: 3,
    justifyContent: 'center',
    gap: 1,
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
    '& .MuiButton-startIcon, & .MuiButton-endIcon': {
      margin: 0,
    },
    '&.Mui-disabled': {
      boxShadow: 'none',
      backgroundColor: 'grey.100',
      borderColor: 'grey.200',
      color: 'text.disabled',
    },
  };

  const fetchScenarios = useCallback(async () => {
    setIsLoadingScenarios(true);
    setScenarioError(null);
    try {
      const data = await simulationService.getSituations();
      const serverScenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];

      if (!serverScenarios.length) {
        setScenarioError('No scenarios returned from the server.');
      }

      setScenarios(serverScenarios);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Unable to load simulation scenarios right now.';
      setScenarioError(message);
      toast.error('Unable to load simulation scenarios right now.');
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scroll({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    // Reset state whenever difficulty changes to avoid mismatched selections
    setSelectedScenario(null);
    setSelectedPersona('');
    setSimulationActive(false);
    setMessages([]);
    setInput('');
  }, [difficulty]);

  const filteredScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.difficulty === difficulty),
    [scenarios, difficulty]
  );

  const handleSelectScenario = (scenario: SimulationSituation) => {
    setSelectedScenario(scenario);
    setSelectedPersona(scenario.personaOptions[0] ?? '');
    setSimulationActive(false);
    setMessages([]);
    setInput('');
    setConversationReview(null);
  };

  const handleStartSimulation = () => {
    if (!selectedScenario) {
      toast.error('Select a scenario to begin.');
      return;
    }

    if (!selectedPersona) {
      toast.error('Choose a persona for this buyer.');
      return;
    }

    setMessages([
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: selectedScenario.starterMessage,
        timestamp: new Date(),
      },
    ]);
    setSimulationActive(true);
    setConversationReview(null);
    toast.success('Simulation started');
  };

  const handleResetSimulation = () => {
    setMessages([]);
    setSimulationActive(false);
    setInput('');
    streamingMessageId.current = null;
    setConversationReview(null);
  };

  const handleStopSimulation = async () => {
    if (!selectedScenario) {
      toast.error('Select a scenario first.');
      return;
    }
    if (!simulationActive || messages.length === 0) {
      toast.error('Start a simulation and exchange a few messages before stopping.');
      return;
    }
    if (isStreaming) {
      toast.error('Wait for the customer reply to finish before stopping.');
      return;
    }

    setIsReviewing(true);
    try {
      const historyPayload = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const { evaluation } = await aiService.evaluateConversation(
        historyPayload,
        selectedScenario.id
      );

      setConversationReview(evaluation);
      toast.success('Conversation analyzed.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to analyze conversation. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) {
      return;
    }
    if (isStreaming) {
      toast.error('Customer is still replying. Wait a moment before sending another message.');
      return;
    }

    if (!selectedScenario || !simulationActive) {
      toast.error('Start the simulation before replying.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const historyPayload: SimulationMessagePayload[] = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setConversationReview(null);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    let streamedContent = '';

    const placeholderId = `assistant-${Date.now()}`;
    streamingMessageId.current = placeholderId;
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: 'assistant',
        content: '...',
        timestamp: new Date(),
      },
    ]);

    try {
      await simulationService.streamResponse(
        {
          scenarioId: selectedScenario.id,
          persona: selectedPersona || undefined,
          conversationHistory: historyPayload,
        },
        (chunk) => {
          streamedContent += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === streamingMessageId.current
                ? { ...message, content: streamedContent }
                : message
            )
          );
        },
        () => {
          const lastMessageId = streamingMessageId.current;
          const finalText = streamedContent.trim();

          if (lastMessageId) {
            if (!finalText) {
              setMessages((prev) => prev.filter((msg) => msg.id !== lastMessageId));
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === lastMessageId ? { ...msg, content: finalText } : msg
                )
              );
            }
          }

          streamingMessageId.current = null;
          setIsStreaming(false);
        },
        (errorMessage) => {
          setIsStreaming(false);
          if (streamingMessageId.current) {
            setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId.current));
            streamingMessageId.current = null;
          }
          toast.error(errorMessage || 'Simulation response failed.');
        }
      );
    } catch (error) {
      setIsStreaming(false);
      if (streamingMessageId.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId.current));
        streamingMessageId.current = null;
      }
      toast.error(error instanceof Error ? error.message : 'Simulation response failed.');
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Simulation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pick a difficulty, choose a scenario, and role-play with a live objection simulator.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Difficulty
            </Typography>
            <ToggleButtonGroup
              value={difficulty}
              exclusive
              onChange={(_, value) => value && setDifficulty(value)}
              color="primary"
              aria-label="Select difficulty"
            >
              {difficultyOptions.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {difficultyOptions.find((option) => option.value === difficulty)?.description}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {selectedScenario ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedScenario.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedScenario.theme}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, mb: 2 }}>
                  {selectedScenario.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Stack>

                <Typography variant="subtitle2" gutterBottom>
                  Persona
                </Typography>
                <ToggleButtonGroup
                  value={selectedPersona}
                  exclusive
                  onChange={(_, value) => value && setSelectedPersona(value)}
                  aria-label="Select persona"
                  size="small"
                >
                  {selectedScenario.personaOptions.map((persona) => (
                    <ToggleButton key={persona} value={persona}>
                      {capitalize(persona)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Starter Objection:
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mt: 1, bgcolor: 'grey.50', borderStyle: 'dashed' }}
                >
                  <Typography variant="body2">{selectedScenario.starterMessage}</Typography>
                </Paper>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mt: 3 }}
                >
                  <Button
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={handleStartSimulation}
                    disabled={simulationActive && messages.length > 0}
                    sx={{
                      ...controlButtonBaseSx,
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      width: { xs: '100%', sm: 'auto' },
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      },
                    }}
                  >
                    {simulationActive ? 'Simulation Active' : 'Start Simulation'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleStopSimulation}
                    startIcon={<StopIcon />}
                    disabled={!simulationActive || isStreaming || isReviewing || messages.length === 0}
                    sx={{
                      ...controlButtonBaseSx,
                      width: { xs: '100%', sm: 'auto' },
                      boxShadow: 'none',
                      borderWidth: 2,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      backgroundColor: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        borderColor: 'primary.dark',
                      },
                      '&.Mui-disabled': {
                        borderColor: 'divider',
                      },
                    }}
                  >
                    {isReviewing ? 'Analyzing...' : 'Stop & Analyze'}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select a scenario from the list below to preview personas and start practicing.
              </Typography>
            )}
          </Paper>

          <Paper
            sx={{
              mt: 3,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '60vh',
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6">Scenarios</Typography>
                <Typography
                  variant="body2"
                  color={scenarioError ? 'error.main' : 'text.secondary'}
                >
                  {filteredScenarios.length} situation{filteredScenarios.length === 1 ? '' : 's'} for{' '}
                  {difficulty} difficulty
                </Typography>
                {scenarioError && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                    {scenarioError}
                  </Typography>
                )}
              </Box>
              <Button
                variant="text"
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                onClick={fetchScenarios}
                disabled={isLoadingScenarios}
              >
                Refresh
              </Button>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {isLoadingScenarios ? (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading scenarios...
                  </Typography>
                </Stack>
              ) : filteredScenarios.length === 0 ? (
                <Typography variant="body2" color={scenarioError ? 'error.main' : 'text.secondary'}>
                  {scenarioError
                    ? 'Unable to load scenarios. Please refresh.'
                    : 'No scenarios available for this difficulty yet.'}
                </Typography>
              ) : (
                filteredScenarios.map((scenario) => {
                  const isActive = selectedScenario?.id === scenario.id;
                  return (
                    <Paper
                      key={scenario.id}
                      variant="outlined"
                      onClick={() => handleSelectScenario(scenario)}
                      sx={{
                        p: 2,
                        mb: 2,
                        borderColor: isActive ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isActive ? '0 0 0 2px rgba(99,102,241,0.15)' : 'none',
                        '&:hover': {
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {scenario.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {scenario.theme}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Personas: {scenario.personaOptions.map(capitalize).join(', ')}
                      </Typography>
                    </Paper>
                  );
                })
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Live Role-play</Typography>
              <Typography variant="body2" color="text.secondary">
                Exchange WhatsApp-style messages. The AI buyer adapts to your persona & difficulty.
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{ flex: 1, overflowY: 'auto', pr: 1 }}
              ref={chatContainerRef}
            >
              {messages.length === 0 ? (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{ height: '100%', textAlign: 'center', color: 'text.secondary' }}
                >
                  <Typography variant="body1">
                    Start a simulation to see the first objection from the customer.
                  </Typography>
                  <Typography variant="body2">
                    Reply once you are ready, and the AI buyer will continue the conversation.
                  </Typography>
                </Stack>
              ) : (
                messages.map((message) => (
                  <Stack
                    key={message.id}
                    alignItems={message.role === 'user' ? 'flex-end' : 'flex-start'}
                    sx={{ mb: 2 }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '80%',
                        bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                        color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                        {formatTimestamp(message.timestamp)}
                      </Typography>
                    </Paper>
                  </Stack>
                ))
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <TextField
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                placeholder={
                  simulationActive
                    ? 'Type your WhatsApp-style reply...'
                    : 'Start a simulation to enable replies.'
                }
                value={input}
                disabled={!simulationActive || isStreaming}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ mt: 1 }}>
                {isStreaming && (
                  <Typography variant="caption" color="text.secondary">
                    Customer is typing...
                  </Typography>
                )}
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleSendMessage}
                  disabled={!simulationActive || !input.trim() || isStreaming}
                >
                  Send Reply
                </Button>
              </Stack>
            </Box>
          </Paper>
          {conversationReview && (
            <Paper sx={{ mt: 3, p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Conversation Review
              </Typography>
              <Typography variant="subtitle1" color="primary.main">
                Overall Score: {conversationReview.overallScore}/100
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {conversationReview.summary}
              </Typography>
              {conversationReview.keyTakeaways?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Takeaways
                  </Typography>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    {conversationReview.keyTakeaways.map((takeaway, index) => (
                      <li key={`takeaway-${index}`} style={{ marginBottom: '0.5rem' }}>
                        <Typography variant="body2">{takeaway}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Simulation;
