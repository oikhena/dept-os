import type { Department } from "./department";

export interface SavedDepartment {
  id: string;
  kind: "generated" | "custom";
  generationQuery?: string;
  department: Department;
  createdAt: string;
  updatedAt: string;
}
