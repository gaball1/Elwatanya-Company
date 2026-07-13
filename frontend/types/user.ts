export type UserRole = "admin" | "manager" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
