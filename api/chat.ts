import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processChatRequest } from "./_chatHandler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "KSRTC SCION Intelligence Engine" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: 'Missing or invalid "message" in request body.' });
    }

    const result = await processChatRequest(message, context);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ text: result.text });
  } catch (err: any) {
    console.error("Unhandled server error in /api/chat endpoint:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
