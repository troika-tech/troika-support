import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  Button,
} from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import ReactMarkdown, { Components } from 'react-markdown';
import ChatInterface from '@/components/training/ChatInterface';
import aiService from '@/services/ai.service';
import toast from 'react-hot-toast';

const markdownComponents: Components = {
  strong({ children, ...props }) {
    const text = String(children ?? '');
    let color = 'text.primary';
    let borderColor = 'divider';

    if (text.includes('✅') || text.includes('STRENGTHS')) {
      color = 'success.dark';
      borderColor = 'success.light';
    } else if (text.includes('⚠️') || text.includes('IMPROVEMENT')) {
      color = 'warning.dark';
      borderColor = 'warning.light';
    } else if (text.includes('💡') || text.includes('TIP')) {
      color = 'info.dark';
      borderColor = 'info.light';
    }

    return (
      <strong
        {...props}
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          display: 'block',
          marginTop: '16px',
          marginBottom: '8px',
          paddingBottom: '8px',
          borderBottom: `2px solid`,
          color,
          borderColor,
          ...(props.style ?? {}),
        }}
      >
        {children}
      </strong>
    );
  },
};

// Define scenario types
interface Scenario {
  id: string;
  name: string;
  description: string;
}

// Define industry types
interface Industry {
  id: string;
  name: string;
}

// Sample scenarios - can be fetched from API later
const scenarios: Scenario[] = [
  {
    id: 'objection-handling',
    name: 'Objection Handling',
    description: 'Practice handling common customer objections',
  },
  {
    id: 'product-demo',
    name: 'Product Demo',
    description: 'Practice delivering effective product demonstrations',
  },
  {
    id: 'closing-techniques',
    name: 'Closing Techniques',
    description: 'Practice closing deals with various techniques',
  },
  {
    id: 'discovery-call',
    name: 'Discovery Call',
    description: 'Practice conducting discovery calls to understand customer needs',
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    description: 'Practice negotiating terms and pricing with customers',
  },
  {
    id: 'trial-small-pack-objections',
    name: 'Trial & Small Pack Objections',
    description: 'Handle objections related to trial requests and small package deals',
  },
  {
    id: 'pricing-discount-objections',
    name: 'Pricing & Discount Objections',
    description: 'Navigate pricing concerns and discount requests effectively',
  },
  {
    id: 'targeting-audience-clarity',
    name: 'Targeting & Audience Clarity',
    description: 'Help customers identify and clarify their target audience',
  },
  {
    id: 'silent-lead-followups',
    name: 'Silent Lead Follow-ups',
    description: 'Re-engage leads who have gone silent or unresponsive',
  },
  {
    id: 'intro-first-message-mastery',
    name: 'Intro & First Message Mastery',
    description: 'Craft compelling introductory messages that get responses',
  },
  {
    id: 'urgency-value-positioning',
    name: 'Urgency & Value Positioning',
    description: 'Create urgency while effectively positioning product value',
  },
  {
    id: 'bulk-deal-handling',
    name: 'Bulk Deal Handling (10L–50L)',
    description: 'Navigate large-scale bulk deals in the 10L to 50L range',
  },
];

// Industries - can be fetched from API later
const industries: Industry[] = [
  { id: 'technology', name: 'Technology' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'finance', name: 'Finance' },
  { id: 'retail', name: 'Retail' },
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'education', name: 'Education' },
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'hospitality', name: 'Hospitality' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'saas', name: 'SaaS' },
  { id: 'ecommerce', name: 'E-commerce' },
  { id: 'consulting', name: 'Consulting' },
];

const TrainingGround: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [newAIMessage, setNewAIMessage] = useState<string>('');
  const [analysisContent, setAnalysisContent] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);

  const handleScenarioChange = (event: SelectChangeEvent<string>) => {
    setSelectedScenario(event.target.value);
    setSessionStarted(false);
    setInitialMessage('');
  };

  const handleIndustryChange = (event: SelectChangeEvent<string>) => {
    setSelectedIndustry(event.target.value);
  };

  const handleGenerateScenario = async () => {
    if (!selectedScenario) {
      toast.error('Please select a scenario first');
      return;
    }

    setIsGenerating(true);
    setInitialMessage('');
    setAnalysisContent('');
    setConversationHistory([]);
    let streamedContent = '';

    try {
      await aiService.generateScenarioStream(
        selectedScenario,
        selectedIndustry || undefined,
        (chunk) => {
          streamedContent += chunk;
          setInitialMessage(streamedContent);
        },
        () => {
          setIsGenerating(false);
          setSessionStarted(true);
          // Don't add AI message to conversation history - only track user messages
          toast.success('Scenario generated! Start practicing.');
        },
        (error) => {
          setIsGenerating(false);
          toast.error(`Error: ${error}`);
        }
      );
    } catch (error) {
      setIsGenerating(false);
      toast.error('Failed to generate scenario');
      console.error('Error generating scenario:', error);
    }
  };

  const handleUserMessage = async (userResponse: string) => {
    // Update conversation history
    const updatedHistory = [...conversationHistory, { role: 'user', content: userResponse }];
    setConversationHistory(updatedHistory);

    // Trigger analysis
    setIsAnalyzing(true);
    setAnalysisContent('');
    let streamedAnalysis = '';

    try {
      await aiService.analyzeResponseStream(
        userResponse,
        selectedScenario,
        updatedHistory,
        (chunk) => {
          streamedAnalysis += chunk;
          setAnalysisContent(streamedAnalysis);
        },
        () => {
          setIsAnalyzing(false);
        },
        (error) => {
          setIsAnalyzing(false);
          toast.error(`Analysis error: ${error}`);
        }
      );
    } catch (error) {
      setIsAnalyzing(false);
      console.error('Error analyzing response:', error);
    }
  };

  const handleRetry = () => {
    // Remove the last user message from conversation history
    setConversationHistory((prev) => prev.slice(0, -1));
    // Clear the analysis content
    setAnalysisContent('');
  };

  const handleContinue = async () => {
    if (!conversationHistory.length || isGenerating || isAnalyzing) {
      return;
    }

    setIsGenerating(true);
    setNewAIMessage('');
    let streamedContent = '';

    try {
      await aiService.continueConversationStream(
        selectedScenario,
        conversationHistory,
        selectedIndustry || undefined,
        (chunk) => {
          streamedContent += chunk;
        },
        () => {
          setNewAIMessage(streamedContent);
          setIsGenerating(false);
          toast.success('Conversation continued!');
        },
        (error) => {
          setIsGenerating(false);
          toast.error(`Error: ${error}`);
        }
      );
    } catch (error) {
      setIsGenerating(false);
      toast.error('Failed to continue conversation');
      console.error('Error continuing conversation:', error);
    }
  };

  const selectedScenarioData = scenarios.find(
    (scenario) => scenario.id === selectedScenario
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(106, 92, 255, 0.08) 0%, rgba(158, 229, 255, 0.05) 50%, rgba(255, 255, 255, 1) 100%)',
      }}
    >
      <Container
        maxWidth="xl"
        disableGutters
        sx={{
          pt: 4,
          pb: 4,
          px: { xs: 2, md: 4 },
        }}
      >
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Training Ground
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select a scenario and practice your sales skills in a safe environment
        </Typography>
      </Box>

      {/* Scenario and Industry Selectors */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* Scenario Selector */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="scenario-select-label">Select Scenario</InputLabel>
              <Select
                labelId="scenario-select-label"
                id="scenario-select"
                value={selectedScenario}
                label="Select Scenario"
                onChange={handleScenarioChange}
              >
                <MenuItem value="">
                  <em>Choose a scenario to begin...</em>
                </MenuItem>
                {scenarios.map((scenario) => (
                  <MenuItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Industry Selector */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="industry-select-label">Select Industry</InputLabel>
              <Select
                labelId="industry-select-label"
                id="industry-select"
                value={selectedIndustry}
                label="Select Industry"
                onChange={handleIndustryChange}
              >
                <MenuItem value="">
                  <em>Choose an industry (optional)...</em>
                </MenuItem>
                {industries.map((industry) => (
                  <MenuItem key={industry.id} value={industry.id}>
                    {industry.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayIcon />}
            onClick={handleGenerateScenario}
            disabled={isGenerating}
            sx={{ px: 4, py: 1.5 }}
          >
            {isGenerating ? 'Generating Scenario...' : 'Generate & Start Training'}
          </Button>
        </Box>
      </Box>

      {/* Split Panel Layout - 60:40 ratio */}
      {selectedScenario && (sessionStarted || isGenerating) && (
        <Grid container spacing={2} alignItems="flex-start">
          {/* Left Panel - Chat Interface (60%) */}
          <Grid item xs={12} md={7.2}>
            <Paper
              elevation={2}
              sx={{
                height: { xs: 520, md: '68vh' },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Conversation
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <ChatInterface
                  scenarioId={selectedScenario}
                  scenarioName={selectedScenarioData?.name || ''}
                  initialMessage={initialMessage}
                  newAIMessage={newAIMessage}
                  onUserMessage={handleUserMessage}
                  onContinue={handleContinue}
                  onRetry={handleRetry}
                  isAnalyzing={isAnalyzing}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Right Panel - Real-time Analysis (40%) */}
          <Grid item xs={12} md={4.8}>
            <Paper
              elevation={2}
              sx={{
                height: { xs: 520, md: '68vh' },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: 'secondary.main',
                  color: 'secondary.contrastText',
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Real-time Analysis
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  p: 3,
                  overflowY: 'auto',
                }}
              >
                {isAnalyzing && !analysisContent && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        Analyzing your response...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {!analysisContent && !isAnalyzing && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body1" textAlign="center" color="text.secondary">
                      Send a message to get real-time AI analysis of your response
                    </Typography>
                  </Box>
                )}

                {analysisContent && (
                  <Box
                    sx={{
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        marginTop: 2,
                        marginBottom: 1,
                        fontWeight: 'bold',
                      },
                      '& p': {
                        marginBottom: 1.5,
                        lineHeight: 1.6,
                        fontSize: '0.95rem',
                      },
                      '& strong': {
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        display: 'block',
                        marginTop: 2,
                        marginBottom: 1,
                        paddingBottom: 1,
                        borderBottom: '2px solid',
                        // Color code based on emoji in the text
                        '&:has-text("✅")': {
                          color: 'success.main',
                          borderColor: 'success.light',
                        },
                        '&:has-text("⚠️")': {
                          color: 'warning.main',
                          borderColor: 'warning.light',
                        },
                        '&:has-text("💡")': {
                          color: 'info.main',
                          borderColor: 'info.light',
                        },
                      },
                      '& ul, & ol': {
                        paddingLeft: 3,
                        marginBottom: 2,
                        marginTop: 1,
                      },
                      '& li': {
                        marginBottom: 0.75,
                        lineHeight: 1.8,
                        fontSize: '0.95rem',
                      },
                      '& code': {
                        backgroundColor: 'grey.100',
                        padding: '2px 6px',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                      },
                      '& pre': {
                        backgroundColor: 'grey.100',
                        padding: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                      },
                    }}
                  >
                    <ReactMarkdown components={markdownComponents}>
                      {analysisContent}
                    </ReactMarkdown>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Empty State when no scenario selected or session not started */}
      {!selectedScenario && (
        <Paper
          sx={{
            height: 'calc(100vh - 320px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Select a scenario to start training
            </Typography>
            <Typography variant="body1" color="text.disabled">
              Choose from the dropdown above to begin your practice session
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Waiting state - scenario selected but not generated yet */}
      {selectedScenario && !sessionStarted && !isGenerating && (
        <Paper
          sx={{
            height: 'calc(100vh - 400px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Ready to begin!
            </Typography>
            <Typography variant="body1" color="text.disabled">
              Click the "Generate & Start Training" button above to start your practice session
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
    </Box>
  );
};

export default TrainingGround;
