const crypto = require("crypto");

const SCRYPT_PREFIX = "scrypt";
const KEY_LENGTH = 32;

function hashPin(pin, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(pin), salt, KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}:${salt}:${hash}`;
}

function verifyPin(pin, storedHash) {
  if (!storedHash || !String(storedHash).startsWith(`${SCRYPT_PREFIX}:`)) return false;
  const [, salt, expectedHash] = String(storedHash).split(":");
  const actualHash = crypto.scryptSync(String(pin), salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actualHash.length && crypto.timingSafeEqual(expected, actualHash);
}

function createInitialOwnerPin() {
  if (process.env.INVENTORIMAN_DEFAULT_OWNER_PIN) return process.env.INVENTORIMAN_DEFAULT_OWNER_PIN;
  if (process.env.NODE_ENV !== "production") return "123456";
  return String(crypto.randomInt(100000, 999999));
}

module.exports = { hashPin, verifyPin, createInitialOwnerPin };
