/**
 * Local ports for this repo. Change the two numbers here only.
 *
 * Keep them aligned with SocialPairly-Workflow-manager
 * src/main/resources/ports.properties (app.server.port and app.frontend.port).
 *
 * FRONTEND_PORT is the Vite dev/preview port.
 * BACKEND_PORT is the Workflow-manager listen port.
 *
 * Google Cloud still needs the exact origin http://localhost:FRONTEND_PORT
 * (and http://127.0.0.1:FRONTEND_PORT) under Authorized JavaScript origins.
 * deploy/nginx.conf proxies /api and /uploads to BACKEND_PORT on the server.
 */
export const FRONTEND_PORT = 3002
export const BACKEND_PORT = 9012

export function frontendOrigin(host = 'localhost') {
  return `http://${host}:${FRONTEND_PORT}`
}

export function backendOrigin(host = 'localhost') {
  return `http://${host}:${BACKEND_PORT}`
}

/** Browser-facing API origin for paths that are not served through the Vite proxy. */
export const API_ORIGIN = backendOrigin('localhost')

/**
 * Node proxy target. 127.0.0.1 avoids Windows resolving "localhost" to IPv6,
 * which shows up as ECONNREFUSED from the Vite proxy.
 */
export const API_PROXY_TARGET = backendOrigin('127.0.0.1')
