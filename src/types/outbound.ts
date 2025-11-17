export interface OutboundCallConfig {
  assistantId: string;
  phoneNumberId: string;
  customer: {
    number: string;
    name?: string;
  };
  schedulePlan?: {
    earliestAt?: string;
    latestAt?: string;
  };
}

export interface OutboundCall {
  id: string;
  status: 'scheduled' | 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  customer: {
    name?: string;
    number: string;
  };
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  analysis?: any;
  error?: string;
  retryCount?: number;
  recordingUrl?: string;
}

export interface BatchCallRequest {
  assistantId: string;
  phoneNumberId: string;
  customers: Array<{
    number: string;
    name?: string;
  }>;
  schedulePlan?: {
    earliestAt?: string;
    latestAt?: string;
  };
}

export interface CallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  successRate: number;
}
