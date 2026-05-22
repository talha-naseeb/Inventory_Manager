const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function loadBusinessProfilesModule() {
  const sourcePath = path.join(__dirname, "../src/config/businessProfiles.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require }, { filename: sourcePath });
  return module.exports;
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

const expectedProfiles = {
  textile: {
    label: "Cloth & textile",
    icon: "Package",
    productNoun: { singular: "fabric", plural: "fabrics" },
    categoryNoun: "Brand",
    stockUnit: { singular: "meter", plural: "meters", abbr: "m" },
    secondaryUnit: { singular: "roll", plural: "rolls", abbr: "roll" },
    hasRolls: true,
    hasBrands: true,
    hasExpiry: false,
    hasBarcode: true,
    hasVariants: false,
    priceLabel: "Price per meter",
    placeholders: {
      productName: "e.g. Cotton lawn, Silk chiffon, Khaddar",
      sku: "e.g. FAB-2024-001",
      stock: "Total meters available",
      price: "Price per meter",
      lowStockAlert: "e.g. 10 meters",
      category: "e.g. Gul Ahmed, Alkaram, Bareeze",
      description: "Fabric type, thread count, width...",
    },
    receiptUnit: "m",
  },
  grocery: {
    label: "Grocery & vegetables",
    icon: "ShoppingBasket",
    productNoun: { singular: "item", plural: "items" },
    categoryNoun: "Category",
    stockUnit: { singular: "kg", plural: "kg", abbr: "kg" },
    hasRolls: false,
    hasBrands: false,
    hasExpiry: true,
    hasBarcode: true,
    hasVariants: false,
    priceLabel: "Price per kg",
    placeholders: {
      productName: "e.g. Tomatoes, Basmati rice, Onions",
      sku: "e.g. VEG-001",
      stock: "Stock in kg",
      price: "Price per kg",
      lowStockAlert: "e.g. 5 kg",
      category: "e.g. Vegetables, Pulses, Dairy",
      description: "Origin, grade, packaging...",
    },
    receiptUnit: "kg",
  },
  icecream: {
    label: "Ice cream & desserts",
    icon: "IceCream",
    productNoun: { singular: "flavour", plural: "flavours" },
    categoryNoun: "Category",
    stockUnit: { singular: "scoop", plural: "scoops", abbr: "scoop" },
    secondaryUnit: { singular: "litre", plural: "litres", abbr: "L" },
    hasRolls: false,
    hasBrands: false,
    hasExpiry: true,
    hasBarcode: false,
    hasVariants: true,
    priceLabel: "Price per scoop",
    placeholders: {
      productName: "e.g. Mango sorbet, Belgian chocolate",
      sku: "e.g. ICE-001",
      stock: "Scoops available today",
      price: "Price per scoop",
      lowStockAlert: "e.g. 20 scoops",
      category: "e.g. Sorbets, Premium, Sundaes",
      description: "Allergens, ingredients, seasonal...",
    },
    receiptUnit: "scoop",
  },
  electronics: {
    label: "Electronics & gadgets",
    icon: "Cpu",
    productNoun: { singular: "product", plural: "products" },
    categoryNoun: "Brand",
    stockUnit: { singular: "unit", plural: "units", abbr: "pcs" },
    hasRolls: false,
    hasBrands: true,
    hasExpiry: false,
    hasBarcode: true,
    hasVariants: true,
    priceLabel: "Selling price",
    placeholders: {
      productName: "e.g. iPhone 15, Samsung TV 55\"",
      sku: "e.g. ELEC-SAM-001",
      stock: "Units in stock",
      price: "Selling price",
      lowStockAlert: "e.g. 2 units",
      category: "e.g. Samsung, Apple, Sony",
      description: "Specs, warranty, model number...",
    },
    receiptUnit: "pcs",
  },
  pharmacy: {
    label: "Pharmacy & medical",
    icon: "Pill",
    productNoun: { singular: "medicine", plural: "medicines" },
    categoryNoun: "Category",
    stockUnit: { singular: "strip", plural: "strips", abbr: "strip" },
    hasRolls: false,
    hasBrands: true,
    hasExpiry: true,
    hasBarcode: true,
    hasVariants: false,
    priceLabel: "Price per strip",
    placeholders: {
      productName: "e.g. Panadol 500mg, Brufen 400mg",
      sku: "e.g. MED-PAN-001",
      stock: "Strips in stock",
      price: "Price per strip",
      lowStockAlert: "e.g. 10 strips",
      category: "e.g. Analgesics, Antibiotics, Vitamins",
      description: "Dosage, manufacturer, batch...",
    },
    receiptUnit: "strip",
  },
  bakery: {
    label: "Bakery & confectionery",
    icon: "CakeSlice",
    productNoun: { singular: "item", plural: "items" },
    categoryNoun: "Category",
    stockUnit: { singular: "piece", plural: "pieces", abbr: "pcs" },
    hasRolls: false,
    hasBrands: false,
    hasExpiry: true,
    hasBarcode: false,
    hasVariants: false,
    priceLabel: "Price per piece",
    placeholders: {
      productName: "e.g. Croissant, Chocolate cake slice",
      sku: "e.g. BAK-001",
      stock: "Pieces baked today",
      price: "Price per piece",
      lowStockAlert: "e.g. 5 pieces",
      category: "e.g. Breads, Pastries, Cakes",
      description: "Ingredients, allergens, shelf life...",
    },
    receiptUnit: "pcs",
  },
  restaurant: {
    label: "Restaurant & cafe",
    icon: "Soup",
    productNoun: { singular: "dish", plural: "dishes" },
    categoryNoun: "Category",
    stockUnit: { singular: "portion", plural: "portions", abbr: "ptn" },
    hasRolls: false,
    hasBrands: false,
    hasExpiry: false,
    hasBarcode: false,
    hasVariants: true,
    priceLabel: "Price per portion",
    placeholders: {
      productName: "e.g. Chicken karahi, Beef biryani",
      sku: "e.g. MENU-001",
      stock: "Portions available",
      price: "Price per portion",
      lowStockAlert: "e.g. 5 portions",
      category: "e.g. Mains, Starters, Beverages",
      description: "Ingredients, prep time, spice level...",
    },
    receiptUnit: "ptn",
  },
  general: {
    label: "General retail",
    icon: "ShoppingBag",
    productNoun: { singular: "product", plural: "products" },
    categoryNoun: "Category",
    stockUnit: { singular: "unit", plural: "units", abbr: "pcs" },
    hasRolls: false,
    hasBrands: true,
    hasExpiry: false,
    hasBarcode: true,
    hasVariants: false,
    priceLabel: "Selling price",
    placeholders: {
      productName: "e.g. Product name",
      sku: "e.g. SKU-001",
      stock: "Units in stock",
      price: "Selling price",
      lowStockAlert: "e.g. 5 units",
      category: "e.g. Category name",
      description: "Product description...",
    },
    receiptUnit: "pcs",
  },
};

test("business profiles define required labels and placeholders", () => {
  const { BUSINESS_PROFILES, BUSINESS_PROFILE_TYPES } = loadBusinessProfilesModule();
  assert.deepEqual(Array.from(BUSINESS_PROFILE_TYPES), ["textile", "grocery", "icecream", "electronics", "pharmacy", "bakery", "restaurant", "general"]);

  for (const type of BUSINESS_PROFILE_TYPES) {
    const profile = BUSINESS_PROFILES[type];
    assert.equal(typeof profile.label, "string");
    assert.equal(typeof profile.productNoun.singular, "string");
    assert.equal(typeof profile.productNoun.plural, "string");
    assert.equal(typeof profile.categoryNoun, "string");
    assert.equal(typeof profile.stockUnit.singular, "string");
    assert.equal(typeof profile.stockUnit.plural, "string");
    assert.equal(typeof profile.stockUnit.abbr, "string");
    assert.equal(typeof profile.priceLabel, "string");
    assert.equal(typeof profile.receiptUnit, "string");
    assert.equal(typeof profile.placeholders.productName, "string");
    assert.equal(typeof profile.placeholders.sku, "string");
    assert.equal(typeof profile.placeholders.stock, "string");
    assert.equal(typeof profile.placeholders.price, "string");
    assert.equal(typeof profile.placeholders.lowStockAlert, "string");
    assert.equal(typeof profile.placeholders.category, "string");
    assert.equal(typeof profile.placeholders.description, "string");
  }
});

test("business profiles match agreed profile values", () => {
  const { BUSINESS_PROFILES } = loadBusinessProfilesModule();
  assert.deepEqual(normalize(BUSINESS_PROFILES), expectedProfiles);
});

test("resolveStockUnitLabel uses custom unit override when present", () => {
  const { BUSINESS_PROFILES, resolveStockUnitLabel } = loadBusinessProfilesModule();
  assert.equal(resolveStockUnitLabel(BUSINESS_PROFILES.textile, ""), "meter");
  assert.equal(resolveStockUnitLabel(BUSINESS_PROFILES.textile, " yards "), "yards");
});
