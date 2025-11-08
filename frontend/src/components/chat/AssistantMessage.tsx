import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

interface AssistantMessageProps {
  message: {
    id: string;
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
  };
  isStreaming: boolean;
  assistantName: string;
  avatarNode: ReactNode;
  accentColor?: string;
  secondaryAccentColor?: string;
}

const markdownComponents: Components = {
  a({ children, ...props }) {
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#1e90ff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.textDecoration = 'none';
        }}
      >
        {children}
      </a>
    );
  },
  strong({ children, ...props }) {
    return (
      <strong
        {...props}
        style={{
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {children}
      </strong>
    );
  },
  em({ children, ...props }) {
    return (
      <em
        {...props}
        style={{
          fontStyle: 'italic',
        }}
      >
        {children}
      </em>
    );
  },
  ul({ children, ...props }) {
    return (
      <ul
        {...props}
        style={{
          paddingLeft: '1.25rem',
          marginBlock: '0.5rem 0.75rem',
        }}
      >
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol
        {...props}
        style={{
          paddingLeft: '1.25rem',
          marginBlock: '0.5rem 0.75rem',
        }}
      >
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return (
      <li
        {...props}
        style={{
          marginBottom: '0.35rem',
          lineHeight: 1.5,
        }}
      >
        {children}
      </li>
    );
  },
};

const formatTimestamp = (timestamp: Date) => {
  const date =
    timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AssistantMessage = ({
  message,
  isStreaming,
  assistantName,
  avatarNode,
  accentColor = '#8b5cf6',
  secondaryAccentColor = '#ec4899',
}: AssistantMessageProps) => {
  const displayText =
    message.content?.trim().length && !isStreaming
      ? message.content
      : message.content?.trim().length
        ? message.content
          : isStreaming
          ? 'AI Assistant is typing...'
          : '';

  const attachments = Array.isArray(message.images)
    ? message.images
    : [];

  const sourcesUsed = message.metadata?.sourcesUsed ?? 0;
  const showSources = sourcesUsed > 0;

  return (
      <Stack
        spacing={1}
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '75%', lg: '70%' },
          ml: 0,
          mr: 'auto',
        }}
      >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 0.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            background: `linear-gradient(135deg, ${accentColor}, ${secondaryAccentColor})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)',
          }}
        >
          {avatarNode}
        </Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ fontWeight: 600 }}
        >
          {assistantName}
        </Typography>
      </Stack>

      <Box
        sx={{
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          boxShadow: 'none',
          p: 0,
          mt: 1.25,
        }}
      >
        {attachments.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            sx={{ mb: displayText ? 1.5 : 0 }}
          >
            {attachments.map((src, index) => (
              <Box
                key={`${message.id}-assistant-img-${index}`}
                component="img"
                src={src}
                alt={`Attachment ${index + 1}`}
                sx={{
                  width: 140,
                  height: 140,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.2)',
                }}
              />
            ))}
          </Stack>
        )}

          {displayText && (
            <Box
              sx={{
                color: 'text.primary',
                '& p': { margin: '0 0 0.75rem 0', lineHeight: 1.6 },
                '& p:last-of-type': { marginBottom: 0 },
              }}
            >
              <ReactMarkdown components={markdownComponents}>
                {displayText}
              </ReactMarkdown>
            </Box>
          )}

          {showSources && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Based on {sourcesUsed} knowledge source
              {sourcesUsed > 1 ? 's' : ''}
            </Typography>
          )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, textAlign: 'left' }}
        >
          {formatTimestamp(message.timestamp)}
        </Typography>
      </Box>
    </Stack>
  );
};

export default AssistantMessage;
