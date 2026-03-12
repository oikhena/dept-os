"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { API_URL } from "../lib/ai/prompts";
import { createClient } from "../lib/supabase/client";
import { loadChatHistory, appendChatMessages } from "../lib/supabase/chat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat(systemPrompt: string, savedDeptId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted history when a saved dept is provided
  useEffect(() => {
    if (!savedDeptId) return;
    setMessages([]);
    const supabase = createClient();
    loadChatHistory(supabase, savedDeptId)
      .then(setMessages)
      .catch(console.error);
  }, [savedDeptId]);

  const sendMessage = useCallback(async (userContent: string) => {
    const history: ChatMessage[] = [...messages, { role: "user", content: userContent }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          system: systemPrompt,
          messages: history,
          max_tokens: 1024,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const evt = JSON.parse(data);
            const text = evt.delta?.text ?? "";
            if (text) {
              acc += text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: acc };
                return updated;
              });
            }
          } catch { /* skip malformed events */ }
        }
      }

      // Persist the completed exchange
      if (savedDeptId && acc) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          appendChatMessages(supabase, savedDeptId, user.id, [
            { role: "user", content: userContent },
            { role: "assistant", content: acc },
          ]).catch(console.error);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, systemPrompt, savedDeptId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, sendMessage, isLoading, reset };
}
