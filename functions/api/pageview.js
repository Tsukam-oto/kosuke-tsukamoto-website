// Cloudflare Pages Function — D1-backed page-view counter (v32)
// Required Pages binding: DB -> kosuke-site-counter
// Existing counter row should be seeded as: counters('total', 523) or the latest legacy value.

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache"
    }
  });
}

export async function onRequestPost(context) {
  const db = context?.env?.DB;
  if (!db) {
    return json({ error: "d1_binding_missing" }, 500);
  }

  try {
    // batch() is transactional in D1. The existing legacy total is preserved,
    // then this page view is added exactly once and the new total is returned.
    const results = await db.batch([
      db.prepare("INSERT OR IGNORE INTO counters (counter_name, value) VALUES ('total', 0)"),
      db.prepare("UPDATE counters SET value = value + 1 WHERE counter_name = 'total'"),
      db.prepare("SELECT value FROM counters WHERE counter_name = 'total' LIMIT 1")
    ]);

    const count = Number(results?.[2]?.results?.[0]?.value);
    if (!Number.isFinite(count)) {
      return json({ error: "counter_read_failed" }, 500);
    }

    return json({ count });
  } catch (error) {
    console.error("D1 pageview counter failed", error);
    return json({ error: "counter_update_failed" }, 500);
  }
}

// Useful for checking the current total without incrementing it.
export async function onRequestGet(context) {
  const db = context?.env?.DB;
  if (!db) {
    return json({ error: "d1_binding_missing" }, 500);
  }

  try {
    const row = await db
      .prepare("SELECT value FROM counters WHERE counter_name = 'total' LIMIT 1")
      .first();

    const count = Number(row?.value);
    if (!Number.isFinite(count)) {
      return json({ error: "counter_not_initialized" }, 404);
    }

    return json({ count });
  } catch (error) {
    console.error("D1 pageview counter read failed", error);
    return json({ error: "counter_read_failed" }, 500);
  }
}
