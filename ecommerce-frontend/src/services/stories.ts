export async function adminStories(path = "", method = "GET", data?: unknown) {
  const response = await fetch(`/api/admin-stories${path ? `/${path}` : ""}`, { method, cache: "no-store", ...(data !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load stories."); return result;
}
