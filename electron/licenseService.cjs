const { db } = require("./db.cjs");
const crypto = require("crypto");

/**
 * Initialize the license table if it doesn't exist.
 * Called from db.cjs initDb().
 */
function initLicenseTable() {
  try {
    db.exec(`
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

    // Seed a default perpetual license if none exists
    const existing = db.prepare("SELECT COUNT(*) as count FROM license").get();
    if (existing.count === 0) {
      db.prepare(
        `
        INSERT INTO license (id, key, plan, activated_at, expires_at, grace_until, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        crypto.randomUUID(),
        "DEMO-0000-0000-0000",
        "demo",
        new Date().toISOString(),
        null, // null = perpetual / no expiry
        null,
        "active",
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
function getLicenseStatus() {
  try {
    const license = db.prepare("SELECT * FROM license LIMIT 1").get();
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
    return { status: "active", license: null, daysLeft: null }; // fail open
  }
}

/**
 * Activate a new license key.
 * For now: validates format and sets a 1-year expiry.
 * In production: call your license server here.
 */
function activateLicense(key) {
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
    db.prepare(
      `
      UPDATE license SET
        key = ?,
        plan = 'pro',
        activated_at = ?,
        expires_at = ?,
        grace_until = ?,
        status = 'active'
    `,
    ).run(trimmedKey, now.toISOString(), expiresAt.toISOString(), graceUntil.toISOString());

    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    console.error("License activation error:", err);
    return { success: false, error: "Activation failed. Please try again." };
  }
}

module.exports = { initLicenseTable, getLicenseStatus, activateLicense };
