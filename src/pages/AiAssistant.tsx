import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  SendHorizontal,
  History,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
  RotateCcw,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { useSidebar } from "../state/SidebarContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ScionLoader } from "../components/ui/ScionLoader";
import { sendChatMessage } from "../services/chatApi";
import type {
  ChatMessage,
  ForecastResult,
  ProcurementResult,
  InventoryItem,
  PurchaseOrder,
  PriceRecord,
} from "../types";

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = "ksrtc_chat_sessions_v1";

export default function AiAssistant() {
  const { toggleMobile } = useSidebar();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  };

  const startNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      timestamp: new Date().toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      messages: [],
    };
    saveSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    setError(null);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSessions = sessions.filter((s) => s.id !== sessionId);
    saveSessions(nextSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(nextSessions[0]?.id || null);
    }
  };

  const clearAllHistory = () => {
    saveSessions([]);
    setActiveSessionId(null);
    setShowHistoryDrawer(false);
  };

  const send = (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      type: "text",
      text: text.trim(),
    };

    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
      currentSessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: currentSessionId,
        title: text.slice(0, 36) + (text.length > 36 ? "…" : ""),
        timestamp: new Date().toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        messages: [userMsg],
      };
      updatedSessions = [newSession, ...sessions];
      setActiveSessionId(currentSessionId);
    } else {
      updatedSessions = sessions.map((s) => {
        if (s.id === currentSessionId) {
          const isFirstUserMsg = s.messages.length === 0;
          return {
            ...s,
            title: isFirstUserMsg ? text.slice(0, 36) + (text.length > 36 ? "…" : "") : s.title,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      });
    }

    saveSessions(updatedSessions);
    setInput("");
    setSending(true);
    setError(null);

    sendChatMessage(text)
      .then((reply) => {
        setSessions((prev) => {
          const next = prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, reply] }
              : s
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => setError("SCION could not reach the server. Please check your network and Gemini API key."))
      .finally(() => setSending(false));
  };

  return (
    <div className="flex h-full flex-col relative bg-[--color-surface-1]">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-[--color-border] bg-[--color-surface-0] px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMobile}
            className="rounded-md p-1.5 text-[--color-ink-700] hover:bg-[--color-surface-2] active:scale-95 transition-transform lg:hidden shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--color-surface-1] border border-[--color-border] shadow-2xs p-1.5">
            <img src="/scion-logo.png" alt="SCION" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[--color-ink-900]">KSRTC SCION</h1>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Operational
              </span>
            </div>
            <p className="text-[11px] text-[--color-ink-500] font-normal hidden sm:block">
              Fleet Supply Chain & Procurement Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="inline-flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-800] transition-colors cursor-pointer shadow-2xs"
            title="Start new conversation"
          >
            <Plus size={13} className="text-[--color-ink-600]" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-800] transition-colors cursor-pointer shadow-2xs"
            title="View conversation history"
          >
            <History size={13} className="text-[--color-ink-600]" />
            <span className="hidden sm:inline">History</span>
            {sessions.length > 0 && (
              <span className="ml-0.5 rounded-full bg-[--color-surface-2] px-1.5 py-0.2 text-[10px] font-bold text-[--color-ink-700]">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* CLEAN PROFESSIONAL HUMAN-DESIGNED WORKSPACE */
          <div className="flex h-full flex-col items-center justify-center px-4 text-center pb-12 max-w-xl mx-auto">
            <div className="h-12 w-12 rounded-xl border border-[--color-border] bg-[--color-surface-0] flex items-center justify-center mb-3 shadow-2xs p-2">
              <img src="/scion-logo.png" alt="KSRTC SCION" className="h-8 w-8 object-contain" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[--color-ink-900]">
              KSRTC Fleet & Supply Chain Assistant
            </h2>
            <p className="text-xs text-[--color-ink-500] mt-1.5 max-w-md leading-relaxed">
              Directly query Central Depot inventory, evaluate supplier pricing benchmarks, review pending purchase orders, or run procurement analysis.
            </p>
          </div>
        ) : (
          /* CONVERSATION COLUMN */
          <div className="max-w-3xl mx-auto w-full px-4 pt-6 pb-8 space-y-7">
            {messages.map((m) => (
              <ChatGptMessageRow key={m.id} message={m} onNavigate={(path) => navigate(path)} />
            ))}

            {sending && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="h-8 w-8 rounded-lg bg-[--color-surface-1] border border-[--color-border] flex items-center justify-center shrink-0 shadow-2xs p-1">
                  <img src="/scion-logo.png" alt="SCION" className="h-5 w-5 object-contain" />
                </div>
                <div className="flex-1 pt-1">
                  <ScionLoader text="Formulating KSRTC fleet intelligence response…" />
                </div>
              </div>
            )}

            {error && (
              <div className="max-w-xl mx-auto rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between shadow-2xs">
                <span>{error}</span>
                <button
                  onClick={() => send(messages[messages.length - 1]?.text || "")}
                  className="flex items-center gap-1 font-semibold underline hover:opacity-80 ml-3 cursor-pointer"
                >
                  <RotateCcw size={12} /> Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* BOTTOM INPUT CONTAINER */}
      <div className="bg-[--color-surface-0] border-t border-[--color-border] px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-lg border border-[--color-border] bg-[--color-surface-1] p-1.5 pl-3.5 flex items-center gap-2 shadow-2xs focus-within:border-blue-500 focus-within:bg-[--color-surface-0] focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Search spare parts, vendor rates, stock levels, or purchase orders…"
              className="flex-1 bg-transparent text-xs sm:text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send query"
            >
              <SendHorizontal size={14} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[--color-ink-400] px-1 mt-1.5">
            <span>KSRTC Central Stores & Workshop Intelligence</span>
            <span className="hidden sm:inline">Press Enter ↵ to send</span>
          </div>
        </div>
      </div>

      {/* CHAT HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={() => setShowHistoryDrawer(false)}
        >
          <div
            className="h-full w-full max-w-xs border-l border-[--color-border] bg-[--color-surface-0] text-[--color-ink-900] p-5 space-y-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
              <h2 className="text-sm font-bold text-[--color-ink-900]">Conversation History</h2>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="rounded-md p-1.5 text-[--color-ink-400] hover:bg-[--color-surface-2] hover:text-[--color-ink-700] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => {
                startNewChat();
                setShowHistoryDrawer(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Conversation
            </button>

            <div className="space-y-1 pt-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-[--color-ink-400] text-center py-8">
                  No conversation history yet.
                </p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setShowHistoryDrawer(false);
                    }}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
                      s.id === activeSessionId
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800/50"
                        : "text-[--color-ink-600] hover:bg-[--color-surface-1] hover:text-[--color-ink-900]"
                    }`}
                  >
                    <p className="truncate flex-1 pr-2">{s.title}</p>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      title="Delete conversation"
                      className="text-[--color-ink-400] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 && (
              <div className="pt-4 border-t border-[--color-border]">
                <button
                  onClick={clearAllHistory}
                  className="w-full text-center text-xs font-medium text-rose-500 hover:underline py-1 cursor-pointer"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         CHAT MESSAGE ROW                                   */
/* -------------------------------------------------------------------------- */

function ChatGptMessageRow({
  message,
  onNavigate,
}: {
  message: ChatMessage;
  onNavigate: (path: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="rounded-xl rounded-tr-xs bg-blue-600 text-white px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed max-w-[85%] sm:max-w-[75%] font-normal shadow-2xs">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4 items-start group">
      {/* ASSISTANT AVATAR */}
      <div className="h-8 w-8 rounded-lg bg-[--color-surface-1] border border-[--color-border] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs p-1">
        <img src="/scion-logo.png" alt="SCION" className="h-5 w-5 object-contain" />
      </div>

      {/* ASSISTANT CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-[--color-ink-900]">KSRTC SCION</span>
          <span className="text-[10px] font-medium text-[--color-ink-500] bg-[--color-surface-1] border border-[--color-border] px-1.5 py-0.5 rounded">
            Fleet Intelligence
          </span>
        </div>

        <div className="text-xs sm:text-[14px] leading-relaxed text-slate-800 dark:text-zinc-200">
          <RichMarkdown text={message.text} onNavigate={onNavigate} />

          {/* ATTACHED DATA TABLES IF AVAILABLE */}
          {message.type === "procurement" && message.payload ? (
            <ProcurementTable result={message.payload as ProcurementResult} />
          ) : null}
          {message.type === "inventory" && message.payload ? (
            <InventoryTable items={message.payload as InventoryItem[]} />
          ) : null}
          {message.type === "purchase_orders" && message.payload ? (
            <PoTable orders={message.payload as PurchaseOrder[]} />
          ) : null}
          {message.type === "price_analysis" && message.payload ? (
            <PriceTable prices={message.payload as PriceRecord[]} />
          ) : null}
          {message.type === "forecast" && message.payload ? (
            <p className="mt-2 text-xs text-slate-500 font-medium">
              {(message.payload as ForecastResult).modelName} · MAPE {(message.payload as ForecastResult).mape}%
            </p>
          ) : null}
        </div>

        {/* ACTION ROW */}
        <div className="flex items-center gap-2 pt-2 text-slate-400 dark:text-zinc-500">
          <CopyMessageButton text={message.text} />
        </div>
      </div>
    </div>
  );
}

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 text-[11px] transition-colors cursor-pointer"
      title="Copy message"
    >
      {copied ? (
        <>
          <Check size={13} className="text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*             ADVANCED MARKDOWN PARSER WITH TABLE & ACTION BUTTONS           */
/* -------------------------------------------------------------------------- */

function cleanMathText(str: string): string {
  return str
    .replace(/\\text\{(\w+)\}/g, "$1")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\approx/g, "≈")
    .replace(/\\sqrt\{(.*?)\}/g, "√($1)")
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "($1 / $2)")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "");
}

function renderInline(str: string, onNavigate: (path: string) => void): React.ReactNode[] {
  const cleaned = cleanMathText(str);

  // Parse markdown links [text](url)
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderBasicInline(cleaned.substring(lastIndex, match.index)));
    }
    const linkText = match[1];
    const linkUrl = match[2];

    if (linkUrl.startsWith("/")) {
      // Internal navigation button
      parts.push(
        <button
          key={`link-${match.index}`}
          onClick={() => onNavigate(linkUrl)}
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-1 py-0.5 rounded transition-colors cursor-pointer"
        >
          <span>{linkText}</span>
          <ArrowUpRight size={13} />
        </button>
      );
    } else {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
        >
          <span>{linkText}</span>
          <ExternalLink size={12} />
        </a>
      );
    }
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    parts.push(...renderBasicInline(cleaned.substring(lastIndex)));
  }

  return parts;
}

function renderBasicInline(str: string): React.ReactNode[] {
  // Parse bold **text**
  const boldParts = str.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-slate-900 dark:text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Parse inline code `code`
    const codeParts = part.split(/(`.*?`)/g);
    return codeParts.map((cPart, cIndex) => {
      if (cPart.startsWith("`") && cPart.endsWith("`") && cPart.length > 2) {
        return (
          <code
            key={`${index}-${cIndex}`}
            className="rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold"
          >
            {cPart.slice(1, -1)}
          </code>
        );
      }
      return cPart;
    });
  });
}

function renderTableCell(cellText: string, onNavigate: (path: string) => void): React.ReactNode {
  const trimmed = cellText.trim();

  // Status badges
  if (/critical/i.test(trimmed)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        {trimmed}
      </span>
    );
  }
  if (/warning/i.test(trimmed)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        {trimmed}
      </span>
    );
  }
  if (/healthy/i.test(trimmed)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        {trimmed}
      </span>
    );
  }

  return renderInline(trimmed, onNavigate);
}

function RichMarkdown({
  text,
  onNavigate,
}: {
  text: string;
  onNavigate: (path: string) => void;
}) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type;
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={
            currentList.type === "ul"
              ? "list-disc pl-5 space-y-1.5 my-3 text-slate-800 dark:text-zinc-200"
              : "list-decimal pl-5 space-y-1.5 my-3 text-slate-800 dark:text-zinc-200"
          }
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushList();
        elements.push(
          <div key={`code-${elements.length}`} className="my-4 rounded-xl border border-zinc-800 overflow-hidden shadow-xs">
            <div className="bg-[#2f2f2f] text-zinc-400 px-4 py-2 text-xs font-mono flex items-center justify-between">
              <span>code</span>
            </div>
            <pre className="bg-black p-4 text-xs font-mono text-zinc-100 overflow-x-auto">
              <code>{codeBlockLines.join("\n")}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      i++;
      continue;
    }

    // Markdown Table Detection (checks if current line starts with `|` or contains `|`)
    if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
      flushList();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().includes("|", 1)) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse table
        const parseCells = (rowStr: string) => {
          const stripped = rowStr.replace(/^\|/, "").replace(/\|$/, "");
          return stripped.split("|").map((c) => c.trim());
        };

        const headerCells = parseCells(tableLines[0]);
        let dataStartIndex = 1;
        let alignments: Array<"left" | "center" | "right"> = [];

        // Check if second line is separator like `|---|---|`
        if (tableLines.length > 1 && /^\|?(\s*:?-+:?\s*\|?)+$/.test(tableLines[1])) {
          const sepCells = parseCells(tableLines[1]);
          alignments = sepCells.map((c) => {
            const tr = c.trim();
            if (tr.startsWith(":") && tr.endsWith(":")) return "center";
            if (tr.endsWith(":")) return "right";
            return "left";
          });
          dataStartIndex = 2;
        }

        const dataRows = tableLines.slice(dataStartIndex).map((r) => parseCells(r));

        elements.push(
          <div
            key={`table-${elements.length}`}
            className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/70 shadow-xs"
          >
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[380px]">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className={`py-2.5 px-3.5 font-bold text-slate-900 dark:text-zinc-100 ${
                        alignments[hIdx] === "center"
                          ? "text-center"
                          : alignments[hIdx] === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {renderInline(h, onNavigate)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2 px-3.5 align-middle ${
                          alignments[cIdx] === "center"
                            ? "text-center"
                            : alignments[cIdx] === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {renderTableCell(cell, onNavigate)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Action button highlight like `👉 [Button Text](/url)`
    const actionMatch = trimmed.match(/^👉\s*\[(.*?)\]\((.*?)\)/);
    if (actionMatch) {
      flushList();
      const actionText = actionMatch[1];
      const actionUrl = actionMatch[2];
      elements.push(
        <div key={`action-${elements.length}`} className="my-3.5">
          <button
            onClick={() => onNavigate(actionUrl)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer ring-2 ring-emerald-500/20"
          >
            <span>{actionText}</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      );
      i++;
      continue;
    }

    // Blockquotes & Callouts
    if (trimmed.startsWith("> ")) {
      flushList();
      const quoteContent = trimmed.slice(2).trim();
      const isUrgent = quoteContent.includes("🚨") || quoteContent.includes("URGENT");
      const isWarning = quoteContent.includes("⚠️") || quoteContent.includes("WARNING");

      elements.push(
        <div
          key={`quote-${elements.length}`}
          className={`my-3.5 rounded-xl border p-3.5 text-xs sm:text-[13px] leading-relaxed ${
            isUrgent
              ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 text-rose-900 dark:text-rose-200"
              : isWarning
              ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
              : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
          }`}
        >
          {renderInline(quoteContent, onNavigate)}
        </div>
      );
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith("#### ")) {
      flushList();
      elements.push(
        <h5
          key={`h5-${elements.length}`}
          className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mt-4 mb-2"
        >
          {renderInline(trimmed.slice(5), onNavigate)}
        </h5>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mt-5 mb-2"
        >
          {renderInline(trimmed.slice(4), onNavigate)}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 mt-6 mb-2.5"
        >
          {renderInline(trimmed.slice(3), onNavigate)}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 mt-6 mb-3"
        >
          {renderInline(trimmed.slice(2), onNavigate)}
        </h2>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-t border-slate-200 dark:border-zinc-800" />);
      i++;
      continue;
    }

    // Unordered lists (*, -, •)
    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.*)/);
    if (bulletMatch) {
      const itemContent = renderInline(bulletMatch[1], onNavigate);
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
      i++;
      continue;
    }

    // Ordered lists (1., 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const itemContent = renderInline(numMatch[2], onNavigate);
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
      i++;
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      flushList();
      i++;
      continue;
    }

    // Regular paragraphs
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="mb-3 leading-relaxed text-slate-800 dark:text-zinc-200">
        {renderInline(trimmed, onNavigate)}
      </p>
    );
    i++;
  }

  flushList();
  return <div>{elements}</div>;
}

/* -------------------------------------------------------------------------- */
/*                                DATA TABLES                                 */
/* -------------------------------------------------------------------------- */

function ProcurementTable({ result }: { result: ProcurementResult }) {
  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[340px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-left uppercase text-[11px] text-slate-500 dark:text-zinc-400">
              <th className="py-2.5 px-3.5 font-semibold">Part</th>
              <th className="py-2.5 px-3.5 font-semibold">Qty</th>
              <th className="py-2.5 px-3.5 font-semibold">Total Cost</th>
              <th className="py-2.5 px-3.5 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {result.items.map((i) => (
              <tr key={i.part} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-zinc-100">{i.part}</td>
                <td className="py-2.5 px-3.5 tabular text-slate-600 dark:text-zinc-300">{i.quantity}</td>
                <td className="py-2.5 px-3.5 tabular font-semibold text-slate-900 dark:text-zinc-100">
                  ₹{i.total_cost.toLocaleString("en-IN")}
                </td>
                <td className="py-2.5 px-3.5">
                  <StatusBadge label={i.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-left uppercase text-[11px] text-slate-500 dark:text-zinc-400">
              <th className="py-2.5 px-3.5 font-semibold">Part</th>
              <th className="py-2.5 px-3.5 font-semibold">Stock</th>
              <th className="py-2.5 px-3.5 font-semibold">Supply Days</th>
              <th className="py-2.5 px-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-zinc-100">{i.part}</td>
                <td className="py-2.5 px-3.5 tabular font-bold text-rose-600 dark:text-rose-400">{i.currentStock}</td>
                <td className="py-2.5 px-3.5 tabular text-slate-600 dark:text-zinc-300">{i.daysOfSupply}d</td>
                <td className="py-2.5 px-3.5">
                  <StatusBadge label={i.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoTable({ orders }: { orders: PurchaseOrder[] }) {
  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-left uppercase text-[11px] text-slate-500 dark:text-zinc-400">
              <th className="py-2.5 px-3.5 font-semibold">PO #</th>
              <th className="py-2.5 px-3.5 font-semibold">Supplier</th>
              <th className="py-2.5 px-3.5 font-semibold">Total</th>
              <th className="py-2.5 px-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {orders.map((po) => (
              <tr key={po.poNumber} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-zinc-100">{po.poNumber}</td>
                <td className="py-2.5 px-3.5 text-slate-600 dark:text-zinc-300">{po.supplier}</td>
                <td className="py-2.5 px-3.5 tabular font-semibold text-slate-900 dark:text-zinc-100">
                  ₹{po.total.toLocaleString("en-IN")}
                </td>
                <td className="py-2.5 px-3.5">
                  <StatusBadge label={po.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceTable({ prices }: { prices: PriceRecord[] }) {
  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[280px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-left uppercase text-[11px] text-slate-500 dark:text-zinc-400">
              <th className="py-2.5 px-3.5 font-semibold">Date</th>
              <th className="py-2.5 px-3.5 font-semibold">Supplier</th>
              <th className="py-2.5 px-3.5 font-semibold">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {prices.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                <td className="py-2.5 px-3.5 text-slate-600 dark:text-zinc-300">{p.date}</td>
                <td className="py-2.5 px-3.5 text-slate-600 dark:text-zinc-300">{p.supplier}</td>
                <td className="py-2.5 px-3.5 tabular font-semibold text-slate-900 dark:text-zinc-100">₹{p.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
