import { GoogleGenAI } from "@google/genai";
import { apiClient, DEMO_MODE, ENDPOINTS } from "./apiClient";
import type { ChatMessage } from "../types";
import { getInventory } from "./inventoryApi";
import { getPurchaseOrders } from "./purchaseOrderApi";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

const SYSTEM_INSTRUCTION = `You are the KSRTC (Kerala State Road Transport Corporation) Supply Chain Copilot.
Your job is to provide accurate, concise, grounded answers regarding bus fleet spare parts, inventory levels, safety stock thresholds, purchase orders, demand forecasts, and supplier performance.
Always remain professional, helpful, and focused on KSRTC fleet operations.`;

/**
 * Sends a user message to the Gemini API (using @google/genai SDK or Gemini API Key)
 * or to the backend service endpoint if configured.
 */
export async function sendChatMessage(userMessageText: string): Promise<ChatMessage> {
  const apiKey = ENDPOINTS.geminiKey || import.meta.env.VITE_GEMINI_API_KEY;

  // 1. Direct Gemini API SDK integration if API key is present
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Gather live operational context from inventory & POs if available
      const inventory = await getInventory().catch(() => []);
      const orders = await getPurchaseOrders().catch(() => []);
      
      const contextSummary = `
Operational Context:
- Active Inventory Items count: ${inventory.length}
- Active Purchase Orders count: ${orders.length}
- Inventory Items: ${JSON.stringify(inventory.slice(0, 10))}
- Purchase Orders: ${JSON.stringify(orders.slice(0, 5))}
`;

      let responseText = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: `${contextSummary}\n\nUser Question: ${userMessageText}`,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        responseText = response.text || "";
      } catch (firstErr) {
        console.warn("gemini-3.6-flash failed, trying gemini-1.5-flash fallback:", firstErr);
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: `${contextSummary}\n\nUser Question: ${userMessageText}`,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        responseText = fallbackResponse.text || "";
      }

      const replyText = responseText || "No response received from Gemini API.";

      return {
        id: nextId(),
        role: "assistant",
        type: "text",
        text: replyText,
      };
    } catch (err: any) {
      console.error("Gemini API call failed:", err);
      // Fallback to error message detailing Gemini connection issue
      return {
        id: nextId(),
        role: "assistant",
        type: "text",
        text: `Gemini API Error: ${err?.message || "Could not generate response from Gemini API. Please verify your VITE_GEMINI_API_KEY."}`,
      };
    }
  }

  // 2. Direct backend REST integration if backend URL is provided and not demo mode
  if (!DEMO_MODE && ENDPOINTS.base) {
    return apiClient.post<ChatMessage>(`${ENDPOINTS.base}/chat`, { message: userMessageText });
  }

  // 3. Fallback when VITE_GEMINI_API_KEY is not yet configured
  return {
    id: nextId(),
    role: "assistant",
    type: "text",
    text: `To connect live Gemini AI: Add your VITE_GEMINI_API_KEY to the .env file and restart the dev server.\n\nQuery received: "${userMessageText}"`,
  };
}
