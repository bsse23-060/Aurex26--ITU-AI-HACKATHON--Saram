import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type User } from "./api";

type AuthState = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string) => Promise<User>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      login: async (email, password) => {
        const data = await api<{ access_token: string; user: User }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        set({ token: data.access_token, user: data.user });
        return data.user;
      },
      register: async (fullName, email, password) => {
        const data = await api<{ access_token: string; user: User }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ full_name: fullName, email, password }),
        });
        set({ token: data.access_token, user: data.user });
        return data.user;
      },
      refreshUser: async () => {
        const t = get().token;
        if (!t) return;
        try {
          const u = await api<User>("/api/auth/me", { token: t });
          set({ user: u });
        } catch {
          set({ token: null, user: null });
        }
      },
    }),
    { name: "atomcamp-lms-auth" },
  ),
);
