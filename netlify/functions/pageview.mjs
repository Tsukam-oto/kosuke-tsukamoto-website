import { getStore } from "@netlify/blobs";

const STORE_NAME = "site-stats";
const KEY = "pageviews";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });

export default async (request) => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  if (request.method === "GET") {
    const value = await store.get(KEY, { type: "text" });
    const count = Number.parseInt(value ?? "0", 10) || 0;
    return json({ count });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Compare-and-swap loop prevents lost increments if visitors arrive together.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const entry = await store.getWithMetadata(KEY, {
      consistency: "strong",
      type: "text",
    });

    if (entry === null) {
      const created = await store.set(KEY, "1", { onlyIfNew: true });
      if (created.modified) return json({ count: 1 });
      continue;
    }

    const current = Number.parseInt(entry.data ?? "0", 10) || 0;
    const next = current + 1;

    const updated = await store.set(KEY, String(next), {
      onlyIfMatch: entry.etag,
    });

    if (updated.modified) return json({ count: next });
  }

  return json({ error: "Please retry" }, 503);
};
