import { API_URL, buildComparePrompt } from "./prompts";
import type { Department } from "../../types/department";

export async function compareDepartments(
  deptA: Department,
  deptB: Department,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: buildComparePrompt(deptA, deptB),
      messages: [{ role: "user", content: "Generate the comparative analysis now." }],
    }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const evt = JSON.parse(data);
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          onChunk(evt.delta.text);
        }
      } catch { /* skip malformed events */ }
    }
  }
}

export interface CompareSection {
  title: string;
  content: string;
}

export function parseSections(text: string): CompareSection[] {
  const parts = text.split(/^## /m).filter(Boolean);
  return parts.map(part => {
    const newline = part.indexOf("\n");
    const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const content = newline === -1 ? "" : part.slice(newline + 1).trim();
    return { title, content };
  });
}
