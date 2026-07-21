/**
 * `server-only` throws when imported outside a React Server Component, which
 * is exactly its job — but the Vitest suite runs the server modules directly in
 * Node to test them. Aliasing it to this empty module lets the tests import
 * `lib/server/*` while the real package still guards the browser bundle.
 */
export {};
