const crypto = require("crypto");
const { normalizeOrderItem } = require("./orderService.cjs");
const { normalizeReturnItem } = require("./returnService.cjs");

function calculateExchangeTotals(returnedItems, replacementItems) {
  const returnCredit = returnedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const newItemsTotal = replacementItems.reduce((sum, item) => sum + Number(item.total || Number(item.quantity || 0) * Number(item.price || 0)), 0);
  return {
    returnCredit,
    newItemsTotal,
    amountDue: Math.max(0, newItemsTotal - returnCredit),
    remainingBalance: Math.max(0, returnCredit - newItemsTotal),
  };
}

async function getReturnableQuantities(db, originalOrderId, storeId) {
  const purchasedRows = await db.all("SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ? AND store_id = ?", [originalOrderId, storeId]);
  if (purchasedRows.length === 0) throw new Error("Original order has no returnable items");

  const previousReturns = await db.all("SELECT items_json FROM returns WHERE order_id = ? AND store_id = ?", [originalOrderId, storeId]);
  const returnable = new Map();

  for (const row of purchasedRows) {
    if (!row.product_id) continue;
    const existing = returnable.get(row.product_id) || { quantity: 0, price: row.price, name: row.name };
    existing.quantity += Number(row.quantity || 0);
    returnable.set(row.product_id, existing);
  }

  for (const returnRow of previousReturns) {
    try {
      const returnedItems = JSON.parse(returnRow.items_json || "[]");
      for (const item of returnedItems) {
        const productId = item.productId || item.product_id;
        if (!productId || !returnable.has(productId)) continue;
        returnable.get(productId).quantity -= Number(item.quantity || 0);
      }
    } catch {
      continue;
    }
  }

  return returnable;
}

async function validateExchange(db, { originalOrderId, storeId, returnedItems, replacementItems, balanceOutcome, customerId }) {
  const returnable = await getReturnableQuantities(db, originalOrderId, storeId);
  const normalizedReturnedItems = returnedItems.map(normalizeReturnItem);
  const normalizedReplacementItems = replacementItems.map((item) => normalizeOrderItem(item, "pending", storeId));
  const totals = calculateExchangeTotals(normalizedReturnedItems, normalizedReplacementItems);

  if (normalizedReturnedItems.length === 0) throw new Error("Exchange must include returned items");
  if (normalizedReplacementItems.length === 0) throw new Error("Exchange must include replacement items");

  for (const item of normalizedReturnedItems) {
    const productId = item.productId;
    const remaining = returnable.get(productId);
    if (!remaining) throw new Error(`Product ${productId} is not returnable for this order`);
    if (item.quantity <= 0) throw new Error("Returned quantity must be greater than zero");
    if (item.quantity > remaining.quantity) throw new Error(`Return quantity exceeds remaining quantity for ${remaining.name}`);
  }

  if (totals.remainingBalance > 0 && balanceOutcome === "store_credit" && !customerId) {
    throw new Error("Store credit requires a saved customer");
  }

  if (totals.remainingBalance > 0 && !["cash_refund", "store_credit"].includes(balanceOutcome)) {
    throw new Error("Remaining balance requires cash refund or store credit outcome");
  }

  const returnedQuantityByProduct = new Map();
  for (const item of normalizedReturnedItems) {
    returnedQuantityByProduct.set(item.productId, (returnedQuantityByProduct.get(item.productId) || 0) + item.quantity);
  }

  for (const item of normalizedReplacementItems) {
    if (!item.product_id) continue;
    const product = await db.get("SELECT stock, name FROM products WHERE id = ? AND store_id = ?", [item.product_id, storeId]);
    if (!product) throw new Error(`Replacement product ${item.product_id} was not found`);
    const availableStock = Number(product.stock || 0) + Number(returnedQuantityByProduct.get(item.product_id) || 0);
    if (item.quantity > availableStock) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  return { normalizedReturnedItems, normalizedReplacementItems, totals };
}

async function finalizeExchange(db, {
  id = crypto.randomUUID(),
  replacementOrderId = crypto.randomUUID(),
  storeId = "default",
  originalOrderId,
  customerId = null,
  customerName = null,
  returnedItems = [],
  replacementItems = [],
  paymentMethod = "cash",
  staffId = null,
  balanceOutcome = "none",
}) {
  const { normalizedReturnedItems, normalizedReplacementItems, totals } = await validateExchange(db, {
    originalOrderId,
    storeId,
    returnedItems,
    replacementItems,
    balanceOutcome,
    customerId,
  });

  const orderItems = normalizedReplacementItems.map((item) => ({
    ...item,
    id: item.id && !String(item.id).includes("-retail") && !String(item.id).includes("-wholesale") ? item.id : crypto.randomUUID(),
    order_id: replacementOrderId,
  }));

  const storeCreditUsed = Math.min(totals.returnCredit, totals.newItemsTotal);
  const effectiveBalanceOutcome = totals.amountDue > 0 ? "extra_paid" : totals.remainingBalance > 0 ? balanceOutcome : "none";
  let customerCreditLog = null;
  const inventoryLogs = [
    ...normalizedReturnedItems.map((item) => ({
      id: crypto.randomUUID(),
      store_id: storeId,
      product_id: item.productId,
      action_type: "exchange_return",
      quantity: item.quantity,
      reason: `Exchange return from Order #${String(originalOrderId).slice(0, 8)}`,
    })),
    ...orderItems.filter((item) => item.product_id).map((item) => ({
      id: crypto.randomUUID(),
      store_id: storeId,
      product_id: item.product_id,
      action_type: "exchange_sale",
      quantity: -item.quantity,
      reason: `Exchange sale for Order #${String(originalOrderId).slice(0, 8)}`,
    })),
  ];

  const ops = [
    {
      sql: `INSERT INTO returns (id, store_id, order_id, return_value, items_json, status, replacement_order_id, balance_outcome, amount_due, remaining_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [id, storeId, originalOrderId, totals.returnCredit, JSON.stringify(normalizedReturnedItems), "completed", replacementOrderId, effectiveBalanceOutcome, totals.amountDue, totals.remainingBalance],
    },
    ...normalizedReturnedItems.map((item) => ({
      sql: "UPDATE products SET stock = stock + ? WHERE id = ? AND store_id = ?",
      params: [item.quantity, item.productId, storeId],
    })),
    {
      sql: `INSERT INTO orders (id, store_id, customer_id, customer_name, subtotal, discount, tax, total, payment_method, store_credit_used, status, staff_id, original_order_id, returned_items_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [replacementOrderId, storeId, customerId, customerName, totals.newItemsTotal, 0, 0, totals.amountDue, paymentMethod, storeCreditUsed, "completed", staffId, originalOrderId, JSON.stringify(normalizedReturnedItems)],
    },
    ...orderItems.map((item) => ({
      sql: `INSERT INTO order_items (id, store_id, order_id, product_id, name, price, quantity, total, price_type, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [item.id, storeId, replacementOrderId, item.product_id, item.name, item.price, item.quantity, item.total, item.price_type, item.unit],
    })),
    ...orderItems.filter((item) => item.product_id).map((item) => ({
      sql: "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND store_id = ?",
      params: [item.quantity, item.product_id, storeId],
    })),
    ...inventoryLogs.map((log) => ({
      sql: `INSERT INTO inventory_logs (id, store_id, product_id, action_type, quantity, reason)
            VALUES (?, ?, ?, ?, ?, ?)`,
      params: [log.id, log.store_id, log.product_id, log.action_type, log.quantity, log.reason],
    })),
    {
      sql: "UPDATE orders SET status = 'returned' WHERE id = ? AND store_id = ?",
      params: [originalOrderId, storeId],
    },
  ];

  if (effectiveBalanceOutcome === "store_credit" && customerId && totals.remainingBalance > 0) {
    const customer = await db.get("SELECT store_credit_balance FROM customers WHERE id = ? AND store_id = ?", [customerId, storeId]);
    const nextBalance = Number(customer?.store_credit_balance || 0) + totals.remainingBalance;
    customerCreditLog = {
      id: crypto.randomUUID(),
      store_id: storeId,
      customer_id: customerId,
      source_type: "exchange_remaining_balance",
      source_id: id,
      order_id: replacementOrderId,
      amount: totals.remainingBalance,
      balance_after: nextBalance,
      note: `Remaining exchange balance from Order #${String(originalOrderId).slice(0, 8)}`,
    };
    ops.push(
      {
        sql: "UPDATE customers SET store_credit_balance = ? WHERE id = ? AND store_id = ?",
        params: [nextBalance, customerId, storeId],
      },
      {
        sql: `INSERT INTO customer_credit_logs (id, store_id, customer_id, source_type, source_id, order_id, amount, balance_after, note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [customerCreditLog.id, customerCreditLog.store_id, customerCreditLog.customer_id, customerCreditLog.source_type, customerCreditLog.source_id, customerCreditLog.order_id, customerCreditLog.amount, customerCreditLog.balance_after, customerCreditLog.note],
      },
    );
  }

  await db.transaction(ops);

  return {
    id,
    returnId: id,
    replacementOrderId,
    success: true,
    value: totals.returnCredit,
    amountDue: totals.amountDue,
    remainingBalance: totals.remainingBalance,
    balanceOutcome: effectiveBalanceOutcome,
    inventoryLogs,
    customerCreditLog,
  };
}

module.exports = {
  calculateExchangeTotals,
  finalizeExchange,
  getReturnableQuantities,
  validateExchange,
};
