import type { Staff } from "./index";

export {};

type Result = { success: boolean; error?: string; [key: string]: unknown };
type DesktopSession = Staff & { storeId: string };
type LoginResult =
  | { success: true; session: DesktopSession }
  | { success: false; error: { code: "INVALID_PIN" | "PIN_LOCKED"; message: string; retryAfterMs?: number; attemptsRemaining?: number } };

declare global {
  interface ElectronAPI {
    auth: {
      getBootstrapState: () => Promise<{ requiresOwnerEnrollment: boolean }>;
      login: (payload: { pin: string }) => Promise<LoginResult>;
      enrollOwner: (payload: { name: string; pin: string; confirmPin: string }) => Promise<DesktopSession>;
      getSession: () => Promise<DesktopSession>;
      logout: () => Promise<Result>;
    };
    products: {
      search: (payload: { search: string; category: string }) => Promise<any[]>;
      getBySku: (payload: { sku: string }) => Promise<any>;
      getRolls: (payload: { productId: string }) => Promise<Array<{ id: string; roll_number: string; current_length: number; initial_length: number; unit: string }>>;
      list: (payload: { search?: string; brandId?: string }) => Promise<any[]>;
      upsert: (payload: { product: Record<string, unknown>; rolls: Array<Record<string, unknown>> }) => Promise<string>;
      delete: (payload: { id: string }) => Promise<Result>;
      bulkImport: (payload: { products: Array<Record<string, unknown>> }) => Promise<Result>;
    };
    customers: {
      search: (payload: { search: string }) => Promise<any[]>;
      getOrders: (payload: { customerId: string }) => Promise<any[]>;
      create: (payload: { customer: Record<string, unknown> }) => Promise<string>;
      update: (payload: { id: string; customer: Record<string, unknown> }) => Promise<Result>;
      delete: (payload: { id: string }) => Promise<Result>;
    };
    brands: {
      list: () => Promise<any[]>;
      listWithCounts: () => Promise<any[]>;
      create: (payload: { name: string; description?: string | null }) => Promise<string>;
      update: (payload: { id: string; name: string; description?: string | null }) => Promise<Result>;
      delete: (payload: { id: string }) => Promise<Result>;
    };
    orders: {
      list: (payload: Record<string, unknown>) => Promise<any[]>;
      getDetails: (payload: { orderId: string }) => Promise<any>;
      getReturns: (payload: { orderId: string }) => Promise<any[]>;
      create: (payload: Record<string, unknown>) => Promise<Result>;
    };
    returns: { create: (payload: any) => Promise<Result> };
    exchanges: { finalize: (payload: any) => Promise<Result> };
    inventory: { adjustStock: (payload: { productId: string; adjustment: number; reason?: string }) => Promise<Result> };
    reports: {
      getDashboardStats: (payload: { startDate?: string; endDate?: string }) => Promise<any>;
      getSalesTrend: (payload: { startDate?: string; endDate?: string }) => Promise<any[]>;
      getSalesByBrand: (payload: { startDate?: string; endDate?: string }) => Promise<any[]>;
      getTopProducts: (payload: { limit: number; startDate?: string; endDate?: string }) => Promise<any[]>;
      getSalesSummary: (payload: { startDate?: string; endDate?: string }) => Promise<any>;
      getStaffSales: (payload: { startDate?: string; endDate?: string }) => Promise<any[]>;
    };
    activity: { list: (payload: { limit: number; offset: number }) => Promise<any[]>; count: () => Promise<number> };
    procurement: {
      listSuppliers: () => Promise<any[]>;
      upsertSupplier: (payload: Record<string, unknown>) => Promise<Result>;
      listOrders: () => Promise<any[]>;
      getItems: (payload: { purchaseOrderId: string }) => Promise<any[]>;
      saveOrder: (payload: Record<string, unknown>) => Promise<Result>;
      receiveOrder: (payload: { id: string }) => Promise<Result>;
    };
    staff: {
      list: () => Promise<Staff[]>;
      create: (payload: { name: string; pin: string; role: string }) => Promise<Result>;
      update: (payload: { id: string; name: string; pin?: string; role: string; status: string }) => Promise<Result>;
      delete: (payload: { id: string }) => Promise<Result>;
    };
    files: { selectProductImage: () => Promise<string | null> };
    database: {
      clear: (payload: { type: "inventory" | "sales" | "customers" | "full" }) => Promise<Result>;
      backup: () => Promise<Result>;
      restore: () => Promise<Result>;
    };
    settings: {
      getBusinessProfile: () => Promise<{ businessType: string; customStockUnit: string }>;
      setBusinessProfile: (payload: { businessType: string; customStockUnit: string }) => Promise<Result>;
    };
    sync: {
      getStatus: () => Promise<any>;
      trigger: () => Promise<any>;
      getSettings: () => Promise<any>;
      saveSettings: (payload: { url: string; key: string }) => Promise<Result>;
      testConnection: () => Promise<Result>;
      onStatusChanged: (callback: (status: any) => void) => () => void;
      onConflictDetected: (callback: (conflict: any) => void) => () => void;
      getConflicts: () => Promise<any>;
      resolveConflict: (payload: { syncItemId: string; resolution: string; resolvedData: any }) => Promise<any>;
      autoResolveAllConflicts: () => Promise<any>;
    };
    cloud: {
      signIn: (payload: { url?: string; key?: string; email: string; password: string; storeId?: string }) => Promise<{ success: boolean; storeId?: string; storeName?: string; userEmail?: string; error?: string }>;
      signOut: () => Promise<Result>;
      getSession: () => Promise<any>;
    };
    system: { getInfo: () => Promise<any>; openLogFile: () => Promise<any> };
    license: { getStatus: () => Promise<any>; activate: (key: string) => Promise<{ success: boolean; expiresAt?: string; error?: string }> };
    updates: {
      install: () => Promise<void>;
      onAvailable: (callback: (info: { version: string }) => void) => () => void;
      onProgress: (callback: (progress: { percent: number }) => void) => () => void;
      onDownloaded: (callback: (info: { version: string }) => void) => () => void;
    };
  }

  interface Window { electronAPI: ElectronAPI }
}
