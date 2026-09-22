import type { ChatMessage } from "../types";
import { SINGLE_DEPOT } from "./inventory";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

export function mockChatReply(userText: string): ChatMessage {
  return {
    id: nextId(),
    role: "assistant",
    type: "text",
    text: `Received your query: "${userText}". Processing through KSRTC SCION intelligence service endpoint for ${SINGLE_DEPOT}...`,
  };
}
