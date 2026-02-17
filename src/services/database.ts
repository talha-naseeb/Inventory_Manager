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
};
