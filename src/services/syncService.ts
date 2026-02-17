import { dbService } from "./database";

export interface SyncItem {
  id: string;
  action_type: string;
  entity_id: string;
  payload_json: string;
  status: "PENDING" | "SYNCED" | "FAILED";
  created_at: string;
}

class SyncService {
  private isProcessing = false;
  private syncInterval: any = null;
  private listeners: Set<(status: { isOnline: boolean; pendingCount: number }) => void> = new Set();
  private pendingCount = 0;

  constructor() {
    window.addEventListener("online", () => this.handleNetworkChange());
    window.addEventListener("offline", () => this.handleNetworkChange());
  }

  public start() {
    if (this.syncInterval) return;

    // Check every 30 seconds
    this.syncInterval = setInterval(() => this.processQueue(), 30000);
    this.processQueue(); // Immediate first check
  }

  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async handleNetworkChange() {
    if (navigator.onLine) {
      console.log("System back online. Triggering sync...");
      await this.processQueue();
    }
    this.notifyListeners();
  }

  public subscribe(callback: (status: { isOnline: boolean; pendingCount: number }) => void) {
    this.listeners.add(callback);
    this.notifyListeners();
    return () => this.listeners.delete(callback);
  }

  private async notifyListeners() {
    const queue = await dbService.query("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'");
    this.pendingCount = queue[0]?.count || 0;

    const status = {
      isOnline: navigator.onLine,
      pendingCount: this.pendingCount,
    };

    this.listeners.forEach((callback) => callback(status));
  }

  public async processQueue() {
    if (this.isProcessing || !navigator.onLine) return;
    this.isProcessing = true;

    try {
      const pendingItems = await dbService.query<SyncItem>("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 10");

      if (pendingItems.length === 0) {
        this.isProcessing = false;
        this.notifyListeners();
        return;
      }

      console.log(`Processing ${pendingItems.length} sync items...`);

      for (const item of pendingItems) {
        const success = await this.mockCloudSync(item);
        if (success) {
          await dbService.execute("UPDATE sync_queue SET status = 'SYNCED' WHERE id = ?", [item.id]);
        } else {
          // Stay PENDING for next retry
          console.warn(`Sync failed for item ${item.id}. Will retry later.`);
        }
      }
    } catch (error) {
      console.error("Sync engine encountered an error:", error);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  private async mockCloudSync(item: SyncItem): Promise<boolean> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate random failures (5% chance)
    if (Math.random() < 0.05) return false;

    console.log(`[MOCK CLOUD] Successfully synced ${item.action_type} for ${item.entity_id}`);
    return true;
  }
}

export const syncService = new SyncService();
