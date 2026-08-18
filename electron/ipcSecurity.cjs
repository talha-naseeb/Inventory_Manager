const path = require("node:path");
const { pathToFileURL } = require("node:url");
const crypto = require("node:crypto");
const { verifyPin, hashPin } = require("./pinService.cjs");

const ROLE_PERMISSIONS = Object.freeze({
  cashier: new Set(["session:use", "pos:use", "sales:view", "customers:manage"]),
  manager: new Set([
    "session:use",
    "pos:use",
    "sales:view",
    "customers:manage",
    "inventory:manage",
    "procurement:manage",
    "reports:view",
    "settings:view",
    "returns:process",
  ]),
  admin: new Set(["*"]),
  owner: new Set(["*"]),
});

class SecurityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SecurityError";
    this.code = code;
    Object.assign(this, details);
  }
}

function roleAllows(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && (permissions.has("*") || permissions.has(permission)));
}

function assertPlainObject(value, label = "payload", maxBytes = 262_144) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} must be an object`);
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new SecurityError("INVALID_PAYLOAD", `${label} must be JSON serializable`);
  }
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new SecurityError("PAYLOAD_TOO_LARGE", `${label} exceeds ${maxBytes} bytes`);
  }
  return value;
}

function assertExactKeys(value, allowedKeys, label = "payload") {
  assertPlainObject(value, label);
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unexpected.length) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} contains unsupported field '${unexpected[0]}'`);
  }
  return value;
}

function readString(value, label, { min = 0, max = 256, optional = false, pattern } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  if (typeof value !== "string") throw new SecurityError("INVALID_PAYLOAD", `${label} must be a string`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} must be between ${min} and ${max} characters`);
  }
  if (pattern && !pattern.test(normalized)) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} has an invalid format`);
  }
  return normalized;
}

function readNumber(value, label, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, integer = false, optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} must be a valid${integer ? " integer" : " number"}`);
  }
  return value;
}

function readBoolean(value, label, { optional = false } = {}) {
  if (value === undefined && optional) return undefined;
  if (typeof value !== "boolean") throw new SecurityError("INVALID_PAYLOAD", `${label} must be a boolean`);
  return value;
}

function readEnum(value, label, allowed, { optional = false } = {}) {
  if (value === undefined && optional) return undefined;
  if (!allowed.includes(value)) throw new SecurityError("INVALID_PAYLOAD", `${label} is not supported`);
  return value;
}

function readArray(value, label, { min = 0, max = 1_000 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new SecurityError("INVALID_PAYLOAD", `${label} must contain between ${min} and ${max} items`);
  }
  return value;
}

function validatePin(pin, label = "PIN") {
  return readString(pin, label, { min: 4, max: 8, pattern: /^\d{4,8}$/ });
}

function formatPinLockoutMessage(retryAfterMs) {
  const totalSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const duration = minutes > 0
    ? `${minutes}m${seconds > 0 ? ` ${seconds}s` : ""}`
    : `${seconds}s`;
  return `Too many incorrect PIN attempts. Retry in ${duration}.`;
}

function isTrustedRendererUrl(url, { isPackaged, distPath, devOrigin = "http://localhost:5173" }) {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    if (!isPackaged) return parsed.origin === devOrigin;
    if (parsed.protocol !== "file:") return false;
    const trustedRootUrl = pathToFileURL(path.resolve(distPath) + path.sep).href;
    return parsed.href.startsWith(trustedRootUrl);
  } catch {
    return false;
  }
}

class SessionManager {
  constructor(db, { now = () => Date.now(), maxAttempts = 5, lockoutMs = 5 * 60 * 1_000 } = {}) {
    this.db = db;
    this.now = now;
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutMs;
    this.sessions = new Map();
    this.attempts = new Map();
  }

  async getBootstrapState() {
    const pendingOwner = await this.db.get(
      "SELECT id FROM staff WHERE role = 'owner' AND status = 'active' AND COALESCE(requires_pin_setup, 0) = 1 LIMIT 1",
    );
    const usableOwner = await this.db.get(
      "SELECT id FROM staff WHERE role = 'owner' AND status = 'active' AND COALESCE(pin_hash, '') != '' AND COALESCE(requires_pin_setup, 0) = 0 LIMIT 1",
    );
    return { requiresOwnerEnrollment: Boolean(pendingOwner && !usableOwner) };
  }

  _assertNotLocked(clientId) {
    const state = this.attempts.get(clientId);
    if (!state?.lockedUntil) return;
    const remaining = state.lockedUntil - this.now();
    if (remaining > 0) {
      throw new SecurityError("PIN_LOCKED", formatPinLockoutMessage(remaining), { retryAfterMs: remaining });
    }
    this.attempts.delete(clientId);
  }

  _recordFailure(clientId) {
    const prior = this.attempts.get(clientId) || { failures: 0, lockedUntil: 0 };
    const failures = prior.failures + 1;
    const lockedUntil = failures >= this.maxAttempts ? this.now() + this.lockoutMs : 0;
    this.attempts.set(clientId, { failures, lockedUntil });
    return { failures, lockedUntil };
  }

  async _getActiveStoreId() {
    const row = await this.db.get("SELECT value FROM settings WHERE key = 'cloud_store_id'");
    return typeof row?.value === "string" && row.value.trim() ? row.value.trim() : "default";
  }

  _publicSession(staff, activeStoreId) {
    const storeId = staff.store_id === "default" && activeStoreId !== "default" ? activeStoreId : staff.store_id || activeStoreId;
    return Object.freeze({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      status: staff.status,
      storeId,
    });
  }

  async login(clientId, input) {
    assertExactKeys(input, ["pin"], "login payload");
    const pin = validatePin(input.pin);
    this._assertNotLocked(clientId);

    const activeStoreId = await this._getActiveStoreId();
    const staffRows = await this.db.all(
      "SELECT id, store_id, name, role, status, pin, pin_hash, COALESCE(requires_pin_setup, 0) AS requires_pin_setup FROM staff WHERE status = 'active' AND (store_id = ? OR store_id = 'default')",
      [activeStoreId],
    );
    const staff = staffRows.find((row) => !row.requires_pin_setup && (verifyPin(pin, row.pin_hash) || (!row.pin_hash && row.pin === pin)));

    if (!staff) {
      const attempt = this._recordFailure(clientId);
      if (attempt.lockedUntil) {
        throw new SecurityError("PIN_LOCKED", formatPinLockoutMessage(this.lockoutMs), { retryAfterMs: this.lockoutMs });
      }
      throw new SecurityError("INVALID_PIN", "Invalid PIN", { attemptsRemaining: this.maxAttempts - attempt.failures });
    }

    if (!staff.pin_hash && staff.pin) {
      await this.db.run("UPDATE staff SET pin_hash = ?, pin = '' WHERE id = ?", [hashPin(pin), staff.id]);
    }

    const session = this._publicSession(staff, activeStoreId);
    this.sessions.set(clientId, session);
    this.attempts.delete(clientId);
    await this.db.run("INSERT INTO login_logs (id, staff_id, action) VALUES (?, ?, ?)", [crypto.randomUUID(), staff.id, "login"]);
    return session;
  }

  async enrollOwner(clientId, input) {
    assertExactKeys(input, ["name", "pin", "confirmPin"], "owner enrollment payload");
    const name = readString(input.name, "Owner name", { min: 2, max: 80 });
    const pin = validatePin(input.pin);
    const confirmPin = validatePin(input.confirmPin, "PIN confirmation");
    if (pin !== confirmPin) throw new SecurityError("INVALID_PAYLOAD", "PIN confirmation does not match");

    const bootstrap = await this.getBootstrapState();
    if (!bootstrap.requiresOwnerEnrollment) {
      throw new SecurityError("ENROLLMENT_CLOSED", "Owner enrollment is no longer available");
    }

    const owner = await this.db.get(
      "SELECT id, store_id, role, status FROM staff WHERE role = 'owner' AND status = 'active' AND COALESCE(requires_pin_setup, 0) = 1 LIMIT 1",
    );
    if (!owner) throw new SecurityError("ENROLLMENT_CLOSED", "Owner enrollment is no longer available");

    await this.db.run(
      "UPDATE staff SET name = ?, pin = '', pin_hash = ?, requires_pin_setup = 0 WHERE id = ? AND requires_pin_setup = 1",
      [name, hashPin(pin), owner.id],
    );
    return this.login(clientId, { pin });
  }

  async requireSession(clientId) {
    const session = this.sessions.get(clientId);
    if (!session) throw new SecurityError("AUTH_REQUIRED", "Authentication required");

    const current = await this.db.get("SELECT id, name, role, status, store_id FROM staff WHERE id = ?", [session.id]);
    if (!current || current.status !== "active") {
      this.sessions.delete(clientId);
      throw new SecurityError("AUTH_REQUIRED", "Session is no longer active");
    }

    const refreshed = Object.freeze({ ...session, name: current.name, role: current.role });
    this.sessions.set(clientId, refreshed);
    return refreshed;
  }

  async authorize(clientId, permission) {
    const session = await this.requireSession(clientId);
    if (!roleAllows(session.role, permission)) {
      throw new SecurityError("PERMISSION_DENIED", `Permission '${permission}' is required`);
    }
    return session;
  }

  async logout(clientId) {
    const session = this.sessions.get(clientId);
    this.sessions.delete(clientId);
    if (session) {
      await this.db.run("INSERT INTO login_logs (id, staff_id, action) VALUES (?, ?, ?)", [crypto.randomUUID(), session.id, "logout"]);
    }
    return { success: true };
  }

  async updateStoreId(clientId, storeId) {
    const session = await this.requireSession(clientId);
    const normalizedStoreId = readString(storeId, "Store id", { min: 1, max: 128, pattern: /^[A-Za-z0-9_-]+$/ });
    const refreshed = Object.freeze({ ...session, storeId: normalizedStoreId });
    this.sessions.set(clientId, refreshed);
    return refreshed;
  }

  clear(clientId) {
    this.sessions.delete(clientId);
    this.attempts.delete(clientId);
  }
}

module.exports = {
  ROLE_PERMISSIONS,
  SecurityError,
  SessionManager,
  assertExactKeys,
  assertPlainObject,
  isTrustedRendererUrl,
  readArray,
  readBoolean,
  readEnum,
  readNumber,
  readString,
  roleAllows,
  validatePin,
  formatPinLockoutMessage,
};
