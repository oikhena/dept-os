import { API_URL, SYSTEM_PROMPT } from "./prompts";
import type { Department } from "../../types/department";
import type { PlaceDetails } from "../maps/loader";

function buildPlaceContext(place: PlaceDetails): string {
  return `\n\nVERIFIED FACILITY DATA — use this to ground every claim:
Name: ${place.name}
Address: ${place.address}
Coordinates: ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}
Facility type: ${place.types.slice(0, 4).join(", ")}`;
}

export async function generateDepartment(
  query: string,
  place: PlaceDetails | null,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const placeContext = place ? buildPlaceContext(place) : "";
  const response = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Research and generate the complete department schema for: "${query}"${placeContext}\n\nBe thorough. Ground every claim in real operational knowledge of this institution type. Weight agent recommendations based on the region's infrastructure constraints.`
      }]
    })
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
        if (evt.type === "content_block_delta" && evt.delta?.text) onChunk(evt.delta.text);
      } catch {}
    }
  }
}

export function tryParse(raw: string): Department | null {
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  try {
    let p = raw.slice(start);
    let opens = 0, openArr = 0;
    for (const c of p) { if (c === "{") opens++; if (c === "}") opens--; if (c === "[") openArr++; if (c === "]") openArr--; }
    p += "]".repeat(Math.max(0, openArr)) + "}".repeat(Math.max(0, opens));
    return JSON.parse(p);
  } catch { return null; }
}
