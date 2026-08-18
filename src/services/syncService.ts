class SyncService {
  private listeners: Set<(status: { isOnline: boolean; pendingCount: number; conflictsCount?: number }) => void> = new Set();
  private pendingCount = 0;
  private conflictsCount = 0;
  private isOnline = navigator.onLine;
  private started = false;
  private conflictListeners: Set<(conflict: any) => void> = new Set();

  public start() {
    if (this.started) return;
    this.started = true;

    window.addEventListener("online", () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));

    if (window.electronAPI?.sync) {
      window.electronAPI.sync.onStatusChanged((status: { pendingCount?: number; conflictsCount?: number }) => {
        this.pendingCount = Number(status?.pendingCount ?? 0);
        this.conflictsCount = Number(status?.conflictsCount ?? 0);
        this.notifyListeners();
      });

      window.electronAPI.sync.onConflictDetected?.((conflict: any) => {
        this.conflictListeners.forEach((callback) => callback(conflict));
      });

      this.refreshStatus();
    }
  }

  public stop() {
    this.started = false;
  }

  private async refreshStatus() {
    if (window.electronAPI?.sync) {
      const status = await window.electronAPI.sync.getStatus();
      this.pendingCount = typeof status === "number" ? status : Number(status?.pendingCount ?? 0);
      this.conflictsCount = Number(status?.conflictsCount ?? 0);
      this.notifyListeners();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.triggerSync();
    }
    this.notifyListeners();
  }

  public triggerSync() {
    if (window.electronAPI?.sync) {
      window.electronAPI.sync.trigger();
    }
  }

  public subscribe(callback: (status: { isOnline: boolean; pendingCount: number; conflictsCount?: number }) => void) {
    this.listeners.add(callback);
    this.notifyListeners();
    return () => this.listeners.delete(callback);
  }

  public onConflictDetected(callback: (conflict: any) => void) {
    this.conflictListeners.add(callback);
    return () => this.conflictListeners.delete(callback);
  }

  public async getConflicts() {
    if (!window.electronAPI?.sync) return { success: false, error: "Sync API unavailable" };
    return window.electronAPI.sync.getConflicts();
  }

  public async resolveConflict(syncItemId: string, resolution: string, resolvedData: any) {
    if (!window.electronAPI?.sync) return { success: false, error: "Sync API unavailable" };
    return window.electronAPI.sync.resolveConflict({ syncItemId, resolution, resolvedData });
  }

  public async autoResolveAllConflicts() {
    if (!window.electronAPI?.sync) return { success: false, error: "Sync API unavailable" };
    return window.electronAPI.sync.autoResolveAllConflicts();
  }

  private notifyListeners() {
    const status = {
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      conflictsCount: this.conflictsCount,
    };
    this.listeners.forEach((callback) => callback(status));
  }
}

export const syncService = new SyncService();
