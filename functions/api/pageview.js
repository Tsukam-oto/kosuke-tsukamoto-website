// Cloudflare Pages Function
// Keeps the existing site-wide counter alive during the Netlify -> Cloudflare migration.
// The browser calls /api/pageview; this server-side function forwards the POST to
// the currently-live legacy Netlify Function, avoiding browser CORS restrictions.

const LEGACY_COUNTER = "https://kosuketsukamoto.netlify.app/.netlify/functions/pageview";

export async function onRequestPost() {
  try {
    const upstream = await fetch(LEGACY_COUNTER, {
      method: "POST",
      headers: { "Accept": "application/json" },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    if (!upstream.ok) {
      return Response.json({ error: "counter_upstream_unavailable" }, { status: 502 });
    }

    const data = await upstream.json();
    const count = Number(data?.count);
    if (!Number.isFinite(count)) {
      return Response.json({ error: "invalid_counter_response" }, { status: 502 });
    }

    return Response.json({ count }, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    return Response.json({ error: "counter_proxy_failed" }, { status: 502 });
  }
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
