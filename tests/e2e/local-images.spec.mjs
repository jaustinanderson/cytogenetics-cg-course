import { test, expect } from "./fixtures.mjs";

/**
 * The two approved embedded images (NHGRI normal karyotype, Wellcome
 * Collection trisomy-21 karyotype; see THIRD_PARTY_NOTICES.md) are localized to
 * `assets/images/` so the course no longer depends on a third-party image
 * host at runtime. This suite proves local delivery over the same local
 * static server the rest of `tests/e2e/` uses — unlike third-party network
 * delivery, this does not depend on outbound internet access, so it is safe
 * to run as part of every local/PR `npm run test:e2e` invocation rather than
 * only the separate deployed suite. Both use `loading="lazy"`, so each is
 * scrolled into view before checking anything, and `naturalWidth`/
 * `naturalHeight` are checked in addition to `img.complete` — `complete`
 * alone becomes true once loading finishes whether it succeeded or failed,
 * so it cannot alone prove successful decode.
 */

async function inspectImage(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate(
    (img) =>
      new Promise((resolve) => {
        const finish = () =>
          resolve({
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            currentSrc: img.currentSrc,
          });
        if (img.complete) {
          finish();
          return;
        }
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      }),
  );
}

test.describe("local image delivery", () => {
  test("both approved embedded images load locally with nonzero natural dimensions", async ({ page }) => {
    await page.goto("/");

    const nhgri = await inspectImage(
      page.locator('img[src="assets/images/nhgri-human-male-karyotype-46xy.png"]'),
    );
    const trisomy21 = await inspectImage(
      page.locator('img[src="assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg"]'),
    );

    expect(nhgri.complete, JSON.stringify(nhgri)).toBe(true);
    expect(nhgri.naturalWidth, JSON.stringify(nhgri)).toBeGreaterThan(0);
    expect(nhgri.naturalHeight, JSON.stringify(nhgri)).toBeGreaterThan(0);
    expect(nhgri.currentSrc).toContain("assets/images/nhgri-human-male-karyotype-46xy.png");

    expect(trisomy21.complete, JSON.stringify(trisomy21)).toBe(true);
    expect(trisomy21.naturalWidth, JSON.stringify(trisomy21)).toBeGreaterThan(0);
    expect(trisomy21.naturalHeight, JSON.stringify(trisomy21)).toBeGreaterThan(0);
    expect(trisomy21.currentSrc).toContain("assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg");
  });
});
