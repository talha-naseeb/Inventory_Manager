const { contextBridge, ipcRenderer } = require("electron");

const call = (channel, payload) => ipcRenderer.invoke(channel, payload);
const callEmpty = (channel) => ipcRenderer.invoke(channel);
function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("electronAPI", {
  auth: {
    getBootstrapState: () => callEmpty("auth:getBootstrapState"),
    login: (payload) => call("auth:login", payload),
    enrollOwner: (payload) => call("auth:enrollOwner", payload),
    getSession: () => callEmpty("auth:getSession"),
    logout: () => callEmpty("auth:logout"),
  },
  products: {
    search: (payload) => call("products:search", payload),
    getBySku: (payload) => call("products:getBySku", payload),
    getRolls: (payload) => call("products:getRolls", payload),
    list: (payload) => call("products:list", payload),
    upsert: (payload) => call("products:upsert", payload),
    delete: (payload) => call("products:delete", payload),
    bulkImport: (payload) => call("products:bulkImport", payload),
  },
  customers: {
    search: (payload) => call("customers:search", payload),
    getOrders: (payload) => call("customers:getOrders", payload),
    create: (payload) => call("customers:create", payload),
    update: (payload) => call("customers:update", payload),
    delete: (payload) => call("customers:delete", payload),
  },
  brands: {
    list: () => callEmpty("brands:list"),
    listWithCounts: () => callEmpty("brands:listWithCounts"),
    create: (payload) => call("brands:create", payload),
    update: (payload) => call("brands:update", payload),
    delete: (payload) => call("brands:delete", payload),
  },
  orders: {
    list: (payload) => call("orders:list", payload),
    getDetails: (payload) => call("orders:getDetails", payload),
    getReturns: (payload) => call("orders:getReturns", payload),
    create: (payload) => call("orders:create", payload),
  },
  returns: { create: (payload) => call("returns:create", payload) },
  exchanges: { finalize: (payload) => call("exchanges:finalize", payload) },
  inventory: { adjustStock: (payload) => call("inventory:adjustStock", payload) },
  reports: {
    getDashboardStats: (payload) => call("reports:getDashboardStats", payload),
    getSalesTrend: (payload) => call("reports:getSalesTrend", payload),
    getSalesByBrand: (payload) => call("reports:getSalesByBrand", payload),
    getTopProducts: (payload) => call("reports:getTopProducts", payload),
    getSalesSummary: (payload) => call("reports:getSalesSummary", payload),
    getStaffSales: (payload) => call("reports:getStaffSales", payload),
  },
  activity: {
    list: (payload) => call("activity:list", payload),
    count: () => callEmpty("activity:count"),
  },
  procurement: {
    listSuppliers: () => callEmpty("procurement:listSuppliers"),
    upsertSupplier: (payload) => call("procurement:upsertSupplier", payload),
    listOrders: () => callEmpty("procurement:listOrders"),
    getItems: (payload) => call("procurement:getItems", payload),
    saveOrder: (payload) => call("procurement:saveOrder", payload),
    receiveOrder: (payload) => call("procurement:receiveOrder", payload),
  },
  staff: {
    list: () => callEmpty("staff:list"),
    create: (payload) => call("staff:create", payload),
    update: (payload) => call("staff:update", payload),
    delete: (payload) => call("staff:delete", payload),
  },
  files: { selectProductImage: () => callEmpty("files:selectProductImage") },
  database: {
    clear: (payload) => call("database:clear", payload),
    backup: () => callEmpty("database:backup"),
    restore: () => callEmpty("database:restore"),
  },
  settings: {
    getBusinessProfile: () => callEmpty("settings:getBusinessProfile"),
    setBusinessProfile: (payload) => call("settings:setBusinessProfile", payload),
  },
  sync: {
    getStatus: () => callEmpty("sync:getStatus"),
    trigger: () => callEmpty("sync:trigger"),
    getSettings: () => callEmpty("sync:getSettings"),
    saveSettings: (payload) => call("sync:saveSettings", payload),
    testConnection: () => callEmpty("sync:testConnection"),
    onStatusChanged: (callback) => subscribe("sync:status-changed", callback),
    onConflictDetected: (callback) => subscribe("sync:conflict-detected", callback),
    getConflicts: () => callEmpty("sync:getConflicts"),
    resolveConflict: (payload) => call("sync:resolveConflict", payload),
    autoResolveAllConflicts: () => callEmpty("sync:autoResolveAllConflicts"),
  },
  cloud: {
    signIn: (payload) => call("cloud:signIn", payload),
    signOut: () => callEmpty("cloud:signOut"),
    getSession: () => callEmpty("cloud:getSession"),
  },
  system: {
    getInfo: () => callEmpty("system:getInfo"),
    openLogFile: () => callEmpty("system:openLogFile"),
  },
  license: {
    getStatus: () => callEmpty("license:getStatus"),
    activate: (key) => call("license:activate", { key }),
  },
  updates: {
    install: () => callEmpty("update:install"),
    onAvailable: (callback) => subscribe("update-available", callback),
    onProgress: (callback) => subscribe("update-progress", callback),
    onDownloaded: (callback) => subscribe("update-downloaded", callback),
  },
});
