const TABLE_BY_ACTION = {
  PRODUCT_UPSERT: "products",
  PRODUCT_DELETE: "products",
  ORDER_CREATE: "orders",
  ORDER_UPDATE: "orders",
  ORDER_RETURN: "returns",
  CUSTOMER_CREATE: "customers",
  CUSTOMER_UPDATE: "customers",
  CUSTOMER_DELETE: "customers",
  BRAND_UPSERT: "brands",
  BRAND_CREATE: "brands",
  BRAND_UPDATE: "brands",
  BRAND_DELETE: "brands",
  INVENTORY_ADJUST: "inventory_logs",
  CUSTOMER_CREDIT_LOG: "customer_credit_logs",
  SUPPLIER_UPSERT: "suppliers",
  SUPPLIER_DELETE: "suppliers",
  PO_CREATE: "purchase_orders",
  PO_UPDATE: "purchase_orders",
};

const TABLE_COLUMNS = {
  brands: ["id", "store_id", "name", "description", "logo", "created_at"],
  products: ["id", "store_id", "name", "description", "sku", "brand_id", "price", "wholesale_price", "cost_price", "image", "stock", "unit", "meters_per_unit", "hsn_code", "tax_rate", "created_at"],
  customers: ["id", "store_id", "name", "phone", "email", "address", "store_credit_balance", "created_at"],
  orders: ["id", "store_id", "customer_id", "customer_name", "subtotal", "discount", "tax", "total", "payment_method", "store_credit_used", "status", "staff_id", "original_order_id", "returned_items_json", "created_at"],
  returns: ["id", "store_id", "order_id", "replacement_order_id", "return_value", "items_json", "status", "balance_outcome", "amount_due", "remaining_balance", "created_at"],
  inventory_logs: ["id", "store_id", "product_id", "action_type", "quantity", "previous_stock", "current_stock", "reason", "staff_id", "created_at"],
  customer_credit_logs: ["id", "store_id", "customer_id", "source_type", "source_id", "order_id", "amount", "balance_after", "note", "created_at"],
  suppliers: ["id", "store_id", "name", "contact_person", "phone", "email", "address", "version", "created_at"],
  purchase_orders: ["id", "store_id", "supplier_id", "status", "total_amount", "reference_number", "notes", "received_at", "version", "created_at"],
  purchase_order_items: ["id", "store_id", "purchase_order_id", "product_id", "name", "sku", "cost_price", "quantity", "total_cost", "created_at"],
  order_items: ["id", "store_id", "order_id", "product_id", "name", "price", "quantity", "total", "price_type", "unit", "tax_rate", "tax_amount", "created_at"],
};

const CAMEL_TO_SNAKE = {
  brandId: "brand_id",
  costPrice: "cost_price",
  currentStock: "current_stock",
  customerId: "customer_id",
  customerName: "customer_name",
  itemsJson: "items_json",
  metersPerUnit: "meters_per_unit",
  originalOrderId: "original_order_id",
  paymentMethod: "payment_method",
  previousStock: "previous_stock",
  priceType: "price_type",
  replacementOrderId: "replacement_order_id",
  returnedItemsJson: "returned_items_json",
  returnValue: "return_value",
  sourceId: "source_id",
  sourceType: "source_type",
  staffId: "staff_id",
  storeCreditBalance: "store_credit_balance",
  storeCreditUsed: "store_credit_used",
  storeId: "store_id",
  wholesalePrice: "wholesale_price",
  contactPerson: "contact_person",
  supplierId: "supplier_id",
  totalAmount: "total_amount",
  referenceNumber: "reference_number",
  receivedAt: "received_at",
  purchaseOrderId: "purchase_order_id",
  productId: "product_id",
  totalCost: "total_cost",
  hsnCode: "hsn_code",
  taxRate: "tax_rate",
  taxAmount: "tax_amount",
};

function normalizePayloadForTable(table, payload = {}) {
  const allowed = new Set(TABLE_COLUMNS[table] || []);
  const normalized = {};

  for (const [key, value] of Object.entries(payload || {})) {
    const column = CAMEL_TO_SNAKE[key] || key;
    if (!allowed.has(column) || value === undefined) continue;
    normalized[column] = value;
  }

  return normalized;
}

function toOrderPayload(payload) {
  return normalizePayloadForTable("orders", payload);
}

function toOrderItems(payload) {
  if (!Array.isArray(payload.items)) return [];
  return payload.items.map((item) => ({
    id: item.id && !String(item.id).includes("-retail") && !String(item.id).includes("-wholesale") ? item.id : `${payload.id}-${item.productId || item.product_id || item.name}`,
    store_id: payload.store_id || "default",
    order_id: payload.id,
    product_id: item.product_id || item.productId || null,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: item.total,
    price_type: item.price_type || item.priceType || "retail",
    unit: item.unit || null,
    tax_rate: item.tax_rate || item.taxRate || 0,
    tax_amount: item.tax_amount || item.taxAmount || 0,
  }));
}

function toPOPayload(payload) {
  return normalizePayloadForTable("purchase_orders", payload);
}

function toPOItems(payload) {
  if (!Array.isArray(payload.items)) return [];
  return payload.items.map((item) => ({
    id: item.id || `${payload.id}-${item.productId || item.product_id || item.name}`,
    store_id: payload.store_id || "default",
    purchase_order_id: payload.id,
    product_id: item.product_id || item.productId || null,
    name: item.name,
    sku: item.sku || null,
    cost_price: item.cost_price || item.costPrice || 0,
    quantity: item.quantity,
    total_cost: item.total_cost || item.totalCost || 0,
  }));
}

function prepareSyncOperation({ actionType, entityId, payload }) {
  const table = TABLE_BY_ACTION[actionType];
  if (!table) return null;

  const operation = actionType.endsWith("_DELETE") ? "delete" : "upsert";
  
  let preparedPayload;
  if (actionType === "ORDER_CREATE" || actionType === "ORDER_UPDATE") {
    preparedPayload = toOrderPayload(payload);
  } else if (actionType === "PO_CREATE" || actionType === "PO_UPDATE") {
    preparedPayload = toPOPayload(payload);
  } else {
    preparedPayload = normalizePayloadForTable(table, payload);
  }

  const storeId = preparedPayload.store_id || payload?.store_id || "default";

  const related = [];
  if (actionType === "ORDER_CREATE") {
    related.push({ table: "order_items", operation: "upsert", payload: toOrderItems(payload) });
  } else if (actionType === "PO_CREATE") {
    related.push({ table: "purchase_order_items", operation: "upsert", payload: toPOItems(payload) });
  }

  return {
    actionType,
    table,
    entityId,
    operation,
    storeId,
    payload: preparedPayload,
    related,
  };
}

module.exports = {
  TABLE_BY_ACTION,
  normalizePayloadForTable,
  prepareSyncOperation,
  toOrderItems,
  toOrderPayload,
};
