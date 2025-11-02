"use server";

import { analyzeCommunication } from "@/ai/flows/context-aware-safety-tool";
import type { AnalyzeCommunicationOutput } from "@/ai/flows/context-aware-safety-tool";

export async function analyzeTextForSafety(
  text: string
): Promise<AnalyzeCommunicationOutput | null> {
  if (!text.trim()) {
    return null;
  }
  try {
    const result = await analyzeCommunication({ text });
    return result;
  } catch (error) {
    console.error("Fehler bei der Analyse der Kommunikation:", error);
    return null;
  }
}
