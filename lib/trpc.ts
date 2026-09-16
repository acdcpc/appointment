import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const headers: Record<string, string> = {};
          const cookieToken = await Auth.getSessionToken();
          if (cookieToken) headers.Authorization = `Bearer ${cookieToken}`;
          try {
            const { getSupabaseSession } = await import("@/lib/supabase");
            const session = await getSupabaseSession();
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
          } catch { /* supabase session unavailable */ }
          return headers;
        },
        // Custom fetch: include credentials for cookie-based auth, and
        // short-circuit when the deployment has no API backend. A static host
        // has no tRPC server, so without this guard every query fires at the
        // page's own origin, fails, and logs a network error — noisy for
        // parents and misleading in the console. Screens then fall back to
        // their built-in defaults instead.
        fetch(url, options) {
          if (!getApiBaseUrl()) {
            return Promise.resolve(
              new Response(
                JSON.stringify([{ error: { json: { message: "This feature needs the clinic server, which is not connected on this deployment." } } }]),
                { status: 503, headers: { "content-type": "application/json" } },
              ),
            );
          }
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
