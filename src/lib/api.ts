export const API = process.env.NEXT_PUBLIC_API || "http://localhost:3001";

async function getIdToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

function joinUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // Only set Content-Type when we actually send JSON.
  // (Avoids issues on GET/HEAD and when using FormData)
  if (!headers["Content-Type"] && init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = joinUrl(API, path); // ✅ keep "/api/..." exactly as caller passes

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  // Read body ONCE
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  // If backend sends JSON, parse it (even for errors, so we can show message)
  const parsed = contentType.includes("application/json") && raw
    ? (() => { try { return JSON.parse(raw); } catch { return raw; } })()
    : raw;

  if (!res.ok) {
    const msg =
      typeof parsed === "string"
        ? parsed
        : (parsed as any)?.message || (parsed as any)?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Successful response
  return (parsed === "" ? (undefined as any) : (parsed as any)) as T;
}
