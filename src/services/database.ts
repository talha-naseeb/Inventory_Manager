export interface DbResponse {
  changes?: number;
  lastInsertRowid?: number | string;
}

export const dbService = {
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!window.electronAPI) {
      console.warn("Electron API not found. Are you running in a browser?");
      return [];
    }
    return window.electronAPI.invoke("db:query", sql, params);
  },

  async execute(sql: string, params: any[] = []): Promise<DbResponse> {
    if (!window.electronAPI) {
      console.warn("Electron API not found. Are you running in a browser?");
      return {};
    }
    return window.electronAPI.invoke("db:execute", sql, params);
  },

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!window.electronAPI) {
      console.warn("Electron API not found.");
      return undefined;
    }
    return window.electronAPI.invoke("db:getOne", sql, params);
  },

  /**
   * Seed the database with initial mock data if empty
   */
  async seed(mockProducts: any[]) {
    const productsCount = await this.getOne("SELECT COUNT(*) as count FROM products");

    if (productsCount && productsCount.count === 0) {
      console.log("Seeding database with mock data...");

      // Seed Categories first
      const categories = [...new Set(mockProducts.map((p) => p.category))];
      const categoryMap = new Map();

      for (const catName of categories) {
        const id = crypto.randomUUID();
        await this.execute("INSERT INTO categories (id, name) VALUES (?, ?)", [id, catName]);
        categoryMap.set(catName, id);
      }

      // Seed Products
      for (const p of mockProducts) {
        await this.execute(
          `INSERT INTO products (id, name, description, sku, category_id, price, wholesale_price, cost_price, image, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, // Using existing IDs for consistency during transition
            p.name,
            p.description || "Fresh quality item.",
            p.sku,
            categoryMap.get(p.category),
            p.price,
            p.wholesalePrice,
            p.costPrice || 0,
            p.image,
            100, // Default stock
          ],
        );
      }

      console.log("Seeding completed.");
    }
  },

  /**
   * Enqueue a task for synchronization to the cloud
   */
  async enqueueSync(actionType: string, entityId: string, payload: any) {
    try {
      const id = crypto.randomUUID();
      const payload_json = JSON.stringify(payload);
      await this.execute("INSERT INTO sync_queue (id, action_type, entity_id, payload_json, status) VALUES (?, ?, ?, ?, ?)", [id, actionType, entityId, payload_json, "PENDING"]);
      console.log(`Sync enqueued: ${actionType} for ${entityId}`);
      return id;
    } catch (error) {
      console.error("Failed to enqueue sync:", error);
      return null;
    }
  },

  // ============ REPORTING QUERIES ============

  /**
   * Get dashboard statistics for a date range
   */
  async getDashboardStats(startDate?: string, endDate?: string) {
    const dateFilter = startDate && endDate ? `WHERE created_at BETWEEN ? AND ?` : "";
    const params = startDate && endDate ? [startDate, endDate] : [];

    const [revenue, ordersCount, productsCount] = await Promise.all([
      this.getOne<{ total: number }>(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${dateFilter}`, params),
      this.getOne<{ count: number }>(`SELECT COUNT(*) as count FROM orders ${dateFilter}`, params),
      this.getOne<{ count: number }>("SELECT COUNT(*) as count FROM products"),
    ]);

    return {
      totalRevenue: revenue?.total || 0,
      totalOrders: ordersCount?.count || 0,
      activeProducts: productsCount?.count || 0,
    };
  },

  /**
   * Get recent orders with limit
   */
  async getRecentOrders(limit = 10) {
    return this.query(
      `SELECT id, customer_name as customerName, total, status, payment_method as paymentMethod, created_at as createdAt 
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [limit],
    );
  },

  /**
   * Get sales by brand for a date range
   */
  async getSalesByBrand(startDate?: string, endDate?: string) {
    const dateFilter = startDate && endDate ? `WHERE o.created_at BETWEEN ? AND ?` : "";
    const params = startDate && endDate ? [startDate, endDate] : [];

    return this.query(
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

  /**
   * Get top selling products
   */
  async getTopProducts(limit = 10, startDate?: string, endDate?: string) {
    const dateFilter = startDate && endDate ? `WHERE o.created_at BETWEEN ? AND ?` : "";
    const params = startDate && endDate ? [...(startDate && endDate ? [startDate, endDate] : []), limit] : [limit];

    return this.query(
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
};
