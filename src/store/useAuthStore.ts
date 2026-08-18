import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";

interface AuthState {
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  cloudToken: string | null;
  storeId: string;
  isCloudConnected: boolean;
  
  // Traditional PIN login (local)
  login: (pin: string) => Promise<boolean>;
  enrollOwner: (name: string, pin: string, confirmPin: string) => Promise<boolean>;
  
  // New Cloud Login (SaaS)
  cloudLogin: (email: string, pass: string) => Promise<boolean>;
  
  logout: () => void;
  hasPermission: (action: "manage_inventory" | "view_reports" | "edit_settings" | "process_refund") => boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentStaff: null,
      isAuthenticated: false,
      cloudToken: null,
      storeId: 'default',
      isCloudConnected: false,
      isLoading: false,
      error: null,

      cloudLogin: async (email, pass) => {
        set({ isLoading: true, error: null });
        try {
          const requestedStoreId = get().storeId !== "default" ? get().storeId : undefined;
          const result = await window.electronAPI.cloud.signIn({
            email,
            password: pass,
            storeId: requestedStoreId,
          });

          if (result.success) {
            set({ 
              cloudToken: null,
              storeId: result.storeId || "default",
              isCloudConnected: true,
              isLoading: false 
            });
            return true;
          }
          set({ error: result.error || "Cloud connection failed", isLoading: false });
          return false;
        } catch (_err) {
          set({ error: "Cloud connection failed", isLoading: false });
          return false;
        }
      },

      login: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.electronAPI.auth.login({ pin });
          if (!result.success) {
            const message = result.error.code === "PIN_LOCKED"
              ? result.error.message
              : `Invalid PIN${Number.isInteger(result.error.attemptsRemaining) ? `. ${result.error.attemptsRemaining} attempts remaining.` : "."}`;
            set({ error: message, isLoading: false });
            return false;
          }
          const session = result.session;
          set({ currentStaff: session, storeId: session.storeId, isAuthenticated: true, isLoading: false });
          return true;
        } catch (_err) {
          set({ error: "Local authentication failed", isLoading: false });
          return false;
        }
      },

      enrollOwner: async (name, pin, confirmPin) => {
        set({ isLoading: true, error: null });
        try {
          const session = await window.electronAPI.auth.enrollOwner({ name, pin, confirmPin });
          set({ currentStaff: session, storeId: session.storeId, isAuthenticated: true, isLoading: false });
          return true;
        } catch (err) {
          const message = err instanceof Error && err.message.includes("confirmation")
            ? "PIN confirmation does not match"
            : "Owner setup could not be completed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        void window.electronAPI.auth.logout().catch(() => undefined);
        set({ currentStaff: null, isAuthenticated: false });
      },

      hasPermission: (action): boolean => {
        const staff = get().currentStaff;
        if (!staff) return false;
        const role = staff.role;
        if (role === "owner" || role === "admin") return true;
        if (action === "manage_inventory" || action === "view_reports") return role === "manager";
        return false;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        cloudToken: state.cloudToken,
        storeId: state.storeId,
        isCloudConnected: state.isCloudConnected,
        // We do NOT persist isAuthenticated/currentStaff for security (Force PIN on restart)
      }),
    },
  ),
);
