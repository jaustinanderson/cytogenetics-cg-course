import { test, expect, V2_KEY, openDisclosure } from "./fixtures.mjs";

/* ============================ storage-failure detection / session-only mode (Issue #2) ============================
   Real-browser counterpart to the dependency-free coverage in
   tests/dom-behavior.mjs. This suite runs under both configured Playwright
   projects (desktop-chromium at 1280x900, mobile-chromium at 390x844 --
   see playwright.config.mjs), which satisfies the "warning must work at
   desktop and narrow/mobile widths" requirement without a per-test
   viewport override.

   localStorage failures are simulated via an init script that patches
   Storage.prototype BEFORE index.html's own inline script ever runs --
   the same technique tests/dom-harness.mjs uses for the dependency-free
   suite, just at the real-browser layer. */

async function failStorageWrites(page) {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
  });
}

test.describe("session-only storage warning", () => {
  test("a failed write shows the accessible warning with correct role and text, keeps the module change visible, and produces a clean console", async ({
    page,
    consoleIssues,
  }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const warning = page.locator("#storageWarning");
    await expect(warning).toBeHidden();

    await page.locator('.mark-complete[data-mod="m1"]').click();

    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute("role", "status");
    await expect(warning).toContainText("browser storage is unavailable");
    await expect(warning).toContainText("this session");

    // In-memory/rendered progress still advances despite the failed write.
    await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    // No false "Saved" claim next to the module that failed to persist.
    await expect(page.locator('.mark-status[data-status="m1"]')).toHaveText("");

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "write-failed" });

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("the warning does not steal focus while answering a question", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    await openDisclosure(mount.locator(".quiz"));
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m1"));
    const firstOption = mount.locator(".qitem").first().locator(".qopt").nth(questions[0].a);

    await firstOption.click();

    await expect(page.locator("#storageWarning")).toBeVisible();
    // The clicked option itself gets disabled once answered (pre-existing
    // quiz behavior, unrelated to Issue #2), which normally blurs it back
    // to the document -- so the real proof that role="status" (not
    // role="alert") never steals focus is that the warning banner itself
    // never becomes the active element.
    const activeElementIsWarning = await page.evaluate(
      () => document.activeElement && document.activeElement.id === "storageWarning",
    );
    expect(activeElementIsWarning).toBe(false);
  });

  test("repeated failures across several actions show only one warning, never duplicated", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");

    await page.locator('.mark-complete[data-mod="m1"]').click();
    await page.locator('.mark-complete[data-mod="m2"]').click();
    await page.locator('.mark-complete[data-mod="m3"]').click();

    await expect(page.locator("#storageWarning")).toHaveCount(1);
    await expect(page.locator("#storageWarning")).toBeVisible();
  });

  test("recovery: once storage becomes writable again, the next save persists the full accumulated state and the warning clears", async ({
    page,
    consoleIssues,
  }) => {
    await page.addInitScript(() => {
      window.__failWrites = true;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.__failWrites) throw new Error("QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await page.goto("/");

    await page.locator('.mark-complete[data-mod="m1"]').click();
    await page.locator('.mark-complete[data-mod="m2"]').click();
    await expect(page.locator("#storageWarning")).toBeVisible();
    let stored = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(stored).toBeNull();

    await page.evaluate(() => { window.__failWrites = false; });
    await page.locator('.mark-complete[data-mod="m3"]').click();

    await expect(page.locator("#storageWarning")).toBeHidden();
    stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), V2_KEY);
    expect(stored.modules).toEqual({ m1: true, m2: true, m3: true });

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: true, reason: null });

    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("3 of 17 modules complete");
    await expect(page.locator("#storageWarning")).toBeHidden();

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("the UI Reset path does not reload when storage removal fails, and honestly reports session-only afterward", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    await page.evaluate(() => {
      window.__noReloadSentinel = "still-here";
      Storage.prototype.removeItem = function () { throw new Error("removal blocked"); };
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();

    // Give the click handler a moment to run; a real reload would wipe the
    // sentinel and navigate away, so this also proves no navigation happened.
    await page.waitForTimeout(200);
    const sentinelSurvived = await page.evaluate(() => window.__noReloadSentinel);
    expect(sentinelSurvived).toBe("still-here");

    // The blank state is still applied honestly, in place.
    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
    await expect(page.locator('.mark-complete[data-mod="m1"]')).not.toHaveClass(/done/);
    await expect(page.locator("#storageWarning")).toBeVisible();

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "write-failed" });

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("a genuine read failure at initialization shows the warning immediately, before any user action", async ({
    page,
    consoleIssues,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new Error("SecurityError: storage access denied"); };
    });
    await page.goto("/");

    await expect(page.locator("#storageWarning")).toBeVisible();
    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "unavailable" });
    // The course still renders and is usable despite the read failure.
    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });
});

/* ============================ correction addendum (QL-026 addendum) ============================
   Independent review found two real problems in the original
   implementation, reproduced and corrected here:
     (1) a failed importJSON() attempt could downgrade the sticky
         'unavailable' status (a genuine read failure at init) to the
         non-sticky 'write-failed', letting a later ordinary action write
         over unseen prior progress the app never actually read;
     (2) #storageWarning was an ordinary in-flow element directly under
         <header>, at the very top of a page that can run tens of
         thousands of pixels tall -- CSS-visible (toBeVisible() passes)
         but far outside the viewport for a learner scrolled into a later
         module. Fixed by making the banner position:fixed to the
         viewport's bottom edge; these tests use toBeInViewport(), not
         toBeVisible(), specifically because toBeVisible() cannot detect
         this class of defect. */

test.describe("correction: sticky 'unavailable' survives a failed import", () => {
  test("real browser: a failed import while storage is unavailable-at-init never weakens the sticky status, and a later ordinary action cannot clobber the unseen prior record", async ({
    page,
    consoleIssues,
  }) => {
    const genuinePriorProgress = JSON.stringify({ v: 2, modules: { m5: true }, answers: {}, exercises: {}, started: 1 });

    // Seed genuine prior progress with the real, unpatched storage first,
    // then patch getItem to throw -- both run before index.html's own
    // script, via addInitScript's registration order.
    await page.addInitScript(
      ([key, value]) => { localStorage.setItem(key, value); },
      [V2_KEY, genuinePriorProgress],
    );
    await page.addInitScript(() => {
      // Captured before the override, so test code can inspect the raw
      // backing store directly without going through the patched method
      // that the app itself experiences as a failure.
      window.__originalGetItem = Storage.prototype.getItem.bind(localStorage);
      Storage.prototype.getItem = function () { throw new Error("SecurityError: storage access denied"); };
    });
    await page.goto("/");

    let status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "unavailable" });
    expect(await page.evaluate(() => window.CytoCourse.getProgress().modules)).toEqual({});

    await page.evaluate(() => {
      // Captured before the override, for the same reason as
      // __originalGetItem above -- so it can be reassigned back verbatim
      // once this test needs write access restored.
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    });
    const importResult = await page.evaluate(() =>
      window.CytoCourse.importJSON({ v: 2, modules: { m9: true }, answers: {}, exercises: {}, started: 0 })
    );
    expect(importResult.ok).toBe(false);

    status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "unavailable" });
    expect(await page.evaluate((key) => window.__originalGetItem(key), V2_KEY)).toBe(genuinePriorProgress);

    // Restore write access while reads remain broken -- exactly the
    // scenario that previously let saveProgress() clobber the seeded
    // record via the downgraded status.
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__originalSetItem;
    });
    await page.locator('.mark-complete[data-mod="m1"]').click();

    expect(await page.evaluate((key) => window.__originalGetItem(key), V2_KEY)).toBe(
      genuinePriorProgress,
      "the seeded prior progress remains completely unclobbered",
    );
    status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "unavailable" });

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });
});

/** Pure geometry: do two Playwright boundingBox() rectangles overlap? */
function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * True hit-testing (not just rectangle math): does the real point at the
 * center of `locator`'s box actually resolve, via document.elementFromPoint,
 * to that element or one of its descendants? This is what proves a fixed
 * overlay isn't silently intercepting clicks even when rectangles appear
 * not to overlap on paper.
 */
async function centerHitTestResolvesTo(page, locator) {
  const box = await locator.boundingBox();
  const handle = await locator.elementHandle();
  return page.evaluate(
    ([x, y, target]) => {
      const hit = document.elementFromPoint(x, y);
      return hit === target || Boolean(target && target.contains(hit));
    },
    [box.x + box.width / 2, box.y + box.height / 2, handle],
  );
}

/* ============================ correction: non-obstruction (QL-026 addendum 2) ============================
   A prior correction made #storageWarning position:fixed to guarantee
   viewport visibility at any scroll depth (see the describe block
   above). Independent review found that fix could itself obstruct
   content: a fixed element occupies no space in normal flow, so nothing
   downstream reserved room for it -- the banner could sit visually on
   top of the page's own bottom-most content and, on narrow widths, the
   mobile sidebar's own bottom-most nav links, both still fully
   hit-testable underneath it (position:fixed does not disable pointer
   events). The "document position unchanged" assertion previously used
   here proved the banner didn't shift EARLIER content -- necessary, but
   not sufficient, since it says nothing about whether anything ended up
   underneath the banner's own rectangle. These tests instead prove
   non-obstruction directly: rectangle intersection, real hit-testing via
   elementFromPoint, and pre/post-recovery scroll-extent comparisons. */

test.describe("correction: the warning never obstructs content, navigation, or the header", () => {
  test("the warning intersects the current viewport, does not steal focus, and does not duplicate when a failure occurs deep in the page", async ({
    page,
  }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const lateModuleButton = page.locator('.mark-complete[data-mod="m15"]');
    await lateModuleButton.scrollIntoViewIfNeeded();
    await lateModuleButton.click();

    const warning = page.locator("#storageWarning");
    await expect(warning).toBeVisible();
    // The real proof the viewport-visibility fix targets: not merely
    // rendered somewhere on the (very tall) page, but actually
    // intersecting the viewport the learner is currently looking at.
    await expect(warning).toBeInViewport();

    const activeElementIsWarning = await page.evaluate(
      () => document.activeElement && document.activeElement.id === "storageWarning",
    );
    expect(activeElementIsWarning).toBe(false);

    // A second failure from the same deep scroll position still shows
    // exactly one warning, still in view.
    await page.locator('.mark-complete[data-mod="m16"]').click();
    await expect(page.locator("#storageWarning")).toHaveCount(1);
    await expect(warning).toBeInViewport();
  });

  test("a course control near the viewport bottom sits fully outside the banner's rectangle, hit-tests correctly, and remains clickable", async ({
    page,
  }) => {
    await failStorageWrites(page);
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();

    const warning = page.locator("#storageWarning");
    await expect(warning).toBeVisible();

    // The very last mark-complete control on the page -- exactly the
    // control that would sit directly behind an unreserved fixed bottom
    // banner once scrolled to the end of the page.
    const lastControl = page.locator(".mark-complete").last();
    await lastControl.scrollIntoViewIfNeeded();

    const [warningBox, controlBox] = await Promise.all([warning.boundingBox(), lastControl.boundingBox()]);
    expect(rectsOverlap(warningBox, controlBox), JSON.stringify({ warningBox, controlBox })).toBe(false);
    expect(await centerHitTestResolvesTo(page, lastControl)).toBe(true);

    await lastControl.click();
    await expect(lastControl).toHaveClass(/done/);
  });

  test("the warning never overlaps the sticky header", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();

    const [warningBox, headerBox] = await Promise.all([
      page.locator("#storageWarning").boundingBox(),
      page.locator(".topbar").boundingBox(),
    ]);
    expect(rectsOverlap(warningBox, headerBox), JSON.stringify({ warningBox, headerBox })).toBe(false);
  });

  test("at 390x844 with the mobile sidebar open, the final nav link is fully visible above the banner, does not overlap it, hit-tests correctly, and remains fully operable", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 980, "the off-canvas mobile sidebar only exists below 980px");
    await failStorageWrites(page);
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#storageWarning")).toBeVisible();

    await page.locator("#navToggle").click();
    await expect(page.locator("#sidebar")).toHaveClass(/open/);

    const finalLink = page.locator("#sidebarNav .nav-link").last();
    await finalLink.scrollIntoViewIfNeeded();

    const warningBox = await page.locator("#storageWarning").boundingBox();
    const linkBox = await finalLink.boundingBox();
    expect(rectsOverlap(warningBox, linkBox), JSON.stringify({ warningBox, linkBox })).toBe(false);
    // Fully ABOVE the banner's top edge -- not merely non-overlapping on
    // a technicality (e.g. clipped short by the sidebar's own bounds so
    // its box never reaches the banner's rectangle in the first place).
    expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(warningBox.y + 1);
    expect(await centerHitTestResolvesTo(page, finalLink)).toBe(true);

    await finalLink.click();
    await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
  });

  test("repeated failures keep the reserved space stable, not accumulating across each additional failure", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const reservedHeight = () => page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--storage-warning-h").trim(),
    );

    await page.locator('.mark-complete[data-mod="m1"]').click();
    const reservedAfterFirst = await reservedHeight();
    expect(reservedAfterFirst).not.toBe("0px");

    await page.locator('.mark-complete[data-mod="m2"]').click();
    await page.locator('.mark-complete[data-mod="m3"]').click();
    expect(await reservedHeight()).toBe(reservedAfterFirst);
    await expect(page.locator("#storageWarning")).toHaveCount(1);
  });

  test("recovery hides the warning and collapses the reserved space cleanly, with no leftover empty strip and no unexpected scroll offset", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__failWrites = true;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.__failWrites) throw new Error("QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await page.goto("/");
    // Web fonts finishing an async load, and -- critically -- this
    // course's lazy-loaded (`loading="lazy"`) figures only actually
    // fetching and rendering once scrolled near, can each change the
    // page's total height for reasons entirely unrelated to the
    // reservation under test. Scroll to the target module FIRST (which
    // triggers any nearby lazy image load) and let things settle, THEN
    // take the baseline measurement from that same scroll position --
    // otherwise a lazy image loading in between the baseline and later
    // measurements would masquerade as a reservation-cleanup defect.
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const lateModuleButton = page.locator('.mark-complete[data-mod="m10"]');
    await lateModuleButton.scrollIntoViewIfNeeded();
    // A direct, deterministic signal that any lazy image near THIS scroll
    // position has actually finished loading and settled its own layout --
    // waitForLoadState('networkidle') is an indirect proxy for this and
    // raced the lazy image under parallel-worker contention (the fetch
    // could start late enough that the idle window closes before it, or
    // after it, non-deterministically). Scoped to images currently near
    // the viewport, not every `<img>` on the page -- a `loading="lazy"`
    // image elsewhere, never scrolled near, would otherwise never trigger
    // its fetch and this would hang forever waiting on it.
    await page.waitForFunction(() => Array.from(document.images)
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > -500 && r.top < window.innerHeight + 500;
      })
      .every((img) => img.complete));

    const scrollExtent = () => page.evaluate(() => document.documentElement.scrollHeight);
    const reservedHeight = () => page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--storage-warning-h").trim(),
    );
    const scrollExtentBaseline = await scrollExtent();
    const scrollYBefore = await page.evaluate(() => window.scrollY);

    // Deliberately not scrolled to the absolute bottom, so a shrinking
    // max-scroll extent on recovery cannot itself force an unrelated
    // scroll-position change -- isolating this assertion to the
    // reservation's own behavior. Toggling the SAME module's
    // mark-complete control on then off (rather than marking two
    // different modules) is deliberate too: marking a module complete
    // grows the page slightly on its own (a "done" state/checkmark), a
    // content change unrelated to the reservation -- toggling it back
    // off before the final measurement returns the page's own content to
    // its exact original state, so any remaining scrollHeight difference
    // can only be attributable to the reservation itself.
    await lateModuleButton.click(); // mark complete -- write fails
    await expect(page.locator("#storageWarning")).toBeInViewport();
    expect(await reservedHeight()).not.toBe("0px");
    expect(await scrollExtent()).toBeGreaterThan(scrollExtentBaseline);

    await page.evaluate(() => { window.__failWrites = false; });
    await lateModuleButton.click(); // unmark -- write succeeds, content reverts to baseline

    await expect(page.locator("#storageWarning")).toBeHidden();
    expect(await reservedHeight()).toBe("0px");
    expect(await scrollExtent()).toBe(scrollExtentBaseline);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
  });

  test("the banner wraps to multiple lines at 390px width and still reserves exactly enough space, with no overlap", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 980, "asserts the narrow-width, multi-line-wrapped case specifically");
    await failStorageWrites(page);
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();

    const warning = page.locator("#storageWarning");
    await expect(warning).toBeVisible();
    const [box, lineHeightPx] = await Promise.all([
      warning.boundingBox(),
      warning.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight)),
    ]);
    // Confirms the message actually wraps here -- the premise this test
    // needs to be meaningful -- rather than assuming it from message
    // length alone.
    expect(box.height, "the message must actually wrap to more than one line at this width").toBeGreaterThan(lineHeightPx * 1.5);

    const reserved = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--storage-warning-h").trim(),
    );
    expect(parseFloat(reserved)).toBeGreaterThanOrEqual(box.height - 1);

    const lastControl = page.locator(".mark-complete").last();
    await lastControl.scrollIntoViewIfNeeded();
    const controlBox = await lastControl.boundingBox();
    expect(rectsOverlap(box, controlBox), JSON.stringify({ box, controlBox })).toBe(false);
  });

  test("the banner and the elements that reserve space for it never animate that reservation, with or without a reduced-motion preference", async ({ page }) => {
    await page.goto("/");
    // #storageWarning and .content never transition at all -- the
    // reservation change is instant by design, regardless of motion
    // preference, so there is nothing here for prefers-reduced-motion to
    // need to suppress in the first place.
    const instantAlways = await page.evaluate(() => {
      const selectors = ["#storageWarning", ".content"];
      return selectors.map((sel) => getComputedStyle(document.querySelector(sel)).transitionDuration);
    });
    for (const d of instantAlways) { expect(d).toBe("0s"); }

    // .sidebar legitimately transitions its own open/close slide (unrelated
    // to the reservation), which is why it is checked separately: under an
    // explicit reduced-motion preference, this course's existing global
    // `*{transition:none!important}` rule must still suppress it.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const sidebarDurationReduced = await page.evaluate(
      () => getComputedStyle(document.querySelector(".sidebar")).transitionDuration,
    );
    expect(sidebarDurationReduced).toBe("0s");
  });
});
