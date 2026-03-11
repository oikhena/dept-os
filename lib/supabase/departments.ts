import type { SupabaseClient } from "@supabase/supabase-js";
import type { Department } from "../../types/department";
import type { SavedDepartment } from "../../types/saved";

interface DepartmentRow {
  id: string;
  user_id: string;
  label: string;
  kind: "generated" | "custom";
  generation_query: string | null;
  data: Department;
  created_at: string;
  updated_at: string;
}

function rowToSaved(row: DepartmentRow): SavedDepartment {
  return {
    id: row.id,
    kind: row.kind,
    generationQuery: row.generation_query ?? undefined,
    department: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadUserDepartments(
  supabase: SupabaseClient
): Promise<SavedDepartment[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DepartmentRow[]).map(rowToSaved);
}

export async function saveDepartment(
  supabase: SupabaseClient,
  dept: Department,
  kind: "generated" | "custom",
  generationQuery?: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("departments")
    .insert({
      user_id: user.id,
      label: dept.label,
      kind,
      generation_query: generationQuery ?? null,
      data: dept,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateDepartment(
  supabase: SupabaseClient,
  id: string,
  dept: Department
): Promise<void> {
  const { error } = await supabase
    .from("departments")
    .update({ label: dept.label, data: dept })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDepartment(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
