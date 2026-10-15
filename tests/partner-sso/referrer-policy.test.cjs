const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const { chromium } = require("@playwright/test");

test("Chromium native same-origin form Origin depends on referrer policy", async () => {
  const observations = [];
  const server = http.createServer((request, response) => {
    if (request.method === "POST") {
      observations.push({
        origin: request.headers.origin ?? null,
        fetchSite: request.headers["sec-fetch-site"] ?? null,
      });
      request.resume();
      response.writeHead(200, { "Content-Type": "text/html" }).end("<h1>Submitted</h1>");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html",
      "Referrer-Policy": request.url === "/no-referrer" ? "no-referrer" : "same-origin",
    }).end('<form method="post" action="/submit"><button>Submit</button></form>');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    for (const policy of ["no-referrer", "same-origin"]) {
      await page.goto(`${origin}/${policy}`);
      const response = page.waitForResponse((item) => item.request().method() === "POST");
      await page.getByRole("button", { name: "Submit" }).click();
      const status = (await response).status();
      const observed = observations.at(-1);
      console.log(`Native Chromium form (${policy}, loopback HTTP policy reproduction): ${JSON.stringify({ ...observed, status })}`);
      assert.equal(observed.fetchSite, "same-origin");
      assert.equal(observed.origin, policy === "no-referrer" ? "null" : origin);
      assert.equal(status, 200);
    }
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
