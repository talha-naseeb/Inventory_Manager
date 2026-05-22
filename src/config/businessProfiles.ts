export const BUSINESS_PROFILE_TYPES = ["textile", "grocery", "icecream", "electronics", "pharmacy", "bakery", "restaurant", "general"] as const;

export type BusinessType = (typeof BUSINESS_PROFILE_TYPES)[number];

export interface BusinessProfile {
  label: string;
  icon: string;
  productNoun: { singular: string; plural: string };
  categoryNoun: string;
  stockUnit: { singular: string; plural: string; abbr: string };
  secondaryUnit?: { singular: string; plural: string; abbr: string };
  hasRolls: boolean;
  hasBrands: boolean;
  hasExpiry: boolean;
  hasBarcode: boolean;
  hasVariants: boolean;
  priceLabel: string;
  placeholders: {
    productName: string;
    sku: string;
    stock: string;
    price: string;
    lowStockAlert: string;
    category: string;
    description: string;
  };
  receiptUnit: string;
}

export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
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

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && BUSINESS_PROFILE_TYPES.includes(value as BusinessType);
}

export function getBusinessProfile(type: unknown): BusinessProfile {
  return BUSINESS_PROFILES[isBusinessType(type) ? type : "general"];
}

export function resolveStockUnitLabel(profile: BusinessProfile, customStockUnit?: string | null): string {
  const custom = customStockUnit?.trim();
  return custom || profile.stockUnit.singular;
}

export function resolveStockUnitAbbr(profile: BusinessProfile, customStockUnit?: string | null): string {
  const custom = customStockUnit?.trim();
  return custom || profile.stockUnit.abbr;
}
