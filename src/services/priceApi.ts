import { getPriceHistory } from "./inventoryApi";
import type { PriceRecord } from "../types";

export async function getPriceHistoryForPart(part: string): Promise<PriceRecord[]> {
  return getPriceHistory(part);
}

