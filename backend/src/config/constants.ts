export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  SALES_REP: 'sales_rep',
} as const;

export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  MISSED: 'missed',
} as const;

export const CHAT_ROLES = {
  CUSTOMER: 'customer',
  SALESPERSON: 'salesperson',
  COACH: 'coach',
} as const;

export const CHAT_STEPS = {
  CUSTOMER_OBJECTION: 'customer_objection',
  SALESPERSON_RESPONSE: 'salesperson_response',
  COACH_CORRECTION: 'coach_correction',
  SALESPERSON_REPEAT: 'salesperson_repeat',
  COMPLETED: 'completed',
} as const;

export const SUBSCRIPTION_PLANS = {
  TRIAL: 'trial',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const;

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
} as const;

export const STORAGE_PROVIDERS = {
  S3: 's3',
  CLOUDINARY: 'cloudinary',
} as const;

export const TRAINING_DURATION_DAYS = 10;
export const DEFAULT_SESSION_DURATION_MINUTES = 5;

export const PERFORMANCE_METRICS = {
  CONFIDENCE: 'confidence',
  CLARITY: 'clarity',
  STRUCTURE: 'structure',
  OBJECTION_HANDLING: 'objectionHandling',
  CLOSING: 'closing',
} as const;
