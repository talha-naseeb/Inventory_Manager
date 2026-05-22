const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  // Specific API handlers for better security and type safety
  products: {
    search: (args) => ipcRenderer.invoke("api:products:search", args),
    getBySku: (args) => ipcRenderer.invoke("api:products:getBySku", args),
    upsert: (args) => ipcRenderer.invoke("api:products:upsert", args),
    delete: (args) => ipcRenderer.invoke("api:products:delete", args),
  },
  customers: {
    search: (args) => ipcRenderer.invoke("api:customers:search", args),
    getOrders: (args) => ipcRenderer.invoke("api:customers:getOrders", args),
    create: (args) => ipcRenderer.invoke("api:customers:create", args),
  },
  brands: {
    getAll: (storeId) => ipcRenderer.invoke("api:brands:getAll", storeId),
    create: (args) => ipcRenderer.invoke("api:brands:create", args),
  },
  staff: {
    verifyPin: (args) => ipcRenderer.invoke("api:staff:verifyPin", args),
    logAction: (args) => ipcRenderer.invoke("api:staff:logAction", args),
    getAll: (storeId) => ipcRenderer.invoke("api:staff:getAll", storeId),
    create: (args) => ipcRenderer.invoke("api:staff:create", args),
    update: (args) => ipcRenderer.invoke("api:staff:update", args),
    delete: (args) => ipcRenderer.invoke("api:staff:delete", args),
  },
  inventory: {
    adjustStock: (args) => ipcRenderer.invoke("api:inventory:adjustStock", args),
  },
  orders: {
    list: (args) => ipcRenderer.invoke("api:orders:list", args),
    create: (orderData) => ipcRenderer.invoke("api:orders:create", orderData),
  },
  returns: {
    create: (args) => ipcRenderer.invoke("api:returns:create", args),
  },
  exchanges: {
    finalize: (args) => ipcRenderer.invoke("api:exchanges:finalize", args),
  },
  reports: {
    getDashboardStats: (args) => ipcRenderer.invoke("api:reports:getDashboardStats", args),
    getSalesTrend: (args) => ipcRenderer.invoke("api:reports:getSalesTrend", args),
  },
  database: {
    clearData: (args) => ipcRenderer.invoke("api:database:clearData", args),
  },
  settings: {
    getBusinessProfile: () => ipcRenderer.invoke("api:settings:getBusinessProfile"),
    setBusinessProfile: (args) => ipcRenderer.invoke("api:settings:setBusinessProfile", args),
  },
  sync: {
    getStatus: () => ipcRenderer.invoke("sync:getStatus"),
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    setSettings: (settings) => ipcRenderer.invoke("sync:setSettings", settings),
    getSettings: () => ipcRenderer.invoke("sync:getSettings"),
    saveSettings: (settings) => ipcRenderer.invoke("sync:saveSettings", settings),
    testConnection: () => ipcRenderer.invoke("sync:testConnection"),
    onStatusChanged: (callback) => ipcRenderer.on("sync:status-changed", (event, status) => callback(status)),
  },
  system: {
    getInfo: () => ipcRenderer.invoke("system:getInfo"),
    openLogFile: () => ipcRenderer.invoke("system:openLogFile"),
  },
  license: {
    getStatus: () => ipcRenderer.invoke("license:getStatus"),
    activate: (key) => ipcRenderer.invoke("license:activate", key),
  }
});
