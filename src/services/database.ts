import type { ActivityLog, Customer, Order } from "../types";

type CustomerInput = { name: string; phone: string; email: string; address: string };
type DateRange = { startDate?: string; endDate?: string };

function requireApi() {
  if (!window.electronAPI) throw new Error("Desktop application API is unavailable");
  return window.electronAPI;
}

function mapOrder(order: Record<string, any>): Order {
  return {
    id: order.id,
    customerId: order.customerId ?? order.customer_id,
    customerName: order.customerName ?? order.customer_name,
    items: order.items || Array.from({ length: Number(order.itemCount ?? order.item_count ?? 0) }, () => ({} as Order["items"][number])),
    subtotal: Number(order.subtotal ?? 0),
    discount: Number(order.discount ?? 0),
    tax: Number(order.tax ?? 0),
    total: Number(order.total ?? 0),
    paymentMethod: order.paymentMethod ?? order.payment_method ?? "cash",
    status: order.status ?? "completed",
    createdAt: order.createdAt ?? order.created_at ?? new Date().toISOString(),
    originalOrderId: order.originalOrderId ?? order.original_order_id ?? null,
    returnedItems: order.returnedItems,
  };
}

export const dbService = {
  async getBusinessProfileSettings() {
    return requireApi().settings.getBusinessProfile();
  },

  async saveBusinessProfileSettings(settings: { businessType: string; customStockUnit: string }) {
    return requireApi().settings.setBusinessProfile(settings);
  },

  async searchProducts(search: string, category: string) {
    return requireApi().products.search({ search, category });
  },

  async getProductBySku(sku: string) {
    return requireApi().products.getBySku({ sku });
  },

  async getProductRolls(productId: string) {
    return requireApi().products.getRolls({ productId });
  },

  async listProducts(filters: { search?: string; brandId?: string } = {}) {
    return requireApi().products.list(filters);
  },

  async upsertProduct(product: Record<string, unknown>, rolls: Array<Record<string, unknown>> = []) {
    return requireApi().products.upsert({ product, rolls });
  },

  async deleteProduct(id: string) {
    return requireApi().products.delete({ id });
  },

  async bulkImportProducts(products: Array<Record<string, unknown>>) {
    return requireApi().products.bulkImport({ products });
  },

  async searchCustomers(search: string): Promise<Customer[]> {
    return requireApi().customers.search({ search }) as Promise<Customer[]>;
  },

  async getCustomerOrders(customerId: string) {
    return requireApi().customers.getOrders({ customerId });
  },

  async createCustomer(customer: Record<string, unknown>) {
    return requireApi().customers.create({ customer });
  },

  async updateCustomer(id: string, customer: CustomerInput) {
    return requireApi().customers.update({ id, customer });
  },

  async deleteCustomer(id: string) {
    return requireApi().customers.delete({ id });
  },

  async getAllStaff() {
    return requireApi().staff.list();
  },

  async getBrands() {
    return requireApi().brands.list();
  },

  async getBrandsWithCounts() {
    return requireApi().brands.listWithCounts();
  },

  async createBrand(name: string, description?: string | null) {
    return requireApi().brands.create({ name, description: description || null });
  },

  async updateBrand(id: string, data: { name: string; description?: string | null }) {
    return requireApi().brands.update({ id, name: data.name, description: data.description || null });
  },

  async deleteBrand(id: string) {
    return requireApi().brands.delete({ id });
  },

  async adjustStock(productId: string, adjustment: number, reason?: string) {
    return requireApi().inventory.adjustStock({ productId, adjustment, reason });
  },

  async createOrder(orderData: Record<string, unknown>) {
    return requireApi().orders.create(orderData);
  },

  async recordReturn(returnData: { orderId: string; value: number; items: Array<Record<string, unknown>>; status?: string }) {
    return requireApi().returns.create(returnData);
  },

  async finalizeExchange(exchangeData: Record<string, unknown>) {
    return requireApi().exchanges.finalize(exchangeData);
  },

  async getOrders(filters: Record<string, unknown> = {}, limit = 50, offset = 0): Promise<Order[]> {
    const rows = await requireApi().orders.list({ ...filters, limit, offset });
    return rows.map(mapOrder);
  },

  async getRecentOrders(limit = 10) {
    return this.getOrders({}, limit, 0);
  },

  async getOrderDetails(orderId: string): Promise<Order | null> {
    const order = await requireApi().orders.getDetails({ orderId });
    return order ? mapOrder(order) : null;
  },

  async getOrderReturns(orderId: string) {
    return requireApi().orders.getReturns({ orderId });
  },

  async getDashboardStats(startDate?: string, endDate?: string) {
    return requireApi().reports.getDashboardStats({ startDate, endDate });
  },

  async getSalesTrend(startDate?: string, endDate?: string) {
    return requireApi().reports.getSalesTrend({ startDate, endDate });
  },

  async getSalesByBrand(startDate?: string, endDate?: string) {
    return requireApi().reports.getSalesByBrand({ startDate, endDate });
  },

  async getTopProducts(limit = 10, startDate?: string, endDate?: string) {
    return requireApi().reports.getTopProducts({ limit, startDate, endDate });
  },

  async getSalesSummary(startDate?: string, endDate?: string) {
    return requireApi().reports.getSalesSummary({ startDate, endDate });
  },

  async getStaffSales(startDate?: string, endDate?: string) {
    return requireApi().reports.getStaffSales({ startDate, endDate });
  },

  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    return this.getAllActivity(limit, 0);
  },

  async getAllActivity(limit = 100, offset = 0): Promise<ActivityLog[]> {
    return requireApi().activity.list({ limit, offset }) as Promise<ActivityLog[]>;
  },

  async getActivityCount(): Promise<number> {
    return requireApi().activity.count();
  },

  async listSuppliers() {
    return requireApi().procurement.listSuppliers();
  },

  async upsertSupplier(supplier: Record<string, unknown>) {
    return requireApi().procurement.upsertSupplier(supplier);
  },

  async listPurchaseOrders() {
    return requireApi().procurement.listOrders();
  },

  async getPurchaseOrderItems(purchaseOrderId: string) {
    return requireApi().procurement.getItems({ purchaseOrderId });
  },

  async savePurchaseOrder(order: Record<string, unknown>) {
    return requireApi().procurement.saveOrder(order);
  },

  async receivePurchaseOrder(id: string) {
    return requireApi().procurement.receiveOrder({ id });
  },

  async clearInventory() { return requireApi().database.clear({ type: "inventory" }); },
  async clearSales() { return requireApi().database.clear({ type: "sales" }); },
  async clearCustomers() { return requireApi().database.clear({ type: "customers" }); },
  async factoryReset() { return requireApi().database.clear({ type: "full" }); },
  async backup() { return requireApi().database.backup(); },
  async restore() { return requireApi().database.restore(); },
};

export type { DateRange };
