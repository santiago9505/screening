import {
  EmailAccount,
  EmailMessage,
  EmailComposeData,
  EmailSuggestedReply,
  EmailClassification,
  EmailProvider,
} from '../types/email';
import axios from 'axios';

const API = '/api/email';

class EmailService {
  // --- Accounts ---

  async getAccounts(): Promise<EmailAccount[]> {
    const { data } = await axios.get(`${API}/accounts`);
    return data;
  }

  async addAccount(provider: EmailProvider, credentials: Record<string, string>): Promise<EmailAccount> {
    const { data } = await axios.post(`${API}/accounts`, { provider, credentials });
    return data;
  }

  async removeAccount(accountId: string): Promise<void> {
    await axios.delete(`${API}/accounts/${encodeURIComponent(accountId)}`);
  }

  // --- OAuth helpers ---

  getOAuthUrl(provider: 'google' | 'microsoft'): string {
    return `${API}/oauth/${provider}/start`;
  }

  async completeOAuth(provider: 'google' | 'microsoft', code: string): Promise<EmailAccount> {
    const { data } = await axios.post(`${API}/oauth/${provider}/callback`, { code });
    return data;
  }

  // --- Messages ---

  async sync(accountId: string): Promise<{ newMessages: number }> {
    const { data } = await axios.post(`${API}/sync`, { accountId });
    return data;
  }

  async getMessages(accountId: string, options?: {
    category?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<EmailMessage[]> {
    const { data } = await axios.get(`${API}/messages`, {
      params: { accountId, ...options },
    });
    return data;
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    const { data } = await axios.get(`${API}/message/${encodeURIComponent(messageId)}`);
    return data;
  }

  async markAsRead(messageId: string): Promise<void> {
    await axios.patch(`${API}/message/${encodeURIComponent(messageId)}`, { read: true });
  }

  async toggleStar(messageId: string, starred: boolean): Promise<void> {
    await axios.patch(`${API}/message/${encodeURIComponent(messageId)}`, { starred });
  }

  async archiveMessage(messageId: string): Promise<void> {
    await axios.post(`${API}/message/${encodeURIComponent(messageId)}/archive`);
  }

  // --- Send ---

  async send(composeData: EmailComposeData): Promise<void> {
    await axios.post(`${API}/send`, composeData);
  }

  async reply(messageId: string, body: string): Promise<void> {
    await axios.post(`${API}/reply/${encodeURIComponent(messageId)}`, { body });
  }

  // --- AI ---

  async classify(messageId: string): Promise<EmailClassification> {
    const { data } = await axios.post(`${API}/classify`, { messageId });
    return data;
  }

  async suggestReplies(messageId: string): Promise<EmailSuggestedReply[]> {
    const { data } = await axios.post(`${API}/suggest-reply`, { messageId });
    return data;
  }

  async summarizeThread(threadId: string): Promise<string> {
    const { data } = await axios.post(`${API}/summarize`, { threadId });
    return data.summary;
  }

  async assistCompose(draft: string, instruction: string): Promise<string> {
    const { data } = await axios.post(`${API}/assist-compose`, { draft, instruction });
    return data.result;
  }
}

export const emailService = new EmailService();
