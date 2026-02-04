export const API = process.env.NEXT_PUBLIC_API || "http://localhost:3001";

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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const headers: any = { "Content-Type": "application/json", ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());

  const text = await res.text();
  return (text ? JSON.parse(text) : (undefined as any)) as T;
}
