const https = require("node:https");
const http = require("node:http");
const fs = require("node:fs");

const [cert, key] = process.argv.slice(2);
const routes = new Map([
  ["central.example.com", 8080],
  ["product-a.example.com", 3000],
  ["product-b.example.com", 3001],
]);

// TLS terminates only on loopback; overwrite forwarded authority, never trust it.
const server = https.createServer({
  cert: fs.readFileSync(cert),
  key: fs.readFileSync(key),
}, (request, response) => {
  const host = request.headers.host;
  const port = routes.get(host);
  if (!port) {
    response.writeHead(421).end();
    return;
  }
  const headers = { ...request.headers };
  delete headers.forwarded;
  for (const name of Object.keys(headers)) {
    if (name.startsWith("x-forwarded-")) delete headers[name];
  }
  Object.assign(headers, {
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": "https",
    "x-forwarded-port": "443",
    "x-forwarded-for": "127.0.0.1",
  });
  const upstream = http.request({
    host: "127.0.0.1", port, path: request.url, method: request.method, headers,
  }, (incoming) => {
    response.writeHead(incoming.statusCode, incoming.headers);
    incoming.pipe(response);
  });
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});
server.on("error", (error) => {
  console.error("Test HTTPS proxy failed:", error.code);
  process.exitCode = 1;
});
server.listen(443, "127.0.0.1");
