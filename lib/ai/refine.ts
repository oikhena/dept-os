import { API_URL, buildRefinePrompt } from "./prompts";
import { tryParse } from "./streaming";
import type { Department } from "../../types/department";

export async function refineDepartment(
  dept: Department,
  instruction: string,
  onChunk: (acc: string, partial: Department | null) => void,
  signal?: AbortSignal
): Promise<Department> {
  const response = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: buildRefinePrompt(dept, instruction),
      messages: [{ role: "user", content: "Apply the instruction and return the refined department JSON." }],
    }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        const final = tryParse(acc);
        if (!final) throw new Error("Could not parse refinement result as valid JSON");
        return final;
      }
      try {
        const evt = JSON.parse(data);
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          acc += evt.delta.text;
          onChunk(acc, tryParse(acc));
        }
      } catch { /* skip malformed events */ }
    }
  }

  const final = tryParse(acc);
  if (!final) throw new Error("Could not parse refinement result as valid JSON");
  return final;
}
