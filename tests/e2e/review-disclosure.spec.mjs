import { test, expect } from "./fixtures.mjs";

/**
 * Real-browser coverage for the persistent content-review disclosure
 * (`#reviewDisclosure`, Issue #3 / Milestone 1 provenance-and-review-gates
 * task). Confirms the disclosure required by that task is actually visible
 * and readable on a real page at desktop and mobile viewports (this project
 * runs both — see playwright.config.mjs), links to the authoritative
 * docs/SCIENTIFIC_REVIEW.md record, and never obscures navigation or course
 * controls. It is a plain static block with no JS behavior of its own (no
 * fixed positioning, no dismiss control, no focus management), so there is
 * no separate "does it stay open/non-obstructive over time" behavior to
 * test the way tests/e2e/storage-failure-warning.spec.mjs must for the
 * dynamic, fixed-position storage banner.
 */

test.describe("content-review disclosure", () => {
  test("appears near the hero, states the structural-validation-vs-scientific-review distinction, and produces a clean console", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const disclosure = page.locator("#reviewDisclosure");
    await expect(disclosure).toBeVisible();

    const text = await disclosure.innerText();
    expect(text).toMatch(/structurally validated beta/i);
    expect(text).toMatch(/has not yet completed documented, question-by-question scientific review/i);
    expect(text).toMatch(/should not yet be treated as release-qualified/i);
    // Corrected 2026-08-04 (independent review point 7): the prior wording
    // ("Automated tests confirm this course is built and behaves
    // correctly") overstated the evidence -- it read as a positive
    // correctness claim rather than a scope limitation. Distinguishes
    // automated/structural validation from scientific review without
    // overclaiming what automated checks establish.
    expect(text).toMatch(/automated checks validate documented structural and behavioral contracts/i);
    expect(text).toMatch(/do not establish scientific accuracy/i);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("is positioned inside the hero, immediately after the hero stats -- near the course introduction, not buried later on the page", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator("#top.hero");
    const disclosure = page.locator("#reviewDisclosure");
    await expect(disclosure).toBeVisible();

    const heroBox = await hero.boundingBox();
    const disclosureBox = await disclosure.boundingBox();
    expect(disclosureBox.y).toBeGreaterThanOrEqual(heroBox.y);
    expect(disclosureBox.y + disclosureBox.height).toBeLessThanOrEqual(heroBox.y + heroBox.height + 1);

    const stats = page.locator(".hero-stats");
    const statsBox = await stats.boundingBox();
    expect(disclosureBox.y).toBeGreaterThanOrEqual(statsBox.y + statsBox.height - 1);
  });

  test("links to the authoritative Scientific Review Status record, and the destination is actually reachable and rendered -- not merely an href string", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const link = page.locator("#reviewDisclosure a");
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAccessibleName(/scientific review status/i);

    const href = await link.getAttribute("href");
    // Corrected 2026-08-04 (independent review point 7): the original
    // relative link (`./docs/SCIENTIFIC_REVIEW.md`) is served by GitHub
    // Pages as raw `text/markdown` -- an unrendered, confusing document
    // in a browser, not a readable page. This now links to GitHub's own
    // rendered blob view of the same file, which serves `text/html`.
    expect(href).toBe("https://github.com/jaustinanderson/cytogenetics-cg-course/blob/main/docs/SCIENTIFIC_REVIEW.md");

    // Activate/request the actual destination and verify it is reachable
    // and contains the expected current-review statement -- proving the
    // link genuinely delivers a readable page, not just that the href
    // string looks right. A couple of short retries tolerate GitHub's own
    // transient rate-limiting (429) on unauthenticated requests -- an
    // external-network condition, not a defect in this page.
    let response;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await request.get(href);
      if (response.status() !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
    expect(response.ok(), `expected ${href} to be reachable, got status ${response.status()}`).toBe(true);
    expect(response.headers()["content-type"] || "").toMatch(/text\/html/i);
    const body = await response.text();
    expect(body).toMatch(/Not yet independently reviewed/i);
    expect(body).toMatch(/Scientific Review Status/i);
  });

  test("does not obscure the header, hamburger, or main navigation at this viewport", async ({ page }) => {
    await page.goto("/");
    const disclosure = page.locator("#reviewDisclosure");
    const disclosureBox = await disclosure.boundingBox();

    const header = page.locator("header.topbar");
    const headerBox = await header.boundingBox();
    // The fixed header sits above everything in normal flow; the in-flow
    // disclosure (inside <main>, below the header) must not overlap it.
    expect(disclosureBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);

    // Hit-testing a point inside the disclosure must resolve to the
    // disclosure itself (or a descendant, e.g. its link) -- proving no
    // unrelated element (an overlay, the backdrop, a mispositioned
    // sibling) is layered on top of it intercepting pointer events there.
    const link = disclosure.locator("a");
    const linkBox = await link.boundingBox();
    const topElementIsWithinDisclosure = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const disclosureEl = document.getElementById("reviewDisclosure");
        return el === disclosureEl || disclosureEl.contains(el);
      },
      { x: linkBox.x + linkBox.width / 2, y: linkBox.y + linkBox.height / 2 },
    );
    expect(topElementIsWithinDisclosure).toBe(true);
  });

  test("does not steal focus, is not modal, and has no dismiss control", async ({ page }) => {
    await page.goto("/");
    // Focus starts on <body> (or wherever the browser defaults it) -- the
    // disclosure must never programmatically move focus onto itself.
    const focusIsOnDisclosure = await page.evaluate(
      () => document.activeElement === document.getElementById("reviewDisclosure"),
    );
    expect(focusIsOnDisclosure).toBe(false);
    await expect(page.locator("#reviewDisclosure button")).toHaveCount(0);
    await expect(page.locator("#reviewDisclosure [aria-modal]")).toHaveCount(0);
    // The rest of the page remains fully interactive underneath/around it --
    // a benign interaction (Print, with window.print stubbed to avoid a
    // real OS dialog, same technique as api-print-console.spec.mjs) still
    // reaches its handler, proving nothing is blocking input to the page.
    await page.evaluate(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
    await page.locator("#printBtn").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
  });
});
