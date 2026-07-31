import { test, expect } from "./fixtures.mjs";

/**
 * Inspects the two approved remote images the course embeds (see
 * THIRD_PARTY_NOTICES.md / docs/ARCHITECTURE.md): a Wikimedia Commons normal
 * karyotype and a CDC PHIL trisomy-21 karyotype. Both use `loading="lazy"`,
 * so they are scrolled into view before checking anything, and `naturalWidth`
 * / `naturalHeight` are checked in addition to `img.complete` — per the HTML
 * spec, `complete` becomes true once loading finishes *whether it succeeded
 * or failed*, so `complete` alone would not prove delivery. Only a nonzero
 * natural size proves the image actually decoded. Runs once, on the desktop
 * project only, to avoid doubling third-party network requests for a check
 * that does not depend on viewport size.
 */

async function inspectRemoteImage(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  // Entirely browser-side: waits for the lazy-loaded image's own load/error
  // event (either means the browser has finished attempting delivery), or a
  // bounded 15s fallback, then reads its actual decoded state. Never assumes
  // a request in flight equals a delivered image.
  const state = await locator.evaluate(
    (img) =>
      new Promise((resolve) => {
        const finish = (timedOut) =>
          resolve({
            timedOut,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            currentSrc: img.currentSrc,
            hiddenByFallback: getComputedStyle(img).display === "none",
          });
        if (img.complete) {
          finish(false);
          return;
        }
        const timer = setTimeout(() => finish(true), 15_000);
        img.addEventListener(
          "load",
          () => {
            clearTimeout(timer);
            finish(false);
          },
          { once: true },
        );
        img.addEventListener(
          "error",
          () => {
            clearTimeout(timer);
            finish(false);
          },
          { once: true },
        );
      }),
  );
  const result = { label, ...state };
  test.info().annotations.push({ type: "remote-image-result", description: JSON.stringify(result) });
  console.log(`remote-image-result: ${JSON.stringify(result)}`);
  return result;
}

test.describe("deployed remote image delivery", () => {
  test("both approved remote images complete loading with nonzero natural dimensions", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 980, "runs once on the desktop project; not viewport-dependent");
    test.setTimeout(60_000);

    await page.goto("./");

    const wikimedia = await inspectRemoteImage(
      page,
      page.locator('img[src*="commons.wikimedia.org"]'),
      "Wikimedia Commons normal karyotype (NHGRI)",
    );
    const cdc = await inspectRemoteImage(
      page,
      page.locator('img[src*="wwwn.cdc.gov"]'),
      "CDC PHIL trisomy 21 karyotype",
    );

    for (const result of [wikimedia, cdc]) {
      const deliveredOk = !result.timedOut && result.complete && result.naturalWidth > 0 && result.naturalHeight > 0;
      // Recorded as a soft assertion so both images are always checked and
      // reported even if one fails, exactly as required: an exact recorded
      // result, never an assumption that an initiated request implies
      // delivery.
      expect
        .soft(deliveredOk, `${result.label}: ${JSON.stringify(result)}`)
        .toBe(true);
    }
  });
});
