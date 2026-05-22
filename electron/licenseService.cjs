const { db } = require("./db.cjs");
const crypto = require("crypto");

function isProductionLicenseMode() {
  return process.env.NODE_ENV === "production" || process.env.INVENTORIMAN_LICENSE_MODE === "production";
}

/**
 * Initialize the license table if it doesn't exist.
 * Uses the async worker-backed DB proxy.
 */
async function initLicenseTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS license (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'basic',
        activated_at TEXT,
        expires_at TEXT,
        grace_until TEXT,
        status TEXT DEFAULT 'active'
      )
    `);

    // Seed a development-only demo license if none exists.
    const existing = await db.get("SELECT COUNT(*) as count FROM license");
    if (existing.count === 0 && !isProductionLicenseMode()) {
      await db.run(
        `
        INSERT INTO license (id, key, plan, activated_at, expires_at, grace_until, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
        crypto.randomUUID(),
        "DEMO-0000-0000-0000",
        "demo",
        new Date().toISOString(),
        null, // null = perpetual / no expiry
        null,
        "active",
        ],
      );
    }
  } catch (err) {
    console.error("License table init error:", err);
  }
}

/**
 * Get the current license status.
 * Returns: { status: 'active' | 'grace' | 'expired', license, daysLeft }
 */
async function getLicenseStatus() {
  try {
    const license = await db.get("SELECT * FROM license LIMIT 1");
    if (!license) return { status: "expired", license: null, daysLeft: 0 };

    const now = new Date();

    // No expiry = perpetual active
    if (!license.expires_at) {
      return { status: "active", license, daysLeft: null };
    }

    const expiresAt = new Date(license.expires_at);
    const graceUntil = license.grace_until ? new Date(license.grace_until) : null;

    if (now <= expiresAt) {
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      return { status: "active", license, daysLeft };
    }

    if (graceUntil && now <= graceUntil) {
      const daysLeft = Math.ceil((graceUntil - now) / (1000 * 60 * 60 * 24));
      return { status: "grace", license, daysLeft };
    }

    return { status: "expired", license, daysLeft: 0 };
  } catch (err) {
    console.error("License check error:", err);
    if (isProductionLicenseMode()) {
      return { status: "expired", license: null, daysLeft: 0 };
    }
    return { status: "active", license: null, daysLeft: null }; // Development fail-open only.
  }
}

/**
 * Activate a new license key.
 * For now: validates format and sets a 1-year expiry.
 * In production: call your license server here.
 */
async function activateLicense(key) {
  try {
    if (!key || key.trim().length < 8) {
      return { success: false, error: "Invalid license key format." };
    }

    const trimmedKey = key.trim().toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const graceUntil = new Date(expiresAt);
    graceUntil.setDate(graceUntil.getDate() + 7); // 7-day grace period

    // Update existing license record
    await db.run(
      `
      UPDATE license SET
        key = ?,
        plan = 'pro',
        activated_at = ?,
        expires_at = ?,
        grace_until = ?,
        status = 'active'
    `,
      [trimmedKey, now.toISOString(), expiresAt.toISOString(), graceUntil.toISOString()],
    );

    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    console.error("License activation error:", err);
    return { success: false, error: "Activation failed. Please try again." };
  }
}

module.exports = { initLicenseTable, getLicenseStatus, activateLicense, isProductionLicenseMode };
