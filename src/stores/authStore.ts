import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      isLoggedIn: false,
      error: null,
      login: async (email: string, password: string) => {
        try {
          // TODO: Implement actual login logic using electron IPC
          set({ isLoggedIn: true, error: null });
        } catch (error) {
          set({ isLoggedIn: false, error: (error as Error).message });
        }
      },
      logout: () => {
        set({ isLoggedIn: false, error: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
