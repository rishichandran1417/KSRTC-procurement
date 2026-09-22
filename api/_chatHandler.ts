import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are KSRTC SCION (Supply Chain Intelligence & Operational Network) for Kerala State Road Transport Corporation.
Your job is to provide accurate, concise, grounded answers regarding bus fleet spare parts, inventory levels, safety stock thresholds, purchase orders, demand forecasts, and supplier performance.
Always identify yourself as KSRTC SCION when asked. Remain professional, helpful, and focused on KSRTC fleet operations.`;

export async function processChatRequest(
  message: string,
  context?: string
): Promise<{ text?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error:
        "GEMINI_API_KEY environment variable is missing on the server. Please add GEMINI_API_KEY to your Vercel project settings.",
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const fullPrompt = context
    ? `${context}\n\nUser Question: ${message}`
    : `User Question: ${message}`;

  try {
    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      responseText = response.text || "";
    } catch (firstErr) {
      console.warn(
        "gemini-3.6-flash failed, trying gemini-1.5-flash fallback:",
        firstErr
      );
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      responseText = fallbackResponse.text || "";
    }

    return {
      text: responseText || "No response received from KSRTC SCION engine.",
    };
  } catch (err: any) {
    console.error("SCION API server-side error:", err);
    return {
      error: `SCION AI Error: ${err?.message || "Could not generate response from SCION engine."
        }`,
    };
  }
}
