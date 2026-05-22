async function searchProducts(db, { search = "", category = "All", store_id = "default" } = {}) {
  let sql = `
    SELECT p.*, b.name as brand
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.store_id = ?
  `;
  const params = [store_id];

  if (search) {
    sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== "All") {
    sql += " AND b.name = ?";
    params.push(category);
  }

  sql += " ORDER BY p.name ASC LIMIT 200";
  return db.all(sql, params);
}

module.exports = {
  searchProducts,
};
