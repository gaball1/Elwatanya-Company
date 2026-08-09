export enum JobType {
  PDF_GENERATE = 'pdf:generate',
  AI_INDEX_DOCUMENT = 'ai:index-document',
  AI_GENERATE_EMBEDDING = 'ai:generate-embedding',
  AI_INGEST_KNOWLEDGE = 'ai:ingest-knowledge',
  KPI_SNAPSHOT = 'kpi:snapshot',
  NOTIFICATION_DELIVER = 'notification:deliver',
  REPORT_MONTHLY = 'report:monthly',
  AUDIT_EXPORT = 'audit:export',
  EMAIL_SEND = 'email:send',
  BACKUP_GENERATE = 'backup:generate',
  SEARCH_REINDEX = 'search:reindex',
  MAINTENANCE_CLEANUP_TEMP = 'maintenance:cleanup-temp',
  MAINTENANCE_CLEANUP_TOKENS = 'maintenance:cleanup-tokens',
  ATTENDANCE_DAILY_SUMMARY = 'attendance:daily-summary',
  CASHFLOW_DAILY_SUMMARY = 'cashflow:daily-summary',
  CONTRACTOR_PERFORMANCE = 'contractor:performance',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

export interface Job<T = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
  delayUntil?: Date;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
