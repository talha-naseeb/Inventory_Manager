function decodeJwtPayload(key) {
  if (typeof key !== "string") return null;
  const parts = key.split(".");
  if (parts.length < 2) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function isServiceRoleKey(key) {
  const payload = decodeJwtPayload(key);
  return payload?.role === "service_role";
}

function normalizeStoreId(storeId, { allowDefault = true } = {}) {
  const normalized = typeof storeId === "string" ? storeId.trim() : "";
  if (!normalized) {
    throw new Error("Store ID is required.");
  }
  if (!allowDefault && normalized.toLowerCase() === "default") {
    throw new Error("Store activation requires a non-default store ID.");
  }
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(normalized)) {
    throw new Error("Store ID may only contain letters, numbers, underscores, and dashes.");
  }
  return normalized;
}

function normalizeStoreActivation({ storeId, storeName, userEmail }) {
  const normalizedStoreId = normalizeStoreId(storeId, { allowDefault: false });
  const normalizedStoreName = typeof storeName === "string" && storeName.trim()
    ? storeName.trim()
    : normalizedStoreId;
  const normalizedUserEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";

  if (!normalizedUserEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUserEmail)) {
    throw new Error("A valid cloud user email is required.");
  }

  return {
    storeId: normalizedStoreId,
    storeName: normalizedStoreName,
    userEmail: normalizedUserEmail,
  };
}

function normalizeSyncSettings({ url, key, currentKey }) {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  const nextKey = typeof key === "string" ? key.trim() : "";
  const existingKey = typeof currentKey === "string" ? currentKey.trim() : "";

  if (!normalizedUrl) {
    throw new Error("Supabase URL is required.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error("Supabase URL must be a valid https:// URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Supabase URL must start with https://.");
  }

  const effectiveKey = nextKey || existingKey;
  if (!effectiveKey) {
    throw new Error("Supabase publishable or anon key is required.");
  }

  if (isServiceRoleKey(effectiveKey)) {
    throw new Error("Service-role keys must not be saved in the desktop app.");
  }

  return {
    url: normalizedUrl,
    key: effectiveKey,
  };
}

module.exports = {
  decodeJwtPayload,
  isServiceRoleKey,
  normalizeStoreActivation,
  normalizeStoreId,
  normalizeSyncSettings,
};
