// --- Email Hub Types ---

export type EmailProvider = 'google' | 'microsoft' | 'imap';

export type EmailCategory =
  | 'urgente'
  | 'importante'
  | 'informativo'
  | 'transaccional'
  | 'personal'
  | 'spam';

export const EMAIL_CATEGORY_COLORS: Record<EmailCategory, string> = {
  urgente: '#ef4444',
  importante: '#f97316',
  informativo: '#3b82f6',
  transaccional: '#6b7280',
  personal: '#22c55e',
  spam: '#374151',
};

export interface EmailAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  name: string;
  connected: boolean;
  lastSyncAt?: string;
  // IMAP-specific (encrypted on disk, never exposed to frontend raw)
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

export interface EmailMessage {
  id: string;
  accountId: string;
  threadId?: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  snippet: string; // first ~100 chars
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  category?: EmailCategory;
  labels?: string[];
  attachments?: { name: string; size: number; mimeType: string }[];
}

export interface EmailThread {
  id: string;
  messages: EmailMessage[];
  subject: string;
  lastDate: string;
  category?: EmailCategory;
  read: boolean;
}

export interface EmailSuggestedReply {
  id: string;
  text: string;
  tone: 'formal' | 'casual' | 'brief';
}

export interface EmailClassification {
  messageId: string;
  category: EmailCategory;
  confidence: number;
  reason: string;
}

export interface EmailComposeData {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  replyToId?: string;
  forwardFromId?: string;
}

export type EmailView = 'inbox' | 'compose' | 'settings';
