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

      cloudLogin: async (_email, _pass) => {
        set({ isLoading: true, error: null });
        try {
          // In a real SaaS, this would be an IPC call to the Main process 
          // which then calls the Cloud API to get a JWT and Store ID.
          // For now, we simulate the Cloud API response.
          
          // const result = await window.electronAPI.auth.cloudLogin(email, pass);
          const result = { 
            success: true, 
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Mock JWT
            storeId: "store_abc_123",
            ownerName: "Cloud User"
          };

          if (result.success) {
            // Update SyncManager with the new Cloud credentials
            if (window.electronAPI?.sync) {
              await window.electronAPI.sync.setSettings({
                url: "https://api.inventoriman.com/v1", // Pro SaaS URL
                key: result.token
              });
            }

            set({ 
              cloudToken: result.token, 
              storeId: result.storeId,
              isCloudConnected: true,
              isLoading: false 
            });
            return true;
          }
          return false;
        } catch (_err) {
          set({ error: "Cloud connection failed", isLoading: false });
          return false;
        }
      },

      login: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
          const { storeId } = get();
          // Use specific API for PIN verification
          const staff = await window.electronAPI.staff.verifyPin({ pin, store_id: storeId });

          if (staff) {
            await window.electronAPI.staff.logAction({ staff_id: staff.id, action: "login" });
            set({ currentStaff: staff, isAuthenticated: true, isLoading: false });
            return true;
          } else {
            set({ error: "Invalid PIN", isLoading: false });
            return false;
          }
        } catch (_err) {
          set({ error: "Local auth error", isLoading: false });
          return false;
        }
      },

      logout: () => {
        const staff = get().currentStaff;
        if (staff) {
          window.electronAPI.staff.logAction({ staff_id: staff.id, action: "logout" });
        }
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
