const PRESENCE_BASE_URL = (process.env.PRESENCE_SERVICE_URL || process.env.NEXT_PUBLIC_PRESENCE_URL || "").replace(/\/$/, "");
const PRESENCE_SECRET = process.env.PRESENCE_SERVICE_SECRET || process.env.PRESENCE_SECRET;

function ensureBaseUrl(): string {
  if (PRESENCE_BASE_URL) {
    return PRESENCE_BASE_URL;
  }

  throw new Error(
    "Missing presence service URL. Set PRESENCE_SERVICE_URL (server) or NEXT_PUBLIC_PRESENCE_URL (client) in your environment."
  );
}

async function forwardToPresence(path: string, init: RequestInit = {}) {
  const baseUrl = ensureBaseUrl();
  const headers = new Headers(init.headers || undefined);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (PRESENCE_SECRET) {
    headers.set("x-presence-secret", PRESENCE_SECRET);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Presence service ${response.status}: ${errorText || response.statusText}`);
  }

  return response;
}

export type PresenceStatus = "online" | "away" | "busy";

export async function sendPresenceHeartbeat(payload: {
  userId: string;
  status?: PresenceStatus;
  ttlMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const response = await forwardToPresence("/presence/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return response.json();
}

export async function markPresenceOffline(userId: string) {
  await forwardToPresence("/presence/offline", {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

export async function fetchPresenceBulk(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as Array<{
      userId: string;
      status: PresenceStatus | "offline";
      lastSeen: number;
      metadata: Record<string, unknown> | null;
    }>;
  }

  const params = new URLSearchParams({ userIds: userIds.join(",") });
  const response = await forwardToPresence(`/presence?${params.toString()}`, {
    method: "GET"
  });

  const data = await response.json();
  return data.users ?? [];
}

export async function fetchPresenceById(userId: string) {
  const response = await forwardToPresence(`/presence/${encodeURIComponent(userId)}`, {
    method: "GET"
  });

  return response.json();
}
