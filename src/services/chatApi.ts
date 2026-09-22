import { apiClient, DEMO_MODE, ENDPOINTS } from "./apiClient";
import type { ChatMessage } from "../types";
import { getInventory } from "./inventoryApi";
import { getPurchaseOrders } from "./purchaseOrderApi";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

/**
 * Sends a user message to the secure server-side /api/chat endpoint.
 */
export async function sendChatMessage(userMessageText: string): Promise<ChatMessage> {
  // 1. Gather live operational context from inventory & POs if available
  const inventory = await getInventory().catch(() => []);
  const orders = await getPurchaseOrders().catch(() => []);

  const contextSummary = `
Operational Context:
- Active Inventory Items count: ${inventory.length}
- Active Purchase Orders count: ${orders.length}
- Inventory Items: ${JSON.stringify(inventory.slice(0, 10))}
- Purchase Orders: ${JSON.stringify(orders.slice(0, 5))}
`;

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

    return {
      id: nextId(),
      role: "assistant",
      type: "text",
      text: res.text || "No response received from Gemini API.",
    };
  } catch (err: any) {
    // 2. Direct backend REST integration fallback if external backend URL is provided and not demo mode
    if (!DEMO_MODE && ENDPOINTS.base) {
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
      text: `Gemini API Error: ${err?.message || "Could not generate response from Gemini API endpoint. Please check server logs and GEMINI_API_KEY environment variable."}`,
    };
  }
}
