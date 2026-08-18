const { SecurityError, assertPlainObject } = require("./ipcSecurity.cjs");

function createIpcRouter({ ipcMain, sessionManager, isTrustedSender, log }) {
  function register(channel, { permission = null, validate = (payload) => payload, allowUnauthenticated = false }, handler) {
    ipcMain.handle(channel, async (event, payload) => {
      if (!isTrustedSender(event)) {
        throw new SecurityError("UNTRUSTED_RENDERER", "Request did not originate from the application renderer");
      }

      try {
        const session = allowUnauthenticated
          ? null
          : permission
            ? await sessionManager.authorize(event.sender.id, permission)
            : await sessionManager.requireSession(event.sender.id);
        const parsed = validate(payload);
        return await handler({ event, payload: parsed, session });
      } catch (error) {
        if (error instanceof SecurityError) {
          log.warn(`IPC security rejection [${channel}] ${error.code}: ${error.message}`);
        }
        throw error;
      }
    });
  }

  return {
    public(channel, validate, handler) {
      register(channel, { allowUnauthenticated: true, validate }, handler);
    },
    authenticated(channel, validate, handler) {
      register(channel, { validate }, handler);
    },
    secure(channel, permission, validate, handler) {
      register(channel, { permission, validate }, handler);
    },
  };
}

function emptyPayload(payload) {
  if (payload === undefined) return undefined;
  assertPlainObject(payload);
  if (Object.keys(payload).length) {
    throw new SecurityError("INVALID_PAYLOAD", "This operation does not accept input fields");
  }
  return undefined;
}

module.exports = { createIpcRouter, emptyPayload };
