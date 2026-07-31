// Focused, dependency-free checks for scripts/verify-deployed-revision.mjs's
// hashing logic. These run entirely over the loopback interface — a local
// Node http server standing in for "the live deployed URL" — so they require
// no external network access and can run as part of `npm test`. They do not
// exercise the GitHub deployments API polling (that inherently requires
// reaching api.github.com and is verified separately, manually, against the
// real repository — see docs/QUALITY_LOG.md and docs/VALIDATION.md).
import assert from "node:assert/strict";
import http from "node:http";
import { fetchLive, sha256 } from "../scripts/verify-deployed-revision.mjs";

function test(name, fn) {
  return fn()
    .then(() => console.log(`✓ ${name}`))
    .catch((error) => {
      console.error(`✗ ${name}`);
      throw error;
    });
}

function serveOnce(body) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function main() {
  await test("sha256 is identical for identical content", async () => {
    const a = Buffer.from("<html>same</html>");
    const b = Buffer.from("<html>same</html>");
    assert.equal(sha256(a), sha256(b));
  });

  await test("sha256 differs for different content", async () => {
    const a = Buffer.from("<html>one</html>");
    const b = Buffer.from("<html>two</html>");
    assert.notEqual(sha256(a), sha256(b));
  });

  await test("fetchLive against a local server hashes to a match against identical local content", async () => {
    const expected = Buffer.from("<html><body>expected course content</body></html>");
    const { server, url } = await serveOnce(expected);
    try {
      const live = await fetchLive(url);
      assert.equal(sha256(live), sha256(expected), "live fetch should hash-match identical local content");
    } finally {
      server.close();
    }
  });

  await test("fetchLive against a local server hashes to a mismatch against different local content", async () => {
    const served = Buffer.from("<html><body>this is what is actually live</body></html>");
    const localExpectation = Buffer.from("<html><body>this is what the checkout expects</body></html>");
    const { server, url } = await serveOnce(served);
    try {
      const live = await fetchLive(url);
      assert.notEqual(
        sha256(live),
        sha256(localExpectation),
        "live fetch should hash-mismatch genuinely different local content",
      );
    } finally {
      server.close();
    }
  });

  await test("fetchLive adds a cache-busting query parameter so repeated fetches are not served from a URL-keyed cache", async () => {
    const requestedUrls = [];
    const server = http.createServer((req, res) => {
      requestedUrls.push(req.url);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>content</html>");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/`;
    try {
      await fetchLive(url);
      await fetchLive(url);
      assert.equal(requestedUrls.length, 2);
      assert.notEqual(requestedUrls[0], requestedUrls[1], "each fetch should carry a distinct cache-busting query string");
      assert.match(requestedUrls[0], /\?_cb=/);
      assert.match(requestedUrls[1], /\?_cb=/);
    } finally {
      server.close();
    }
  });

  console.log("\nverify-deployed-revision hash checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
