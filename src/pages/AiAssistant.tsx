import { useState, useEffect, useRef } from "react";
import {
  Send,
  User,
  History,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
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

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Save sessions to localStorage
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
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      type: "text",
      text,
    };

    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
      currentSessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: currentSessionId,
        title: text.slice(0, 35) + (text.length > 35 ? "…" : ""),
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
            title: isFirstUserMsg ? text.slice(0, 35) + (text.length > 35 ? "…" : "") : s.title,
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
      .catch(() => setError("SCION AI assistant service could not be reached."))
      .finally(() => setSending(false));
  };

  return (
    <div className="flex h-full flex-col relative bg-[--color-surface-0]">
      {/* TOP BAR HEADER */}
      <div className="flex items-center justify-between border-b border-[--color-border] bg-[--color-surface-0] pr-3 sm:pr-6">
        <div className="flex-1 min-w-0">
          <TopBar
            title="KSRTC SCION"
            subtitle="Supply Chain Intelligence & Operational Copilot"
            showFilters={false}
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SCION Active
          </div>

          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-1] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            title="Start new conversation"
          >
            <Plus size={14} /> <span className="hidden sm:inline">New Chat</span>
          </button>

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-1] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            title="Recent Chats"
          >
            <History size={14} /> <span className="hidden sm:inline">History</span> ({sessions.length})
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
            <div className="inline-flex rounded-xl bg-[--color-surface-1] p-3 border border-[--color-border]">
              <img src="/scion-logo.png" alt="KSRTC SCION Logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[--color-ink-900] tracking-tight">
                KSRTC SCION
              </h2>
              <p className="text-xs text-[--color-ink-500] max-w-md mx-auto mt-1.5 leading-relaxed">
                Supply Chain Intelligence & Operational Copilot for Kerala State Road Transport Corporation. Ask questions, analyze inventory records, inspect purchase orders, and verify stock levels in real time.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[--color-border] bg-[--color-surface-1] px-3 py-1 text-[11px] text-[--color-ink-500]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Grounded with live database records</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto pb-4">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}

            {sending ? (
              <ScionLoader text="SCION is analyzing supply chain data…" />
            ) : null}

            {error ? (
              <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-600 dark:text-red-400 font-medium flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => send(messages[messages.length - 1]?.text || "")}
                  className="underline font-bold hover:opacity-80 ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* INPUT FIELD */}
      <div className="border-t border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask KSRTC SCION anything about inventory, purchase orders, suppliers, or forecasts..."
            className="flex-1 rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3.5 py-2.5 text-xs sm:text-sm text-[--color-ink-900] placeholder-[--color-ink-400] focus:border-slate-800 dark:focus:border-slate-300 focus:outline-hidden transition-colors"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Send size={13} /> <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* RECENT CHATS DRAWER */}
      {showHistoryDrawer ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setShowHistoryDrawer(false)}
        >
          <div
            className="h-full w-full max-w-sm overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] text-[--color-ink-900] p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
              <div className="flex items-center gap-2">
                <History className="text-[--color-ink-700]" size={16} />
                <h2 className="text-sm font-semibold text-[--color-ink-900]">Recent Conversations</h2>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="rounded-md p-1 text-[--color-ink-500] hover:bg-[--color-surface-1] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2 text-xs font-medium hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
            >
              <Plus size={14} /> Start New Conversation
            </button>

            <div className="space-y-1.5 pt-2">
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
                    className={`group flex items-center justify-between rounded-lg p-2.5 text-xs transition-colors cursor-pointer border ${
                      s.id === activeSessionId
                        ? "border-[--color-border-strong] bg-[--color-surface-2] text-[--color-ink-900] font-medium"
                        : "border-transparent text-[--color-ink-700] hover:bg-[--color-surface-1]"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="text-[10px] text-[--color-ink-400] mt-0.5">{s.timestamp}</p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      title="Delete conversation"
                      className="text-[--color-ink-400] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 ? (
              <div className="pt-4 border-t border-[--color-border]">
                <button
                  onClick={clearAllHistory}
                  className="w-full text-center text-xs font-medium text-red-500 hover:underline py-1 cursor-pointer"
                >
                  Clear All History
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MINIMAL CHAT BUBBLE                              */
/* -------------------------------------------------------------------------- */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5 group py-1">
        <div className="max-w-xl rounded-2xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2.5 text-xs sm:text-sm shadow-xs font-normal">
          <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="rounded-full bg-[--color-surface-2] p-1.5 h-7 w-7 flex items-center justify-center text-[--color-ink-600] shrink-0 border border-[--color-border] mt-0.5">
          <User size={13} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group py-2 text-xs sm:text-sm text-[--color-ink-900]">
      <div className="h-7 w-7 rounded-lg bg-[--color-surface-1] border border-[--color-border] flex items-center justify-center p-1 shrink-0 mt-0.5">
        <img src="/scion-logo.png" alt="SCION" className="h-4.5 w-4.5 object-contain" />
      </div>

      <div className="flex-1 space-y-2 max-w-3xl overflow-hidden text-[--color-ink-900]">
        {/* RICH FORMATTED MARKDOWN CONTENT */}
        <FormattedContent text={message.text} />

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
          <p className="mt-2 text-xs text-[--color-ink-500] font-medium">
            {(message.payload as ForecastResult).modelName} · MAPE {(message.payload as ForecastResult).mape}%
          </p>
        ) : null}

        {/* SUBTLE HOVER ACTIONS */}
        <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[--color-ink-400]">
          <CopyButton text={message.text} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          COPY TO CLIPBOARD BUTTON                          */
/* -------------------------------------------------------------------------- */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded bg-[--color-surface-1] border border-[--color-border] px-2 py-0.5 text-[11px] font-medium text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
      title="Copy message"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                       FORMATTED MARKDOWN PARSER                            */
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

function FormattedContent({ text }: { text: string }) {
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
              ? "list-disc list-outside space-y-1 my-2 pl-5 text-[--color-ink-900]"
              : "list-decimal list-outside space-y-1 my-2 pl-5 text-[--color-ink-900]"
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

  const parseInline = (str: string): React.ReactNode[] => {
    const cleaned = cleanMathText(str);
    const boldParts = cleaned.split(/(\*\*.*?\*\*)/g);

    return boldParts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={index} className="font-semibold text-[--color-ink-900]">
            {inner}
          </strong>
        );
      }

      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((cPart, cIndex) => {
        if (cPart.startsWith("`") && cPart.endsWith("`") && cPart.length > 2) {
          const cInner = cPart.slice(1, -1);
          return (
            <code
              key={`${index}-${cIndex}`}
              className="rounded bg-[--color-surface-2] border border-[--color-border] px-1.5 py-0.5 font-mono text-[11px] text-[--color-ink-900] font-medium"
            >
              {cInner}
            </code>
          );
        }
        return cPart;
      });
    });
  };

  let orderedItemCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      orderedItemCounter = 0;
      if (inCodeBlock) {
        flushList();
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="my-2.5 rounded-lg border border-zinc-800 bg-zinc-900 p-3.5 text-xs font-mono text-zinc-100 overflow-x-auto"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings (###, ##, #)
    if (trimmed.startsWith("### ")) {
      flushList();
      orderedItemCounter = 0;
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-xs sm:text-sm font-semibold text-[--color-ink-900] mt-3.5 mb-1.5"
        >
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      orderedItemCounter = 0;
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-sm sm:text-base font-semibold text-[--color-ink-900] mt-4 mb-2 border-b border-[--color-border] pb-1"
        >
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      orderedItemCounter = 0;
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-base sm:text-lg font-bold text-[--color-ink-900] mt-5 mb-2">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      orderedItemCounter = 0;
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-3 border-t border-[--color-border]" />
      );
      continue;
    }

    // Unordered lists (*, -, •)
    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.*)/);
    if (bulletMatch) {
      const itemContent = parseInline(bulletMatch[1]);
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
      continue;
    }

    // Ordered lists / numbered points (1., 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushList();
      orderedItemCounter += 1;
      const title = numMatch[2];
      elements.push(
        <div
          key={`num-heading-${elements.length}`}
          className="mt-2.5 mb-1 flex items-start gap-2 text-xs sm:text-sm text-[--color-ink-900]"
        >
          <span className="shrink-0 flex items-center justify-center h-4.5 w-4.5 rounded bg-[--color-surface-2] border border-[--color-border] text-[10px] font-semibold text-[--color-ink-700] mt-0.5">
            {orderedItemCounter}
          </span>
          <div className="leading-relaxed">
            {parseInline(title)}
          </div>
        </div>
      );
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Regular paragraphs
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="mb-2 leading-relaxed text-[--color-ink-900]">
        {parseInline(trimmed)}
      </p>
    );
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

/* -------------------------------------------------------------------------- */
/*                                DATA TABLES                                 */
/* -------------------------------------------------------------------------- */

function ProcurementTable({ result }: { result: ProcurementResult }) {
  return (
    <div className="mt-3 rounded-lg border border-[--color-border] overflow-hidden bg-[--color-surface-0]">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[340px]">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[11px] text-[--color-ink-500]">
              <th className="py-2 px-3 font-semibold">Part</th>
              <th className="py-2 px-3 font-semibold">Qty</th>
              <th className="py-2 px-3 font-semibold">Total Cost</th>
              <th className="py-2 px-3 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((i) => (
              <tr key={i.part} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                <td className="py-2 px-3 font-medium text-[--color-ink-900]">{i.part}</td>
                <td className="py-2 px-3 tabular text-[--color-ink-700]">{i.quantity}</td>
                <td className="py-2 px-3 tabular font-medium text-[--color-ink-900]">
                  ₹{i.total_cost.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3">
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
    <div className="mt-3 rounded-lg border border-[--color-border] overflow-hidden bg-[--color-surface-0]">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[11px] text-[--color-ink-500]">
              <th className="py-2 px-3 font-semibold">Part</th>
              <th className="py-2 px-3 font-semibold">Stock</th>
              <th className="py-2 px-3 font-semibold">Supply Days</th>
              <th className="py-2 px-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                <td className="py-2 px-3 font-medium text-[--color-ink-900]">{i.part}</td>
                <td className="py-2 px-3 tabular font-semibold text-[--color-ink-900]">{i.currentStock}</td>
                <td className="py-2 px-3 tabular text-[--color-ink-700]">{i.daysOfSupply}d</td>
                <td className="py-2 px-3">
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
    <div className="mt-3 rounded-lg border border-[--color-border] overflow-hidden bg-[--color-surface-0]">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[11px] text-[--color-ink-500]">
              <th className="py-2 px-3 font-semibold">PO #</th>
              <th className="py-2 px-3 font-semibold">Supplier</th>
              <th className="py-2 px-3 font-semibold">Total</th>
              <th className="py-2 px-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <tr key={po.poNumber} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                <td className="py-2 px-3 font-medium text-[--color-ink-900]">{po.poNumber}</td>
                <td className="py-2 px-3 text-[--color-ink-700]">{po.supplier}</td>
                <td className="py-2 px-3 tabular font-medium text-[--color-ink-900]">
                  ₹{po.total.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3">
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
    <div className="mt-3 rounded-lg border border-[--color-border] overflow-hidden bg-[--color-surface-0]">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[280px]">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[11px] text-[--color-ink-500]">
              <th className="py-2 px-3 font-semibold">Date</th>
              <th className="py-2 px-3 font-semibold">Supplier</th>
              <th className="py-2 px-3 font-semibold">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={i} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                <td className="py-2 px-3 text-[--color-ink-700]">{p.date}</td>
                <td className="py-2 px-3 text-[--color-ink-700]">{p.supplier}</td>
                <td className="py-2 px-3 tabular font-medium text-[--color-ink-900]">₹{p.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
