const http = require("node:http");

const ports = new Map([
  ["product-a.example.com", 3000],
  ["product-b.example.com", 3001],
]);

async function start(hostname, createApp) {
  const port = ports.get(hostname);
  if (!port) throw new Error("Unsupported test frontend host");
  // Next's public hostname/port options describe the canonical external origin,
  // not the separate loopback socket used by this custom server.
  const app = createApp({ dev: false, hostname, port: 443 });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = http.createServer((request, response) => {
    if (request.headers.host !== hostname || request.headers["x-forwarded-proto"] !== "https") {
      response.writeHead(421).end();
      return;
    }
    Promise.resolve(handle(request, response)).catch((error) => {
      console.error("Test frontend request failed:", error.name);
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.log(`Test frontend ready: https://${hostname} via loopback ${port}`);
  return { server, app };
}

module.exports = { start };
if (require.main === module) {
  start(process.argv[2], require("next")).catch((error) => {
    console.error("Test frontend startup failed:", error.name);
    process.exitCode = 1;
  });
}
