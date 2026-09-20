import { useState, useEffect } from "react";
import { Send, Sparkles, Bot, User, History, Plus, Trash2, MessageSquare, X } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { StatusBadge } from "../components/ui/StatusBadge";
import { sendChatMessage } from "../services/chatApi";
import type {
  ChatMessage, ForecastResult, ProcurementResult, InventoryItem, PurchaseOrder, PriceRecord,
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

  // Save sessions to localStorage
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const startNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
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
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", type: "text", text };

    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
      currentSessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: currentSessionId,
        title: text.slice(0, 32) + (text.length > 32 ? "…" : ""),
        timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
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
          const next = prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [...s.messages, reply] } : s));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => setError("Gemini AI assistant service could not be reached."))
      .finally(() => setSending(false));
  };

  return (
    <div className="flex h-full flex-col relative">
      <div className="flex items-center justify-between border-b border-[--color-border] bg-[--color-surface-0] pr-6">
        <div className="flex-1">
          <TopBar
            title="AI Assistant"
            subtitle="Ask anything about the supply chain — Grounded conversational copilot"
            showFilters={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2]"
          >
            <Plus size={14} /> New Chat
          </button>

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 rounded bg-[--color-forecast-500] px-3 py-1.5 text-xs font-medium text-white hover:bg-[--color-forecast-700]"
          >
            <History size={14} /> Recent Chats ({sessions.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-[--color-forecast-500]/10 p-4 mb-4 text-[--color-forecast-600]">
              <Sparkles size={32} />
            </div>
            <h2 className="text-lg font-bold text-[--color-ink-900]">KSRTC Supply Chain Copilot</h2>
            <p className="mt-1 text-sm text-[--color-ink-500] max-w-md">
              Ask any question about demand forecasts, PuLP procurement budgets, inventory levels, or purchase order statuses.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-[--color-forecast-600] font-medium bg-[--color-forecast-500]/10 rounded p-3 w-fit">
                <Sparkles size={14} className="animate-spin" /> Gemini AI is analyzing supply chain data and generating response…
              </div>
            ) : null}
            {error ? <p className="text-xs text-[--color-critical-500]">{error}</p> : null}
          </div>
        )}
      </div>

      {/* INPUT FIELD */}
      <div className="border-t border-[--color-border] bg-[--color-surface-0] p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask anything about your supply chain..."
            className="flex-1 rounded border border-[--color-border] bg-[--color-surface-0] px-4 py-2.5 text-sm text-[--color-ink-900] placeholder-[--color-ink-400] focus:border-[--color-forecast-500] focus:outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending}
            className="flex items-center gap-1.5 rounded bg-[--color-forecast-500] px-4 py-2.5 text-sm font-medium text-white hover:bg-[--color-forecast-700] disabled:opacity-50"
          >
            <Send size={16} /> Send
          </button>
        </div>
      </div>

      {/* RECENT CHATS DRAWER */}
      {showHistoryDrawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setShowHistoryDrawer(false)}>
          <div
            className="h-full w-full max-w-sm overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
              <div className="flex items-center gap-2">
                <History className="text-[--color-forecast-600]" size={18} />
                <h2 className="text-base font-bold text-[--color-ink-900]">Recent Chats & History</h2>
              </div>
              <button onClick={() => setShowHistoryDrawer(false)} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1]">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-[--color-forecast-500] py-2 text-xs font-medium text-white hover:bg-[--color-forecast-700]"
              >
                <Plus size={14} /> Start New Conversation
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase font-semibold text-[--color-ink-400] tracking-wider">Past Conversations</p>
              {sessions.length === 0 ? (
                <p className="text-xs text-[--color-ink-500] py-6 text-center">No recent chat history found.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setShowHistoryDrawer(false);
                    }}
                    className={`group cursor-pointer rounded-md border p-3 text-xs transition-colors flex items-start justify-between ${
                      s.id === activeSessionId
                        ? "border-[--color-forecast-500] bg-[--color-forecast-500]/10"
                        : "border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-1]"
                    }`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <MessageSquare size={16} className="text-[--color-forecast-600] mt-0.5" />
                      <div>
                        <p className="font-semibold text-[--color-ink-900] line-clamp-1">{s.title}</p>
                        <p className="text-[10px] text-[--color-ink-400] mt-0.5">{s.timestamp} · {s.messages.length} messages</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      title="Delete conversation"
                      className="text-[--color-ink-400] hover:text-[--color-critical-500] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 ? (
              <div className="pt-4 border-t border-[--color-border]">
                <button
                  onClick={clearAllHistory}
                  className="w-full text-center text-xs text-[--color-critical-500] hover:underline"
                >
                  Clear All Recent Chat History
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="rounded-full bg-[--color-forecast-500]/20 p-2 h-fit text-[--color-forecast-600]">
          <Bot size={16} />
        </div>
      ) : null}

      <div
        className={`max-w-xl rounded-md border p-4 text-sm ${
          isUser
            ? "border-[--color-forecast-500]/30 bg-[--color-forecast-500]/10 text-[--color-ink-900]"
            : "border-[--color-border] bg-[--color-surface-0] text-[--color-ink-900]"
        }`}
      >
        <p className="leading-relaxed">{message.text}</p>
        
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
          <p className="mt-2 text-xs text-[--color-ink-500] font-semibold">
            {(message.payload as ForecastResult).modelName} · MAPE {(message.payload as ForecastResult).mape}%
          </p>
        ) : null}
      </div>

      {isUser ? (
        <div className="rounded-full bg-[--color-surface-2] p-2 h-fit text-[--color-ink-700]">
          <User size={16} />
        </div>
      ) : null}
    </div>
  );
}

function ProcurementTable({ result }: { result: ProcurementResult }) {
  return (
    <div className="mt-3 rounded border border-[--color-border] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[--color-ink-500]">
            <th className="py-1.5 px-2">Part</th>
            <th className="py-1.5 px-2">Qty</th>
            <th className="py-1.5 px-2">Total Cost</th>
            <th className="py-1.5 px-2">Priority</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((i) => (
            <tr key={i.part} className="border-b border-[--color-border] last:border-0">
              <td className="py-1.5 px-2 font-medium">{i.part}</td>
              <td className="py-1.5 px-2 tabular">{i.quantity}</td>
              <td className="py-1.5 px-2 tabular">₹{i.total_cost.toLocaleString("en-IN")}</td>
              <td className="py-1.5 px-2"><StatusBadge label={i.priority} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <div className="mt-3 rounded border border-[--color-border] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[--color-ink-500]">
            <th className="py-1.5 px-2">Part</th>
            <th className="py-1.5 px-2">Stock</th>
            <th className="py-1.5 px-2">Supply Days</th>
            <th className="py-1.5 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-[--color-border] last:border-0">
              <td className="py-1.5 px-2 font-medium">{i.part}</td>
              <td className="py-1.5 px-2 tabular font-semibold">{i.currentStock}</td>
              <td className="py-1.5 px-2 tabular">{i.daysOfSupply}d</td>
              <td className="py-1.5 px-2"><StatusBadge label={i.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoTable({ orders }: { orders: PurchaseOrder[] }) {
  return (
    <div className="mt-3 rounded border border-[--color-border] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[--color-ink-500]">
            <th className="py-1.5 px-2">PO #</th>
            <th className="py-1.5 px-2">Supplier</th>
            <th className="py-1.5 px-2">Total</th>
            <th className="py-1.5 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((po) => (
            <tr key={po.poNumber} className="border-b border-[--color-border] last:border-0">
              <td className="py-1.5 px-2 font-medium">{po.poNumber}</td>
              <td className="py-1.5 px-2 text-[--color-ink-500]">{po.supplier}</td>
              <td className="py-1.5 px-2 tabular">₹{po.total.toLocaleString("en-IN")}</td>
              <td className="py-1.5 px-2"><StatusBadge label={po.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceTable({ prices }: { prices: PriceRecord[] }) {
  return (
    <div className="mt-3 rounded border border-[--color-border] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[--color-ink-500]">
            <th className="py-1.5 px-2">Date</th>
            <th className="py-1.5 px-2">Supplier</th>
            <th className="py-1.5 px-2">Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p, i) => (
            <tr key={i} className="border-b border-[--color-border] last:border-0">
              <td className="py-1.5 px-2">{p.date}</td>
              <td className="py-1.5 px-2 text-[--color-ink-500]">{p.supplier}</td>
              <td className="py-1.5 px-2 tabular font-semibold">₹{p.unitPrice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
