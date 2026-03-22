import { createClient } from "../../../lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let buildDataContext: ((query: string, placeDetails: any) => { contextText: string; citations: Array<{ id: string; label: string; url?: string }> }) | null = null;
try {
  // Dynamic import — gracefully degrades if dataset files aren't present
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../../../lib/data/context-builder");
  buildDataContext = mod.buildDataContext;
} catch {
  // Data layer not available — generation proceeds without enrichment
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Auth is optional — unauthenticated users can generate but not save
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limit only authenticated users
  if (user) {
    const { data: allowed, error: rlError } = await supabase.rpc(
      "check_chat_rate_limit",
      { p_user_id: user.id, p_max: 20, p_window_secs: 60 }
    );
    if (rlError || !allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  const body = await req.json();

  // Enrich system prompt with external dataset context if requested
  let systemPrompt = body.system;
  let citations: Array<{ id: string; label: string; url?: string }> = [];

  if (body.enrichWithData && buildDataContext) {
    try {
      const placeDetails = body.placeDetails || null;
      const query = body.messages?.[0]?.content || "";
      const result = buildDataContext(query, placeDetails);
      systemPrompt = systemPrompt + "\n\n" + result.contextText;
      citations = result.citations;
    } catch (e) {
      console.warn("[data-enrichment] Failed to build data context:", e);
      // Continue without enrichment
    }
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model || "claude-sonnet-4-20250514",
      max_tokens: body.max_tokens || 4000,
      stream: true,
      system: systemPrompt,
      messages: body.messages,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream response, appending citations as final SSE event
  const upstreamBody = upstream.body!;
  const transform = new TransformStream({
    flush(controller) {
      if (citations.length > 0) {
        const citationEvent = `data: ${JSON.stringify({ type: "citations", citations })}\n\n`;
        controller.enqueue(new TextEncoder().encode(citationEvent));
      }
    }
  });

  return new Response(upstreamBody.pipeThrough(transform), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
