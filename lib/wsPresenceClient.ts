type PresenceStatus = "online" | "away" | "busy";

const WS_URL = (process.env.NEXT_PUBLIC_PRESENCE_WS_URL || "").replace(/\/$/, "") || undefined;

class WSPresenceClient {
  private ws: WebSocket | null = null;
  private url: string | undefined;
  private reconnectTimer: number | null = null;
  private backoff = 1000;
  private maxBackoff = 30_000;
  private ready = false;

  constructor(url?: string) {
    this.url = url || WS_URL;
  }

  connect(url?: string) {
    if (this.ws) return; // already connected or connecting
    this.url = url || this.url;
    if (!this.url) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.ready = true;
      this.backoff = 1000;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      // Dispatch open event for consumers
      window.dispatchEvent(new CustomEvent("presence:ws-open"));
    });

    this.ws.addEventListener("close", () => {
      this.ready = false;
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      // on error, close and let onclose schedule reconnect
      try { this.ws?.close(); } catch (_) {}
    });

    this.ws.addEventListener("message", (ev) => {
      // no-op default; consumers can add their own window-level listener if needed
      // messages: { type: string, ... }
      try {
        const msg = JSON.parse(ev.data);
        // dispatch as custom event for app to listen
        window.dispatchEvent(new CustomEvent("presence:message", { detail: msg }));
      } catch (_) {}
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.backoff = Math.min(this.backoff * 1.5, this.maxBackoff);
    }, this.backoff);
  }

  sendHeartbeat(payload: { userId: string; status?: PresenceStatus; ttlMs?: number; metadata?: Record<string, unknown> }) {
    if (!payload || !payload.userId) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // try to connect and then send when open
      this.connect();
      return;
    }
    const msg = { type: "heartbeat", ...payload } as any;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (_) {}
  }

  sendOffline(userId: string) {
    if (!userId) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: "offline", userId })); } catch (_) {}
      try { this.ws.close(); } catch (_) {}
    } else {
      // fallback to navigator.sendBeacon to HTTP offline endpoint
      try {
        const payload = JSON.stringify({ userId });
        if (navigator && (navigator as any).sendBeacon) {
          (navigator as any).sendBeacon("/api/presence/offline", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/presence/offline", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(()=>{});
        }
      } catch (_) {}
    }
  }

  queryPresence(userIds: string[]): Promise<Array<{ userId: string; status: "online" | "away" | "busy" | "offline"; lastSeen: number; metadata: Record<string, unknown> | null }>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Try to connect first
        this.connect();
        // Wait for connection or reject after timeout
        const checkReady = () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.queryPresence(userIds).then(resolve).catch(reject);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            reject(new Error("WebSocket not connected"));
          }
        }, 3000); // Optimized: reduced from 5s to 3s
        checkReady();
        return;
      }

      const requestId = `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("presence:message", handler);
        reject(new Error("Presence query timeout"));
      }, 5000); // Optimized: reduced from 10s to 5s

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        const msg = customEvent.detail;
        if (msg.type === "presence-response" && msg.requestId === requestId) {
          clearTimeout(timeout);
          window.removeEventListener("presence:message", handler);
          resolve(msg.users || []);
        } else if (msg.type === "error" && msg.requestId === requestId) {
          clearTimeout(timeout);
          window.removeEventListener("presence:message", handler);
          reject(new Error(msg.error || "Presence query failed"));
        }
      };

      window.addEventListener("presence:message", handler);

      try {
        this.ws.send(JSON.stringify({
          type: "query-presence",
          requestId,
          userIds: userIds.filter(Boolean)
        }));
      } catch (err) {
        clearTimeout(timeout);
        window.removeEventListener("presence:message", handler);
        reject(err);
      }
    });
  }

  subscribeFriends(friendIds: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      // Wait for connection then subscribe
      const checkAndSubscribe = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(JSON.stringify({
              type: "subscribe-friends",
              friendIds: friendIds.filter(Boolean)
            }));
          } catch (_) {}
        } else {
          setTimeout(checkAndSubscribe, 100);
        }
      };
      setTimeout(checkAndSubscribe, 100);
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: "subscribe-friends",
        friendIds: friendIds.filter(Boolean)
      }));
    } catch (_) {}
  }

  unsubscribeFriends(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "unsubscribe-friends" }));
      } catch (_) {}
    }
  }

  close() {
    this.unsubscribeFriends();
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

const instance = new WSPresenceClient();
export default instance;
