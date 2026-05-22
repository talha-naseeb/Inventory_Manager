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
};

function toOrderPayload(payload) {
  const { items, ...order } = payload;
  return order;
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
  }));
}

function prepareSyncOperation({ actionType, entityId, payload }) {
  const table = TABLE_BY_ACTION[actionType];
  if (!table) return null;

  const operation = actionType.endsWith("_DELETE") ? "delete" : "upsert";
  const preparedPayload = actionType === "ORDER_CREATE" ? toOrderPayload(payload) : payload;

  return {
    actionType,
    table,
    entityId,
    operation,
    payload: preparedPayload,
    related: actionType === "ORDER_CREATE"
      ? [{ table: "order_items", operation: "upsert", payload: toOrderItems(payload) }]
      : [],
  };
}

module.exports = { TABLE_BY_ACTION, prepareSyncOperation, toOrderItems, toOrderPayload };
