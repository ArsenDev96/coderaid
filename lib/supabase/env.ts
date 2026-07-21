/**
 * Supabase configuration, read once and validated loudly.
 *
 * A missing key produces a named error at the call site rather than an
 * undefined-shaped failure three layers into the client library. The service
 * role key is deliberately *not* here — it lives in `admin.ts`, which is
 * server-only, so there is no import path that could pull it toward the
 * browser bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy it from the Supabase dashboard (Settings → API) into .env.local.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
