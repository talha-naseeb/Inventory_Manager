import type { Staff } from "./index";

export {};

declare global {
  interface ElectronAPI {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>;
    products: {
      search: (args: { search: string; category: string; store_id: string }) => Promise<any[]>;
      getBySku: (args: { sku: string; store_id: string }) => Promise<any>;
      upsert: (args: { product: unknown; store_id: string }) => Promise<any>;
      delete: (args: { id: string; store_id: string }) => Promise<any>;
    };
    customers: {
      search: (args: { search: string; store_id: string }) => Promise<any[]>;
      getOrders: (args: { customerId: string; store_id: string }) => Promise<any[]>;
      create: (args: { customer: unknown; store_id: string }) => Promise<any>;
    };
    brands: {
      getAll: (storeId: string) => Promise<any[]>;
      create: (args: { name: string; description?: string | null; store_id: string }) => Promise<any>;
    };
    staff: {
      verifyPin: (args: unknown) => Promise<Staff | null>;
      logAction: (args: unknown) => Promise<any>;
      getAll: (storeId: string) => Promise<Staff[]>;
      create: (args: { staff: Partial<Staff>; store_id: string }) => Promise<{ success: boolean; id?: string; error?: string }>;
      update: (args: { id: string; staff: Partial<Staff>; store_id: string }) => Promise<{ success: boolean; error?: string }>;
      delete: (args: { id: string; store_id: string }) => Promise<{ success: boolean; error?: string }>;
    };
    inventory: {
      adjustStock: (args: { productId: string; adjustment: number; reason?: string; staffId?: string; store_id: string }) => Promise<{ success: boolean; newStock?: number; previousStock?: number; logId?: string; error?: string }>;
    };
    orders: {
      list: (args: unknown) => Promise<any[]>;
      create: (orderData: unknown) => Promise<any>;
    };
    returns: {
      create: (args: unknown) => Promise<{ success: boolean; id?: string; value?: number; inventoryLogs?: Array<Record<string, unknown>>; error?: string }>;
    };
    exchanges: {
      finalize: (args: unknown) => Promise<{
        success: boolean;
        returnId?: string;
        replacementOrderId?: string;
        amountDue?: number;
        remainingBalance?: number;
        balanceOutcome?: string;
        inventoryLogs?: Array<Record<string, unknown>>;
        customerCreditLog?: Record<string, unknown> | null;
        error?: string;
      }>;
    };
    reports: {
      getDashboardStats: (args: unknown) => Promise<any>;
      getSalesTrend: (args: unknown) => Promise<any[]>;
    };
    database: {
      clearData: (args: { type: "inventory" | "sales" | "customers" | "full"; store_id: string; staff_id?: string }) => Promise<{ success: boolean; error?: string }>;
      backup: () => Promise<{ success: boolean; path?: string; error?: string }>;
      restore: () => Promise<{ success: boolean; error?: string }>;
    };
    settings: {
      getBusinessProfile: () => Promise<{ businessType: string; customStockUnit: string }>;
      setBusinessProfile: (args: { businessType: string; customStockUnit: string }) => Promise<{ success: boolean; error?: string }>;
    };
    sync: {
      getStatus: () => Promise<any>;
      trigger: () => Promise<any>;
      setSettings: (settings: unknown) => Promise<any>;
      getSettings: () => Promise<{ url: string; isConfigured: boolean; isActivated?: boolean; isAuthenticated?: boolean; storeId?: string; storeName?: string; userEmail?: string; pendingCount: number }>;
      saveSettings: (settings: { url: string; key: string }) => Promise<{ success: boolean; error?: string }>;
      testConnection: () => Promise<any>;
      onStatusChanged: (callback: (status: any) => void) => () => void;
      onConflictDetected: (callback: (conflict: any) => void) => () => void;
      getConflicts: () => Promise<any>;
      resolveConflict: (args: { syncItemId: string; resolution: string; resolvedData: any }) => Promise<any>;
      autoResolveAllConflicts: () => Promise<any>;
    };
    cloud: {
      signIn: (args: { url?: string; key?: string; email: string; password: string; storeId?: string }) => Promise<{ success: boolean; storeId?: string; storeName?: string; userEmail?: string; error?: string }>;
      signOut: () => Promise<{ success: boolean; error?: string }>;
      getSession: () => Promise<{ isConfigured: boolean; isActivated: boolean; isAuthenticated: boolean; storeId: string; storeName: string; userEmail: string }>;
    };
    system: {
      getInfo: () => Promise<any>;
      openLogFile: () => Promise<any>;
    };
    license: {
      getStatus: () => Promise<any>;
      activate: (key: string) => Promise<any>;
    };
    updates: {
      install: () => Promise<void>;
      onAvailable: (callback: (info: { version: string }) => void) => () => void;
      onProgress: (callback: (progress: { percent: number }) => void) => () => void;
      onDownloaded: (callback: (info: { version: string }) => void) => () => void;
    };
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
