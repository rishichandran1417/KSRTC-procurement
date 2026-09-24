import { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  History,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
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
        title: text.slice(0, 32) + (text.length > 32 ? "…" : ""),
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
            title: isFirstUserMsg ? text.slice(0, 32) + (text.length > 32 ? "…" : "") : s.title,
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
    <div className="flex h-full flex-col relative bg-white dark:bg-[#212121]">
      {/* CHATGPT-STYLE TOP HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-[#212121] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white p-1">
            <img src="/scion-logo.png" alt="SCION" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">KSRTC SCION</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title="Start new chat"
          >
            <Plus size={14} /> <span>New Chat</span>
          </button>

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title="Chat history"
          >
            <History size={14} /> <span>History</span>
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* CHATGPT CLEAN EMPTY HERO */
          <div className="flex h-full flex-col items-center justify-center px-4 text-center pb-24">
            <div className="h-12 w-12 rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-2xs">
              <img src="/scion-logo.png" alt="SCION" className="h-6 w-6 object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-zinc-100 tracking-tight">
              What can I help with today?
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 max-w-md">
              Ask any question regarding KSRTC bus spare parts, inventory levels, purchase orders, or depot supply chain data.
            </p>
          </div>
        ) : (
          /* CHATGPT CONVERSATION COLUMN */
          <div className="max-w-3xl mx-auto w-full px-4 pt-6 pb-8 space-y-6">
            {messages.map((m) => (
              <ChatGptMessageRow key={m.id} message={m} />
            ))}

            {sending && (
              <div className="flex gap-4">
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <img src="/scion-logo.png" alt="SCION" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
                </div>
                <div className="flex-1">
                  <ScionLoader text="Thinking…" />
                </div>
              </div>
            )}

            {error && (
              <div className="max-w-xl mx-auto rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
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

      {/* CHATGPT BOTTOM INPUT CONTAINER */}
      <div className="bg-white dark:bg-[#212121] px-4 pb-4 pt-1">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-slate-200 dark:border-zinc-700 bg-[#f4f4f4] dark:bg-[#2f2f2f] p-2 pl-5 flex items-center gap-2 shadow-2xs focus-within:border-slate-400 dark:focus-within:border-zinc-500 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Message KSRTC SCION…"
              className="flex-1 bg-transparent text-[15px] text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-400 outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              className="h-8 w-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0 disabled:opacity-20 disabled:bg-slate-300 dark:disabled:bg-zinc-600 transition-all cursor-pointer shadow-2xs"
              title="Send message"
            >
              <ArrowUp size={16} />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 text-center mt-2">
            KSRTC SCION can make mistakes. Verify important supply chain & inventory data.
          </p>
        </div>
      </div>

      {/* CHATGPT HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setShowHistoryDrawer(false)}
        >
          <div
            className="h-full w-full max-w-xs border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 p-5 space-y-4 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold">Chats</h2>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => {
                startNewChat();
                setShowHistoryDrawer(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 text-xs font-medium hover:opacity-90 shadow-2xs transition-opacity cursor-pointer"
            >
              <Plus size={14} /> New Chat
            </button>

            <div className="space-y-1 pt-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
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
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                      s.id === activeSessionId
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <p className="truncate flex-1 pr-2">{s.title}</p>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      title="Delete"
                      className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
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
/*                         CHATGPT MESSAGE ROW                                */
/* -------------------------------------------------------------------------- */

function ChatGptMessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="rounded-3xl bg-[#f4f4f4] dark:bg-[#2f2f2f] text-slate-900 dark:text-zinc-100 px-5 py-3 text-[15px] leading-6 max-w-[80%] font-normal whitespace-pre-wrap shadow-2xs">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* ASSISTANT AVATAR */}
      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
        <img src="/scion-logo.png" alt="SCION" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
      </div>

      {/* ASSISTANT CONTENT - DIRECTLY ON PAGE LIKE CHATGPT */}
      <div className="flex-1 min-w-0 text-[15px] leading-7 text-slate-800 dark:text-zinc-200">
        <ChatGptMarkdown text={message.text} />

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

        {/* CHATGPT ACTION ROW */}
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
      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      title="Copy message"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                      CHATGPT-STYLE MARKDOWN PARSER                         */
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

function ChatGptMarkdown({ text }: { text: string }) {
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
              ? "list-disc pl-6 space-y-1.5 my-3 text-slate-800 dark:text-zinc-200"
              : "list-decimal pl-6 space-y-1.5 my-3 text-slate-800 dark:text-zinc-200"
          }
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-7">
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
        return (
          <strong key={index} className="font-semibold text-slate-900 dark:text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((cPart, cIndex) => {
        if (cPart.startsWith("`") && cPart.endsWith("`") && cPart.length > 2) {
          return (
            <code
              key={`${index}-${cIndex}`}
              className="rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:text-zinc-200 font-medium"
            >
              {cPart.slice(1, -1)}
            </code>
          );
        }
        return cPart;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
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
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-base font-semibold text-slate-900 dark:text-zinc-100 mt-5 mb-2">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-bold text-slate-900 dark:text-zinc-100 mt-6 mb-2">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-6 mb-3">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-t border-slate-200 dark:border-zinc-800" />);
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

    // Ordered lists (1., 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const itemContent = parseInline(numMatch[2]);
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
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
      <p key={`p-${elements.length}`} className="mb-3.5 leading-7 text-slate-800 dark:text-zinc-200">
        {parseInline(trimmed)}
      </p>
    );
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
