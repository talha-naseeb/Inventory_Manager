function buildContentSecurityPolicy({ isDevelopment = false } = {}) {
  const scriptSource = isDevelopment ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";

  return [
    "default-src 'self'",
    scriptSource,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: app-assets:",
    "connect-src 'self' http://localhost:5173 ws://localhost:5173 https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
}

module.exports = { buildContentSecurityPolicy };
