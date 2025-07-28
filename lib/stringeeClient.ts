// Stringee Web SDK loader and client factory
// You must add <script src="https://cdn.stringee.com/sdk/web/latest/stringee-web-sdk.min.js"></script> in _app or layout

declare global {
  interface Window {
    StringeeClient?: any;
    StringeeCall?: any;
  }
}

export function createStringeeClient(token: string): any {
  if (typeof window === "undefined" || !window.StringeeClient) {
    throw new Error("StringeeClient SDK not loaded");
  }
  const client = new window.StringeeClient();
  client.connect(token);
  return client;
}

// Helper to create a call
export function createStringeeCall(client: any, from: string, to: string, localStream: MediaStream): any {
  if (!window.StringeeCall) {
    throw new Error("StringeeCall SDK not loaded");
  }
  const call = new window.StringeeCall(client, from, to, true);
  call.videoResolution = "HD";
  call.localStream = localStream;
  return call;
}
