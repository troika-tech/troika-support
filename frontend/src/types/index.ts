// Common types used across the application

export interface User {
  _id: string;
  email: string;
  role: 'super_admin' | 'manager' | 'sales_rep';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
  };
  companyId: string;
  groupId?: string;
  teamId?: string;
  isActive: boolean;
}

export interface Company {
  _id: string;
  name: string;
  domain?: string;
  logo?: string;
  settings: {
    maxUsers: number;
    trainingDuration: number;
    sessionDuration: number;
  };
}

export interface Team {
  _id: string;
  name: string;
  companyId: string;
  managerId: string;
  members: string[];
}

export interface Group {
  _id: string;
  name: string;
  companyId: string;
  teamId: string;
  members: string[];
  sessionTime: string;
  schedule: {
    days: number[];
    timezone: string;
  };
}

export interface TrainingScenario {
  _id: string;
  day: number;
  theme: string;
  description: string;
  category: string;
  scenarios: Scenario[];
}

export interface Scenario {
  scenarioId: string;
  title: string;
  customerMessage: string;
  idealResponse: string;
  coachingNotes: string[];
  toneGuidelines: string[];
  commonMistakes: string[];
}

export interface TrainingSession {
  _id: string;
  userId: string;
  groupId: string;
  scenarioId: string;
  day: number;
  sessionDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  conversationLog: Message[];
  performance: Performance;
}

export interface Message {
  _id: string;
  role: 'customer' | 'salesperson' | 'coach';
  message: string;
  timestamp: Date;
  metadata?: {
    corrections?: string[];
    improvedVersion?: string;
    scoreChange?: number;
  };
}

export interface Performance {
  initialResponse: string;
  correctedResponse: string;
  finalResponse: string;
  score: number;
  metrics: {
    confidence: number;
    clarity: number;
    structure: number;
    objectionHandling: number;
    closing: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
