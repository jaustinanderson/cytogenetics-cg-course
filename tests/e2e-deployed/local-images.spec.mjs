import { test, expect } from "./fixtures.mjs";

/**
 * Inspects the two approved images the course embeds (see
 * THIRD_PARTY_NOTICES.md / docs/ARCHITECTURE.md): a normal karyotype credited
 * to NHGRI (source page: Wikimedia Commons) and a Wellcome Collection
 * trisomy-21 karyotype (CC BY 4.0, Wessex Regional Genetics Centre). Both are
 * now served locally from this repository's own `assets/images/` directory
 * (localized so the page no longer depends on a third-party image host at
 * runtime) — only the external source-page/credit links in the figure
 * captions still point to Wikimedia Commons and wellcomecollection.org. Both
 * use `loading="lazy"`, so they are scrolled into view
 * before checking anything, and `naturalWidth`/`naturalHeight` are checked in
 * addition to `img.complete` — per the HTML spec, `complete` becomes true
 * once loading finishes *whether it succeeded or failed*, so `complete` alone
 * would not prove delivery. Only a nonzero natural size proves the image
 * actually decoded. Runs once, on the desktop project only, to avoid
 * doubling requests for a check that does not depend on viewport size.
 */

async function inspectImage(page, locator, label) {
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
  test.info().annotations.push({ type: "local-image-result", description: JSON.stringify(result) });
  console.log(`local-image-result: ${JSON.stringify(result)}`);
  return result;
}

test.describe("deployed local image delivery", () => {
  test("both approved images, now served from this deployment's own origin, complete loading with nonzero natural dimensions", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 980, "runs once on the desktop project; not viewport-dependent");
    test.setTimeout(60_000);

    await page.goto("./");

    const nhgri = await inspectImage(
      page,
      page.locator('img[src*="assets/images/nhgri-human-male-karyotype-46xy.png"]'),
      "NHGRI normal karyotype (localized)",
    );
    const trisomy21 = await inspectImage(
      page,
      page.locator('img[src*="assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg"]'),
      "Wellcome Collection trisomy 21 karyotype (localized)",
    );

    for (const result of [nhgri, trisomy21]) {
      const deliveredOk = !result.timedOut && result.complete && result.naturalWidth > 0 && result.naturalHeight > 0;
      // Recorded as a soft assertion so both images are always checked and
      // reported even if one fails, exactly as required: an exact recorded
      // result, never an assumption that an initiated request implies
      // delivery.
      expect
        .soft(deliveredOk, `${result.label}: ${JSON.stringify(result)}`)
        .toBe(true);
    }

    // The images now load from this deployment's own origin, not a
    // third-party host — verify both currentSrc values resolve under the
    // page's own origin/path rather than assuming localization succeeded.
    const pageOrigin = new URL(page.url());
    for (const result of [nhgri, trisomy21]) {
      const src = new URL(result.currentSrc);
      expect(src.origin, `${result.label}: expected same-origin delivery`).toBe(pageOrigin.origin);
    }
  });
});
