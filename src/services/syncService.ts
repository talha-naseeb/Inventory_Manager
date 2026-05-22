class SyncService {
  private listeners: Set<(status: { isOnline: boolean; pendingCount: number }) => void> = new Set();
  private pendingCount = 0;
  private isOnline = navigator.onLine;
  private started = false;

  public start() {
    if (this.started) return;
    this.started = true;

    window.addEventListener("online", () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));

    if (window.electronAPI?.sync) {
      window.electronAPI.sync.onStatusChanged((status: { pendingCount?: number }) => {
        this.pendingCount = Number(status?.pendingCount ?? 0);
        this.notifyListeners();
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

  public subscribe(callback: (status: { isOnline: boolean; pendingCount: number }) => void) {
    this.listeners.add(callback);
    this.notifyListeners();
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const status = {
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
    };
    this.listeners.forEach((callback) => callback(status));
  }
}

export const syncService = new SyncService();
