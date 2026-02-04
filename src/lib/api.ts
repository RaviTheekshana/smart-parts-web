export const API =
  process.env.NEXT_PUBLIC_API || "http://localhost:3001";

// With Cognito + API Gateway JWT authorizer, we fetch the Cognito session token on-demand.
async function getIdToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // Only set Content-Type automatically when we are sending JSON (not for FormData, etc.)
  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!headers["Content-Type"] && hasBody && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ✅ keep your normalization logic unchanged
  const normalizedPath = path.startsWith("/api/")
    ? path.replace("/api", "")
    : path;

  const url = `${API}${normalizedPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (e: any) {
    // Network / CORS / DNS errors
    throw new Error(`Network error calling ${url}: ${e?.message || String(e)}`);
  }

  const text = await res.text();
  const maybeJson = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    // Give a clean error message, but keep details for debugging
    const message =
      (maybeJson && (maybeJson.message || maybeJson.error)) ||
      text ||
      `HTTP ${res.status} ${res.statusText}`;

    throw new Error(`${message} (HTTP ${res.status})`);
  }

  // Return JSON when possible, else return text (rare but safe)
  return (maybeJson ?? (text as any)) as T;
}
