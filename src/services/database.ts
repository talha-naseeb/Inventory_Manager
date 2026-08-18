export interface DbResponse {
  changes?: number;
  lastInsertRowid?: number | string;
}

import type { ActivityLog, Customer, Order } from "../types";

type CustomerInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

type CustomerOrder = {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  items_summary: string;
};

type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  activeProducts: number;
  totalCustomers: number;
};

type SalesTrendPoint = {
  date: string;
  sales: number;
  orders: number;
};

type BrandSalesPoint = {
  brandName: string;
  orderCount: number;
  revenue: number;
};

type TopProductPoint = {
  productName: string;
  totalSold: number;
  revenue: number;
};

type BusinessProfileSettings = {
  businessType: string;
  customStockUnit: string;
};

export const dbService = {
  // Keep generic helpers for older screens that still rely on raw SQL IPC.
  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!window.electronAPI?.invoke) return [];
    return window.electronAPI.invoke("db:query", sql, params) as Promise<T[]>;
  },

  async execute(sql: string, params: unknown[] = []): Promise<DbResponse> {
    if (!window.electronAPI?.invoke) return {};
    return window.electronAPI.invoke("db:execute", sql, params) as Promise<DbResponse>;
  },

  async getOne<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    if (!window.electronAPI?.invoke) return undefined;
    return window.electronAPI.invoke("db:getOne", sql, params) as Promise<T | undefined>;
  },

  async seed(mockProducts: Array<Record<string, any>>) {
    if (!window.electronAPI?.invoke) return;

    const productsCount = await this.getOne<{ count: number }>("SELECT COUNT(*) as count FROM products");
    if (!productsCount || productsCount.count !== 0) return;

    const brands = [...new Set(mockProducts.map((product) => product.category).filter(Boolean))];
    const brandMap = new Map<string, string>();

    for (const brandName of brands) {
      const id = crypto.randomUUID();
      await this.execute("INSERT OR IGNORE INTO brands (id, name) VALUES (?, ?)", [id, brandName]);
      const existingBrand = await this.getOne<{ id: string }>("SELECT id FROM brands WHERE name = ?", [brandName]);
      brandMap.set(brandName, existingBrand?.id || id);
    }

    for (const product of mockProducts) {
      await this.execute(
        `INSERT INTO products (id, name, description, sku, brand_id, price, wholesale_price, cost_price, image, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.description || "Fresh quality item.",
          product.sku,
          brandMap.get(product.category),
          product.price,
          product.wholesalePrice,
          product.costPrice || 0,
          product.image,
          100,
        ],
      );
    }
  },

  async enqueueSync(actionType: string, entityId: string, payload: Record<string, unknown>, baseVersion?: Record<string, unknown>) {
    try {
      const id = crypto.randomUUID();
      const payloadStoreId = typeof payload.store_id === "string" && payload.store_id.trim()
        ? payload.store_id.trim()
        : this.getStoreId();
      
      // Include base version for conflict detection
      const baseVersionJson = baseVersion ? JSON.stringify(baseVersion) : null;
      
      await this.execute(
        `INSERT INTO sync_queue (id, store_id, action_type, entity_id, payload_json, status, base_version_json, conflict_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, payloadStoreId, actionType, entityId, JSON.stringify({ ...payload, store_id: payloadStoreId }), "PENDING", baseVersionJson, "none"],
      );
      return id;
    } catch (error) {
      console.error("Failed to enqueue sync:", error);
      return null;
    }
  },

  async getBusinessProfileSettings(): Promise<BusinessProfileSettings> {
    if (!window.electronAPI?.settings?.getBusinessProfile) {
      return { businessType: "general", customStockUnit: "" };
    }
    return window.electronAPI.settings.getBusinessProfile();
  },

  async saveBusinessProfileSettings(settings: BusinessProfileSettings): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI?.settings?.setBusinessProfile) {
      return { success: false, error: "Settings API unavailable" };
    }
    return window.electronAPI.settings.setBusinessProfile(settings);
  },

  async searchProducts(search: string, category: string): Promise<any[]> {
    if (!window.electronAPI?.products) return [];
    const storeId = this.getStoreId();
    return window.electronAPI.products.search({ search, category, store_id: storeId });
  },

  async getProductBySku(sku: string): Promise<any> {
    if (!window.electronAPI?.products) return null;
    const storeId = this.getStoreId();
    return window.electronAPI.products.getBySku({ sku, store_id: storeId });
  },

  async upsertProduct(product: Record<string, unknown>): Promise<any> {
    if (!window.electronAPI?.products) return null;
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    let baseVersion: Record<string, unknown> | undefined;
    const existingId = product.id as string;
    if (existingId) {
      const existing = await this.query("SELECT * FROM products WHERE id = ? AND store_id = ?", [existingId, storeId]);
      if (existing.length > 0) baseVersion = existing[0];
    }
    
    const id = await window.electronAPI.products.upsert({ product, store_id: storeId });
    await this.enqueueSync("PRODUCT_UPSERT", String(id || product.id), { ...product, id: id || product.id, store_id: storeId }, baseVersion);
    return id;
  },

  async deleteProduct(id: string): Promise<any> {
    if (!window.electronAPI?.products) return null;
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    const existing = await this.query("SELECT * FROM products WHERE id = ? AND store_id = ?", [id, storeId]);
    const baseVersion = existing.length > 0 ? existing[0] : undefined;
    
    const result = await window.electronAPI.products.delete({ id, store_id: storeId });
    await this.enqueueSync("PRODUCT_DELETE", id, { id, store_id: storeId }, baseVersion);
    return result;
  },

  async searchCustomers(search: string): Promise<Customer[]> {
    if (!window.electronAPI?.customers) return [];
    const storeId = this.getStoreId();
    return window.electronAPI.customers.search({ search, store_id: storeId }) as Promise<Customer[]>;
  },

  async getCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
    if (!window.electronAPI?.customers) return [];
    const storeId = this.getStoreId();
    return window.electronAPI.customers.getOrders({ customerId, store_id: storeId }) as Promise<CustomerOrder[]>;
  },

  async createCustomer(customer: Record<string, unknown>): Promise<any> {
    if (!window.electronAPI?.customers) return null;
    const storeId = this.getStoreId();
    const id = await window.electronAPI.customers.create({ customer, store_id: storeId });
    if (id) {
      await this.enqueueSync("CUSTOMER_CREATE", String(id), { ...customer, id, store_id: storeId }, undefined); // No base version for creates
    }
    return id;
  },

  async updateCustomer(id: string, customer: CustomerInput) {
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    const existing = await this.query("SELECT * FROM customers WHERE id = ? AND store_id = ?", [id, storeId]);
    const baseVersion = existing.length > 0 ? existing[0] : undefined;
    
    const result = await this.execute("UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=? AND store_id=?", [customer.name, customer.phone, customer.email, customer.address, id, storeId]);
    await this.enqueueSync("CUSTOMER_UPDATE", id, { id, ...customer, store_id: storeId }, baseVersion);
    return result;
  },

  async deleteCustomer(id: string) {
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    const existing = await this.query("SELECT * FROM customers WHERE id = ? AND store_id = ?", [id, storeId]);
    const baseVersion = existing.length > 0 ? existing[0] : undefined;
    
    const result = await this.execute("DELETE FROM customers WHERE id=? AND store_id=?", [id, storeId]);
    await this.enqueueSync("CUSTOMER_DELETE", id, { id, store_id: storeId }, baseVersion);
    return result;
  },

  async getAllStaff(): Promise<any[]> {
    if (!window.electronAPI?.staff?.getAll) return [];
    const storeId = this.getStoreId();
    return window.electronAPI.staff.getAll(storeId);
  },

  async getBrands(): Promise<any[]> {
    if (window.electronAPI?.brands) {
      const storeId = this.getStoreId();
      return window.electronAPI.brands.getAll(storeId);
    }
    return this.query("SELECT * FROM brands");
  },

  async createBrand(name: string, description?: string | null): Promise<string> {
    if (!window.electronAPI?.brands) throw new Error("Brands API not available");
    const storeId = this.getStoreId();
    const brandData = { name, description: description || null, store_id: storeId };
    const id = await window.electronAPI.brands.create(brandData);
    await this.enqueueSync("BRAND_UPSERT", id, { id, ...brandData }, undefined); // No base for creates
    return id;
  },

  async deleteBrand(id: string): Promise<any> {
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    const existing = await this.query("SELECT * FROM brands WHERE id = ? AND store_id = ?", [id, storeId]);
    const baseVersion = existing.length > 0 ? existing[0] : undefined;
    
    const result = await this.execute("DELETE FROM brands WHERE id = ? AND store_id = ?", [id, storeId]);
    await this.enqueueSync("BRAND_DELETE", id, { id, store_id: storeId }, baseVersion);
    return result;
  },

  async updateBrand(id: string, data: { name: string; description?: string | null }): Promise<any> {
    const storeId = this.getStoreId();
    
    // Fetch current version for conflict detection
    const existing = await this.query("SELECT * FROM brands WHERE id = ? AND store_id = ?", [id, storeId]);
    const baseVersion = existing.length > 0 ? existing[0] : undefined;
    
    const result = await this.execute("UPDATE brands SET name = ?, description = ? WHERE id = ? AND store_id = ?", [data.name, data.description || null, id, storeId]);
    await this.enqueueSync("BRAND_UPSERT", id, { id, name: data.name, description: data.description || null, store_id: storeId }, baseVersion);
    return result;
  },

  async createOrder(orderData: Record<string, unknown>): Promise<any> {
    if (!window.electronAPI?.orders) throw new Error("Electron API (Orders) not found");
    const storeId = this.getStoreId();
    const result = await window.electronAPI.orders.create({ ...orderData, store_id: storeId });
    if (result?.id) {
      await this.enqueueSync("ORDER_CREATE", result.id, { ...orderData, id: result.id, store_id: storeId });
    }
    return result;
  },

  async recordReturn(returnData: { orderId: string; value: number; items: Array<Record<string, unknown>>; status?: string }): Promise<any> {
    if (!window.electronAPI?.returns) throw new Error("Electron API (Returns) not found");
    const storeId = this.getStoreId();
    const id = crypto.randomUUID();
    const result = await window.electronAPI.returns.create({ ...returnData, id, storeId });
    if (result?.success) {
      await this.enqueueSync("ORDER_RETURN", id, {
        id,
        store_id: storeId,
        order_id: returnData.orderId,
        return_value: result.value ?? returnData.value,
        items_json: JSON.stringify(returnData.items),
        status: returnData.status || "completed",
      });
      for (const log of result.inventoryLogs || []) {
        await this.enqueueSync("INVENTORY_ADJUST", String(log.id), log);
      }
      await this.enqueueSync("ORDER_UPDATE", returnData.orderId, {
        id: returnData.orderId,
        store_id: storeId,
        status: "returned",
      });
    }
    return result;
  },

  async finalizeExchange(exchangeData: Record<string, unknown>): Promise<any> {
    if (!window.electronAPI?.exchanges) throw new Error("Electron API (Exchanges) not found");
    const storeId = this.getStoreId();
    const result = await window.electronAPI.exchanges.finalize({ ...exchangeData, storeId });

    if (result?.success) {
      await this.enqueueSync("ORDER_RETURN", String(result.returnId), {
        id: result.returnId,
        store_id: storeId,
        order_id: exchangeData.originalOrderId,
        return_value: exchangeData.returnCredit,
        replacement_order_id: result.replacementOrderId,
        balance_outcome: result.balanceOutcome,
        amount_due: result.amountDue,
        remaining_balance: result.remainingBalance,
        items_json: JSON.stringify(exchangeData.returnedItems || []),
        status: "completed",
      });
      await this.enqueueSync("ORDER_CREATE", String(result.replacementOrderId), {
        id: result.replacementOrderId,
        store_id: storeId,
        original_order_id: exchangeData.originalOrderId,
        items: exchangeData.replacementItems,
        store_credit_used: exchangeData.storeCreditUsed,
      });
      for (const log of result.inventoryLogs || []) {
        await this.enqueueSync("INVENTORY_ADJUST", String(log.id), log);
      }
      if (result.customerCreditLog?.id) {
        await this.enqueueSync("CUSTOMER_CREDIT_LOG", String(result.customerCreditLog.id), result.customerCreditLog);
      }
    }

    return result;
  },

  async getOrders(filters: Record<string, unknown> = {}, limit = 50, offset = 0): Promise<Order[]> {
    if (!window.electronAPI?.orders) return [];
    const storeId = this.getStoreId();
    const rows = (await window.electronAPI.orders.list({ ...filters, limit, offset, store_id: storeId })) as Array<Record<string, any>>;

    return rows.map((order) => ({
      id: order.id,
      customerId: order.customerId ?? order.customer_id,
      customerName: order.customerName ?? order.customer_name,
      items: Array.from({ length: Number(order.itemCount ?? order.item_count ?? 0) }, () => ({} as Order["items"][number])),
      subtotal: Number(order.subtotal ?? 0),
      discount: Number(order.discount ?? 0),
      tax: Number(order.tax ?? 0),
      total: Number(order.total ?? 0),
      paymentMethod: order.paymentMethod ?? order.payment_method ?? "cash",
      status: order.status ?? "completed",
      createdAt: order.createdAt ?? order.created_at ?? new Date().toISOString(),
      originalOrderId: order.originalOrderId ?? order.original_order_id ?? null,
    }));
  },

  async getRecentOrders(limit = 10): Promise<Order[]> {
    return this.getOrders({}, limit, 0);
  },

  async getDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
    if (window.electronAPI?.reports) {
      const storeId = this.getStoreId();
      return window.electronAPI.reports.getDashboardStats({ startDate, endDate, store_id: storeId }) as Promise<DashboardStats>;
    }

    const dateFilter = startDate && endDate ? "WHERE created_at BETWEEN ? AND ?" : "";
    const params = startDate && endDate ? [startDate, endDate] : [];
    const [revenue, ordersCount, productsCount, customersCount] = await Promise.all([
      this.getOne<{ total: number }>(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${dateFilter}`, params),
      this.getOne<{ count: number }>(`SELECT COUNT(*) as count FROM orders ${dateFilter}`, params),
      this.getOne<{ count: number }>("SELECT COUNT(*) as count FROM products"),
      this.getOne<{ count: number }>("SELECT COUNT(*) as count FROM customers"),
    ]);

    return {
      totalRevenue: revenue?.total || 0,
      totalOrders: ordersCount?.count || 0,
      activeProducts: productsCount?.count || 0,
      totalCustomers: customersCount?.count || 0,
    };
  },

  async getSalesTrend(startDate?: string, endDate?: string): Promise<SalesTrendPoint[]> {
    if (window.electronAPI?.reports) {
      const storeId = this.getStoreId();
      return window.electronAPI.reports.getSalesTrend({ startDate, endDate, store_id: storeId }) as Promise<SalesTrendPoint[]>;
    }

    const dateFilter = startDate && endDate ? "WHERE created_at BETWEEN ? AND ?" : "";
    const params = startDate && endDate ? [startDate, endDate] : [];
    return this.query<SalesTrendPoint>(
      `SELECT
        strftime('%Y-%m-%d', created_at) as date,
        SUM(total) as sales,
        COUNT(id) as orders
       FROM orders
       ${dateFilter}
       GROUP BY date
       ORDER BY date ASC`,
      params,
    );
  },

  async getSalesByBrand(startDate?: string, endDate?: string): Promise<BrandSalesPoint[]> {
    const dateFilter = startDate && endDate ? "WHERE o.created_at BETWEEN ? AND ?" : "";
    const params = startDate && endDate ? [startDate, endDate] : [];

    return this.query<BrandSalesPoint>(
      `SELECT
        b.name as brandName,
        COUNT(DISTINCT o.id) as orderCount,
        SUM(oi.total) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ${dateFilter}
       GROUP BY b.id, b.name
       ORDER BY revenue DESC`,
      params,
    );
  },

  async getTopProducts(limit = 10, startDate?: string, endDate?: string): Promise<TopProductPoint[]> {
    const dateFilter = startDate && endDate ? "WHERE o.created_at BETWEEN ? AND ?" : "";
    const params = startDate && endDate ? [startDate, endDate, limit] : [limit];

    return this.query<TopProductPoint>(
      `SELECT
        oi.name as productName,
        SUM(oi.quantity) as totalSold,
        SUM(oi.total) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       ${dateFilter}
       GROUP BY oi.product_id, oi.name
       ORDER BY totalSold DESC
       LIMIT ?`,
      params,
    );
  },

  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    return this.getAllActivity(limit, 0);
  },

  async getAllActivity(limit = 100, offset = 0): Promise<ActivityLog[]> {
    return this.query<ActivityLog>(
      `
      SELECT * FROM (
        SELECT
          l.id,
          s.name as user,
          l.action,
          'System' as target,
          l.created_at as timestamp,
          'auth' as type
        FROM login_logs l
        LEFT JOIN staff s ON l.staff_id = s.id

        UNION ALL

        SELECT
          o.id,
          COALESCE(s.name, 'Unknown') as user,
          'Order #' || SUBSTR(o.id, 1, 8) as action,
          o.customer_name as target,
          o.created_at as timestamp,
          'order' as type
        FROM orders o
        LEFT JOIN staff s ON o.staff_id = s.id

        UNION ALL

        SELECT
          il.id,
          COALESCE(s.name, 'System') as user,
          il.action_type || ' (' || il.quantity || ')' as action,
          p.name as target,
          il.created_at as timestamp,
          'stock' as type
        FROM inventory_logs il
        LEFT JOIN staff s ON il.staff_id = s.id
        LEFT JOIN products p ON il.product_id = p.id
      )
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset],
    );
  },

  async getActivityCount(): Promise<number> {
    const result = await this.query<{ count: number }>(
      `
      SELECT COUNT(*) as count FROM (
        SELECT id FROM login_logs
        UNION ALL
        SELECT id FROM orders
        UNION ALL
        SELECT id FROM inventory_logs
      )
      `,
    );
    return result[0]?.count || 0;
  },

  async getOrderDetails(orderId: string): Promise<Order | null> {
    const order = await this.getOne<Order>(
      `SELECT
        o.id,
        o.customer_name as customerName,
        o.total,
        o.status,
        o.created_at as createdAt,
        o.subtotal,
        o.discount,
        o.tax,
        o.payment_method as paymentMethod,
        o.store_credit_used as storeCreditUsed,
        o.original_order_id as originalOrderId,
        o.returned_items_json as returnedItemsJson
       FROM orders o
       WHERE o.id = ?`,
      [orderId],
    );

    if (!order) return null;

    const items = await this.query<Order["items"][number]>(
      `SELECT
        oi.id,
        oi.product_id as productId,
        COALESCE(oi.name, p.name, 'Unknown Item') as name,
        oi.price,
        oi.quantity,
        oi.total,
        oi.unit,
        oi.price_type as priceType,
        p.sku
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId],
    );

    const returnedItems = (() => {
      try {
        const raw = (order as any).returnedItemsJson;
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    })();

    return { ...order, items, returnedItems };
  },

  async clearInventory(staffId?: string) {
    if (window.electronAPI?.database?.clearData) {
      return window.electronAPI.database.clearData({ type: "inventory", store_id: this.getStoreId(), staff_id: staffId });
    }
    return { success: false, error: "Database maintenance API unavailable" };
  },

  async clearSales(staffId?: string) {
    if (window.electronAPI?.database?.clearData) {
      return window.electronAPI.database.clearData({ type: "sales", store_id: this.getStoreId(), staff_id: staffId });
    }
    return { success: false, error: "Database maintenance API unavailable" };
  },

  async clearCustomers(staffId?: string) {
    if (window.electronAPI?.database?.clearData) {
      return window.electronAPI.database.clearData({ type: "customers", store_id: this.getStoreId(), staff_id: staffId });
    }
    return { success: false, error: "Database maintenance API unavailable" };
  },

  async factoryReset(staffId?: string) {
    if (window.electronAPI?.database?.clearData) {
      return window.electronAPI.database.clearData({ type: "full", store_id: this.getStoreId(), staff_id: staffId });
    }
    return { success: false, error: "Database maintenance API unavailable" };
  },

  async backup() {
    if (window.electronAPI?.database?.backup) {
      return window.electronAPI.database.backup();
    }
    return { success: false, error: "Backup API unavailable" };
  },

  async restore() {
    if (window.electronAPI?.database?.restore) {
      return window.electronAPI.database.restore();
    }
    return { success: false, error: "Restore API unavailable" };
  },

  getStoreId() {
    try {
      const auth = JSON.parse(localStorage.getItem("auth-storage") || "{}");
      return auth.state?.storeId || "default";
    } catch {
      return "default";
    }
  },
};
