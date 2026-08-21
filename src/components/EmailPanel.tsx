import { useState, useEffect, useCallback } from 'react';
import { emailService } from '../services/emailService';
import {
  EmailAccount,
  EmailMessage,
  EmailCategory,
  EmailSuggestedReply,
  EmailView,
  EmailProvider,
  EMAIL_CATEGORY_COLORS,
  EmailComposeData,
} from '../types/email';
import {
  Mail,
  Inbox,
  Send,
  Settings,
  Plus,
  RefreshCw,
  Star,
  ArrowLeft,
  Sparkles,
  Loader,
  Trash2,
  X,
  ChevronRight,
} from 'lucide-react';
import { shouldPreferDirectMarketData } from '../config/runtime';

// --- Sub-components ---

function CategoryBadge({ category }: { category?: EmailCategory }) {
  if (!category) return null;
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: EMAIL_CATEGORY_COLORS[category] + '22',
        color: EMAIL_CATEGORY_COLORS[category],
      }}
    >
      {category}
    </span>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
      <Icon size={40} strokeWidth={1} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// --- Account Setup ---

function AccountSetup({
  onAddAccount,
  onClose,
}: {
  onAddAccount: (provider: EmailProvider, creds: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<EmailProvider | null>(null);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const providers: { id: EmailProvider; label: string; desc: string }[] = [
    { id: 'google', label: 'Google', desc: 'Gmail, Google Workspace' },
    { id: 'microsoft', label: 'Microsoft', desc: 'Outlook, Office 365' },
    { id: 'imap', label: 'IMAP', desc: 'Namecheap, cualquier proveedor' },
  ];

  const handleOAuth = (p: 'google' | 'microsoft') => {
    window.open(emailService.getOAuthUrl(p), '_blank', 'width=500,height=600');
  };

  const handleImapSubmit = () => {
    if (!email || !password || !imapHost || !smtpHost) return;
    onAddAccount('imap', { email, password, imapHost, imapPort, smtpHost, smtpPort });
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-lg mx-auto gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Agregar cuenta</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {!provider ? (
        <div className="space-y-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (p.id === 'imap') setProvider('imap');
                else handleOAuth(p.id as 'google' | 'microsoft');
              }}
              className="w-full flex items-center justify-between bg-dark-100 hover:bg-dark-200 rounded-lg p-4 transition-colors"
            >
              <div className="text-left">
                <p className="text-white font-medium">{p.label}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => setProvider(null)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <ArrowLeft size={12} /> Volver
          </button>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />
          <input
            type="password"
            placeholder="App Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="IMAP Host"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
            <input
              placeholder="Puerto"
              value={imapPort}
              onChange={(e) => setImapPort(e.target.value)}
              className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="SMTP Host"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
            <input
              placeholder="Puerto"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
          </div>
          <button
            onClick={handleImapSubmit}
            disabled={!email || !password || !imapHost || !smtpHost}
            className="w-full bg-accent-blue hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Conectar
          </button>
        </div>
      )}
    </div>
  );
}

// --- Compose ---

function ComposeView({
  replyTo,
  onSend,
  onCancel,
}: {
  replyTo?: EmailMessage | null;
  onSend: (data: EmailComposeData) => Promise<void>;
  onCancel: () => void;
}) {
  const [to, setTo] = useState(replyTo ? replyTo.from.email : '');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSend = async () => {
    if (!to || !subject) return;
    setSending(true);
    try {
      await onSend({
        to,
        subject,
        body,
        replyToId: replyTo?.id,
      });
    } finally {
      setSending(false);
    }
  };

  const handleAiAssist = async (instruction: string) => {
    setAiLoading(true);
    try {
      const result = await emailService.assistCompose(body, instruction);
      setBody(result);
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          {replyTo ? 'Responder' : 'Nuevo correo'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <input
        type="email"
        placeholder="Para"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
      />
      <input
        placeholder="Asunto"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
      />
      <textarea
        placeholder="Escribe tu mensaje..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        className="flex-1 bg-dark-300 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue resize-none"
      />

      {/* AI assist bar */}
      <div className="flex items-center gap-2 text-xs">
        <Sparkles size={12} className="text-accent-blue" />
        {['Mas formal', 'Mas corto', 'En ingles'].map((label) => (
          <button
            key={label}
            onClick={() => handleAiAssist(label.toLowerCase())}
            disabled={aiLoading || !body}
            className="px-2 py-1 rounded bg-dark-100 text-gray-300 hover:bg-dark-200 disabled:opacity-40 transition-colors"
          >
            {label}
          </button>
        ))}
        {aiLoading && <Loader size={12} className="animate-spin text-accent-blue" />}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject}
          className="bg-accent-blue hover:bg-blue-600 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar
        </button>
      </div>
    </div>
  );
}

// --- Message Detail ---

function MessageDetail({
  message,
  onBack,
  onReply,
  onArchive,
}: {
  message: EmailMessage;
  onBack: () => void;
  onReply: () => void;
  onArchive: () => void;
}) {
  const [suggestions, setSuggestions] = useState<EmailSuggestedReply[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const replies = await emailService.suggestReplies(message.id);
      setSuggestions(replies);
    } catch {
      // silent
    } finally {
      setLoadingSuggestions(false);
    }
  }, [message.id]);

  useEffect(() => {
    if (message.category === 'urgente' || message.category === 'importante') {
      loadSuggestions();
    }
  }, [message.category, loadSuggestions]);

  const handleSummarize = async () => {
    if (!message.threadId) return;
    try {
      const s = await emailService.summarizeThread(message.threadId);
      setSummary(s);
    } catch {
      // silent
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{message.subject}</h3>
          <p className="text-xs text-gray-400">
            {message.from.name || message.from.email} · {new Date(message.date).toLocaleDateString()}
          </p>
        </div>
        <CategoryBadge category={message.category} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {summary && (
          <div className="mb-4 bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-blue mb-1">Resumen IA</p>
            <p className="text-sm text-gray-200">{summary}</p>
          </div>
        )}

        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {message.body}
        </div>
      </div>

      {/* AI Suggested replies */}
      {(suggestions.length > 0 || loadingSuggestions) && (
        <div className="border-t border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-accent-blue" />
            <span className="text-xs text-gray-400">Respuestas sugeridas</span>
            {loadingSuggestions && <Loader size={10} className="animate-spin text-accent-blue" />}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={onReply}
                className="text-xs bg-dark-100 hover:bg-dark-200 text-gray-200 px-3 py-1.5 rounded-lg transition-colors text-left max-w-[280px] truncate"
                title={s.text}
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-700 p-3 flex items-center gap-2">
        <button
          onClick={onReply}
          className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          Responder
        </button>
        <button
          onClick={onArchive}
          className="bg-dark-100 hover:bg-dark-200 text-gray-300 px-4 py-1.5 rounded-lg text-xs transition-colors"
        >
          Archivar
        </button>
        {message.threadId && (
          <button
            onClick={handleSummarize}
            className="bg-dark-100 hover:bg-dark-200 text-gray-300 px-4 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1"
          >
            <Sparkles size={10} /> Resumir hilo
          </button>
        )}
      </div>
    </div>
  );
}

// --- Main EmailPanel ---

export default function EmailPanel() {
  const [view, setView] = useState<EmailView>('inbox');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | null>(null);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load messages when account changes
  useEffect(() => {
    if (activeAccountId) loadMessages();
  }, [activeAccountId, categoryFilter]);

  const loadAccounts = async () => {
    try {
      const accs = await emailService.getAccounts();
      setAccounts(accs);
      if (accs.length > 0 && !activeAccountId) {
        setActiveAccountId(accs[0].id);
      }
    } catch {
      // first time, no accounts yet
    }
  };

  const loadMessages = async () => {
    if (!activeAccountId) return;
    setLoading(true);
    try {
      const msgs = await emailService.getMessages(activeAccountId, {
        category: categoryFilter || undefined,
        limit: 50,
      });
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!activeAccountId) return;
    setSyncing(true);
    try {
      await emailService.sync(activeAccountId);
      await loadMessages();
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectMessage = async (msg: EmailMessage) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      try {
        await emailService.markAsRead(msg.id);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      } catch {
        // silent
      }
    }
  };

  const handleArchive = async () => {
    if (!selectedMessage) return;
    try {
      await emailService.archiveMessage(selectedMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
      setSelectedMessage(null);
    } catch {
      // silent
    }
  };

  const handleSend = async (data: EmailComposeData) => {
    await emailService.send(data);
    setView('inbox');
    setReplyTo(null);
  };

  const handleAddAccount = async (provider: EmailProvider, creds: Record<string, string>) => {
    try {
      await emailService.addAccount(provider, creds);
      await loadAccounts();
      setView('inbox');
    } catch {
      // silent
    }
  };

  const handleRemoveAccount = async (id: string) => {
    try {
      await emailService.removeAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      if (activeAccountId === id) {
        setActiveAccountId(accounts.find((a) => a.id !== id)?.id || null);
      }
    } catch {
      // silent
    }
  };

  const categories: (EmailCategory | null)[] = [null, 'urgente', 'importante', 'informativo', 'personal'];

  if (shouldPreferDirectMarketData) {
    return (
      <div className="flex flex-1 items-center justify-center bg-dark-300 p-6">
        <div className="max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-blue-400/15 bg-blue-400/[0.06] text-blue-300">
            <Mail size={24} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Research inbox</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Tu correo permanece privado</h2>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            La conexión IMAP, las respuestas asistidas y la sincronización de mensajes solo se ejecutan dentro de tu motor local. Abre la versión de escritorio para usar este módulo.
          </p>
        </div>
      </div>
    );
  }

  // --- No accounts: show setup ---
  if (accounts.length === 0 && view !== 'settings') {
    return (
      <div className="flex-1 flex flex-col bg-dark-300">
        <AccountSetup onAddAccount={handleAddAccount} onClose={() => {}} />
      </div>
    );
  }

  // --- Settings view ---
  if (view === 'settings') {
    return (
      <div className="flex-1 flex flex-col bg-dark-300">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Cuentas de correo</h2>
          <button onClick={() => setView('inbox')} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between bg-dark-100 rounded-lg p-3">
              <div>
                <p className="text-sm text-white">{acc.email}</p>
                <p className="text-xs text-gray-400">{acc.provider}</p>
              </div>
              <button
                onClick={() => handleRemoveAccount(acc.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4">
          <AccountSetup onAddAccount={handleAddAccount} onClose={() => setView('inbox')} />
        </div>
      </div>
    );
  }

  // --- Compose view ---
  if (view === 'compose') {
    return (
      <div className="flex-1 flex flex-col bg-dark-300">
        <ComposeView
          replyTo={replyTo}
          onSend={handleSend}
          onCancel={() => {
            setView('inbox');
            setReplyTo(null);
          }}
        />
      </div>
    );
  }

  // --- Inbox view ---
  return (
    <div className="flex-1 flex flex-col bg-dark-300 overflow-hidden">
      {/* Top bar */}
      <div className="p-3 border-b border-gray-700 flex items-center gap-2">
        {/* Account selector */}
        {accounts.length > 1 && (
          <select
            value={activeAccountId || ''}
            onChange={(e) => setActiveAccountId(e.target.value)}
            className="bg-dark-100 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.email}
              </option>
            ))}
          </select>
        )}

        {/* Category filters */}
        <div className="flex items-center gap-1 flex-1">
          {categories.map((cat) => (
            <button
              key={cat || 'all'}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                categoryFilter === cat
                  ? 'bg-accent-blue text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-100'
              }`}
            >
              {cat || 'Todo'}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-gray-400 hover:text-white transition-colors"
          title="Sincronizar"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => {
            setReplyTo(null);
            setView('compose');
          }}
          className="text-gray-400 hover:text-white transition-colors"
          title="Nuevo correo"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => setView('settings')}
          className="text-gray-400 hover:text-white transition-colors"
          title="Configuracion"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message list */}
        <div
          className={`${
            selectedMessage ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 border-r border-gray-700 overflow-y-auto`}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader size={20} className="animate-spin text-accent-blue" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState icon={Inbox} text="Sin correos" />
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`text-left px-3 py-2.5 border-b border-gray-700/50 transition-colors ${
                  selectedMessage?.id === msg.id
                    ? 'bg-dark-100'
                    : 'hover:bg-dark-100/50'
                } ${!msg.read ? 'bg-dark-200/50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs truncate flex-1 ${!msg.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                    {msg.from.name || msg.from.email}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {new Date(msg.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className={`text-xs truncate ${!msg.read ? 'text-gray-200' : 'text-gray-400'}`}>
                  {msg.subject}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <CategoryBadge category={msg.category} />
                  {msg.starred && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Message detail or empty state */}
        <div className={`${selectedMessage ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedMessage ? (
            <MessageDetail
              message={selectedMessage}
              onBack={() => setSelectedMessage(null)}
              onReply={() => {
                setReplyTo(selectedMessage);
                setView('compose');
              }}
              onArchive={handleArchive}
            />
          ) : (
            <EmptyState icon={Mail} text="Selecciona un correo" />
          )}
        </div>
      </div>
    </div>
  );
}
