import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { WebSocketServer, WebSocket } from "ws";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const text = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when env is already set.
  }
}

loadEnvLocal();

const port = Number(process.env.DEEPGRAM_LIVE_RELAY_PORT ?? "3001");
const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
  console.error("[deepgram-relay] DEEPGRAM_API_KEY is missing (.env.local).");
  process.exit(1);
}

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Lessonova Deepgram live relay (dev)\n");
});

const wss = new WebSocketServer({ server, path: "/listen" });

wss.on("connection", (client, req) => {
  const incoming = new URL(req.url ?? "/listen", `http://127.0.0.1:${port}`);
  const upstreamUrl = `wss://api.deepgram.com/v1/listen${incoming.search}`;

  // Node `ws` + Deepgram: Sec-WebSocket-Protocol token auth is most reliable.
  const upstream = new WebSocket(upstreamUrl, ["token", apiKey]);

  const pendingFromClient = [];

  client.on("message", (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
      return;
    }
    pendingFromClient.push({ data, isBinary });
  });

  upstream.on("open", () => {
    console.log("[deepgram-relay] upstream open", incoming.search.slice(0, 120));
    for (const item of pendingFromClient) {
      upstream.send(item.data, { binary: item.isBinary });
    }
    pendingFromClient.length = 0;
  });

  upstream.on("message", (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, { binary: isBinary });
    }
  });

  client.on("close", (code, reason) => {
    try {
      if (upstream.readyState === WebSocket.CONNECTING) {
        upstream.terminate();
      } else {
        upstream.close(code, reason.toString());
      }
    } catch {
      // Already closed.
    }
  });

  upstream.on("close", (code, reason) => {
    const reasonText = reason.toString();
    if (code !== 1000 && code !== 1005) {
      console.error("[deepgram-relay] upstream closed:", code, reasonText || "(no reason)");
    }
    try {
      client.close(code, reasonText || "Deepgram closed the stream");
    } catch {
      // Already closed.
    }
  });

  upstream.on("unexpected-response", (_request, response) => {
    let body = "";
    response.on("data", (chunk) => {
      body += chunk;
    });
    response.on("end", () => {
      console.error(
        "[deepgram-relay] Deepgram rejected WebSocket:",
        response.statusCode,
        body.slice(0, 400),
      );
      try {
        client.close(1011, `Deepgram HTTP ${response.statusCode}`);
      } catch {
        // Already closed.
      }
    });
  });

  upstream.on("error", (error) => {
    const message = error instanceof Error ? error.message : "Deepgram upstream error";
    console.error("[deepgram-relay] upstream error:", message);
    try {
      client.close(1011, message.slice(0, 120));
    } catch {
      // Already closed.
    }
  });

  client.on("error", () => {
    try {
      upstream.close(1011, "Browser client error");
    } catch {
      // Already closed.
    }
  });
});

server.on("error", (error) => {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    console.log(
      `[deepgram-relay] Port ${port} is already in use — keeping the existing relay (OK for dev).`,
    );
    process.exit(0);
  }
  console.error("[deepgram-relay] Server error:", error);
  process.exit(1);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[deepgram-relay] listening on ws://127.0.0.1:${port}/listen`);
});
