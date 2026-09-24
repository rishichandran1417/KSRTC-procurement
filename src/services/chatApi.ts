import { apiClient, ENDPOINTS } from "./apiClient";
import type { ChatMessage } from "../types";
import { getInventory } from "./inventoryApi";
import { getPurchaseOrders } from "./purchaseOrderApi";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

// In-memory cache for operational context so chat messages never block on remote DB roundtrips
let cachedContextData: { inventory: any[]; orders: any[]; timestamp: number } | null = null;
const CONTEXT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

async function getCachedContext(): Promise<{ inventory: any[]; orders: any[] }> {
  const now = Date.now();
  if (cachedContextData && now - cachedContextData.timestamp < CONTEXT_CACHE_TTL) {
    return cachedContextData;
  }

  // Fetch with a 1000ms max timeout so chat is NEVER delayed by slow or sleeping backend
  const fetchPromise = Promise.all([
    getInventory().catch(() => []),
    getPurchaseOrders().catch(() => []),
  ]).then(([inv, ord]) => {
    cachedContextData = { inventory: inv, orders: ord, timestamp: Date.now() };
    return cachedContextData;
  });

  const timeoutPromise = new Promise<{ inventory: any[]; orders: any[] }>((resolve) =>
    setTimeout(() => resolve(cachedContextData || { inventory: [], orders: [] }), 1000)
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

const GREETING_REGEX = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|greetings|namaste|vanakkam)[!.\s]*$/i;

/**
 * Sends a user message to the secure server-side /api/chat endpoint.
 */
export async function sendChatMessage(userMessageText: string): Promise<ChatMessage> {
  const isGreeting = GREETING_REGEX.test(userMessageText.trim());

  let contextSummary: string | undefined;

  // Only attach full operational database context if it's not a simple greeting
  if (!isGreeting) {
    const { inventory, orders } = await getCachedContext();
    if (inventory.length > 0 || orders.length > 0) {
      contextSummary = `
Operational Context:
- Active Inventory Items count: ${inventory.length}
- Active Purchase Orders count: ${orders.length}
- Inventory Items Sample: ${JSON.stringify(inventory.slice(0, 10))}
- Purchase Orders Sample: ${JSON.stringify(orders.slice(0, 5))}
`;
    }
  }

  try {
    const res = await apiClient.post<{ text?: string; error?: string }>("/api/chat", {
      message: userMessageText,
      context: contextSummary,
    });

    if (res.error) {
      return {
        id: nextId(),
        role: "assistant",
        type: "text",
        text: res.error,
      };
    }

    const rawText = res.text || "No response received from KSRTC SCION engine.";
    const cleanedText = rawText.replace(
      /^(\s*[*#_>`"'-]*\s*(?:(?:Hello|Hi|Greetings|Welcome)[^.\n]*[.,!?:;\n]+)?\s*[*#_>`"'-]*\s*(?:I am|I'm|This is|As)\s+(?:the\s+)?(?:KSRTC\s+SCION|SCION|Kerala State Road Transport Corporation)[^\n]*?(?:[.:!\n]|\s*\n)\s*[*#_>`"'-]*\s*)+/i,
      ""
    ).replace(
      /^[*#_>`"'\s]*I am KSRTC SCION \(Supply Chain Intelligence & Operational Network\) for Kerala State Road Transport Corporation\.?[*#_>`"'\s]*/i,
      ""
    ).trim();

    return {
      id: nextId(),
      role: "assistant",
      type: "text",
      text: cleanedText || rawText,
    };
  } catch (err: any) {
    if (ENDPOINTS.base) {
      try {
        return await apiClient.post<ChatMessage>(`${ENDPOINTS.base}/chat`, { message: userMessageText });
      } catch (backendErr: any) {
        console.error("Backend chat service call failed:", backendErr);
      }
    }

    console.error("Server API chat endpoint call failed:", err);
    return {
      id: nextId(),
      role: "assistant",
      type: "text",
      text: `KSRTC SCION: ${err?.message || "Could not generate response. Please check connection."}`,
    };
  }
}
