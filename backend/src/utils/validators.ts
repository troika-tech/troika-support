import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['super_admin', 'manager', 'sales_rep']).optional(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  managerId: z.string().min(1, 'Manager ID is required'),
  members: z.array(z.string()).optional(),
});

// Group validation schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  teamId: z.string().min(1, 'Team ID is required'),
  members: z.array(z.string()).min(1, 'At least one member required'),
  sessionTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format'),
  schedule: z.object({
    days: z.array(z.number().min(0).max(6)),
    timezone: z.string(),
  }),
});

// Training scenario validation schemas
export const createScenarioSchema = z.object({
  day: z.number().min(1).max(10),
  theme: z.string().min(1, 'Theme is required'),
  description: z.string(),
  category: z.enum(['objection_handling', 'closing', 'follow_up', 'intro', 'pricing']),
  scenarios: z.array(z.object({
    scenarioId: z.string(),
    title: z.string(),
    customerMessage: z.string(),
    idealResponse: z.string(),
    coachingNotes: z.array(z.string()),
    toneGuidelines: z.array(z.string()),
    commonMistakes: z.array(z.string()),
  })),
  voiceDrill: z.object({
    text: z.string(),
    instructions: z.string(),
  }).optional(),
});

// Session validation schemas
export const createSessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
  sessionDate: z.string().datetime(),
});

// Message validation schema
export const messageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  message: z.string().min(1, 'Message cannot be empty'),
  role: z.enum(['customer', 'salesperson', 'coach']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
