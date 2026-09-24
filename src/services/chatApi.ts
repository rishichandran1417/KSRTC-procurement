import { apiClient, isDemoMode, ENDPOINTS } from "./apiClient";
import type { ChatMessage } from "../types";
import { getInventory } from "./inventoryApi";
import { getPurchaseOrders } from "./purchaseOrderApi";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

/**
 * Sends a user message to the secure server-side /api/chat endpoint.
 */
export async function sendChatMessage(userMessageText: string): Promise<ChatMessage> {
  // 1. Gather live operational context from inventory & POs in parallel
  const [inventory, orders] = await Promise.all([
    getInventory().catch(() => []),
    getPurchaseOrders().catch(() => []),
  ]);

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

    const rawText = res.text || "No response received from Gemini API.";
    // Clean any boilerplate self-intro lines from reaching the chat display
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
    // 2. Direct backend REST integration fallback if external backend URL is provided and not demo mode
    if (!isDemoMode() && ENDPOINTS.base) {
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
