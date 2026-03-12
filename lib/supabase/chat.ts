import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "../../hooks/useChat";

export async function loadChatHistory(
  supabase: SupabaseClient,
  deptId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("dept_id", deptId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data as ChatMessage[];
}

export async function appendChatMessages(
  supabase: SupabaseClient,
  deptId: string,
  userId: string,
  messages: ChatMessage[]
): Promise<void> {
  const rows = messages.map(m => ({
    user_id: userId,
    dept_id: deptId,
    role: m.role,
    content: m.content,
  }));
  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) throw error;
}
