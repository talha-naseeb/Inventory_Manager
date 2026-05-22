import { useAuthStore } from "../store/useAuthStore";

export type PermissionAction = 
  | "manage_inventory" 
  | "delete_product" 
  | "view_reports" 
  | "edit_settings" 
  | "process_refund" 
  | "manage_staff";

export const usePermissions = () => {
  const { currentStaff } = useAuthStore();

  const role = currentStaff?.role;

  const can = (action: PermissionAction): boolean => {
    if (!role) return false;
    
    // Owners and Admins can do everything
    if (role === "owner" || role === "admin") return true;

    switch (action) {
      case "manage_inventory":
        return role === "manager";
      case "delete_product":
        return false; // Only Owner/Admin can delete products
      case "view_reports":
        return role === "manager";
      case "process_refund":
        return role === "manager";
      case "manage_staff":
        return false; // Only Owner/Admin can manage staff
      case "edit_settings":
        return false; // Only Owner/Admin can edit settings
      default:
        return false;
    }
  };

  return {
    can,
    role,
    isOwner: role === "owner",
    isAdmin: role === "admin",
    isManager: role === "manager",
    isCashier: role === "cashier",
  };
};
