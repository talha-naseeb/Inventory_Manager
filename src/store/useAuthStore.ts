import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";
import { dbService } from "../services/database";

interface AuthState {
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
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
      isLoading: false,
      error: null,

      login: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
          const staff = await dbService.getOne<Staff>("SELECT id, name, role, status FROM staff WHERE pin = ? AND status = 'active'", [pin]);

          if (staff) {
            // Log the login event
            await dbService.execute("INSERT INTO login_logs (id, staff_id, action) VALUES (?, ?, ?)", [crypto.randomUUID(), staff.id, "login"]);

            set({ currentStaff: staff, isAuthenticated: true, isLoading: false });
            return true;
          } else {
            set({ error: "Invalid PIN or account inactive", isLoading: false });
            return false;
          }
        } catch (err) {
          console.error("Login Error:", err);
          set({ error: "Authentication system error", isLoading: false });
          return false;
        }
      },

      logout: () => {
        const staff = get().currentStaff;
        if (staff) {
          // Fire and forget logout log
          dbService.execute("INSERT INTO login_logs (id, staff_id, action) VALUES (?, ?, ?)", [crypto.randomUUID(), staff.id, "logout"]);
        }
        set({ currentStaff: null, isAuthenticated: false });
      },

      hasPermission: (action): boolean => {
        const staff = get().currentStaff;
        if (!staff) return false;

        const role = staff.role;
        if (role === "owner" || role === "admin") return true;

        if (action === "manage_inventory" || action === "view_reports") {
          return role === "manager";
        }

        return false;
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
