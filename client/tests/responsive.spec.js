import { test, expect } from '@playwright/test';

// Keep visual/layout tests independent of MongoDB and never send real form data.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/stats') ? { posts: 3 }
      : path.endsWith('/tags') ? { tags: [] }
      : path.endsWith('/posts') ? { posts: [], page: 1, pages: 1, total: 0 }
      : {};
    await route.fulfill({ json });
  });
});

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // Also catch clipped content when body overflow-x hides the scrollbar.
  const clipped = await page.locator('main h1, main h2, main p, main input, main form, main a, footer a').evaluateAll((elements) =>
    elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width && (rect.left < -1 || rect.right > window.innerWidth + 1);
    }).map((element) => element.textContent?.slice(0, 70) || element.tagName),
  );
  expect(clipped).toEqual([]);
}

for (const [width, height] of [[1920, 1080], [1900, 877], [1536, 695], [1366, 768], [1280, 720], [1280, 600], [1024, 768], [768, 1024], [390, 844], [375, 667], [320, 568], [844, 390]]) {
  test(`home layout at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const actions = page.locator('#subscribe');
    await expect(actions).toHaveCSS('opacity', '1');
    const hero = page.locator('.hero-content');
    const heroBounds = await hero.boundingBox();
    expect(heroBounds.height).toBeGreaterThanOrEqual(height - 1);
    const nextSection = await page.locator('main section').nth(1).boundingBox();
    expect(nextSection.y).toBeGreaterThanOrEqual(height - 1);
    // Center the introduction in the usable area below the fixed navbar.
    const spacing = await hero.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        above: element.firstElementChild.getBoundingClientRect().top - rect.top - parseFloat(style.paddingTop),
        below: rect.bottom - element.lastElementChild.getBoundingClientRect().bottom - parseFloat(style.paddingBottom),
      };
    });
    expect(Math.abs(spacing.above - spacing.below)).toBeLessThan(2);
    expect(await actions.evaluate((element) => parseFloat(getComputedStyle(element).marginTop))).toBeGreaterThanOrEqual(height <= 640 ? 32 : 48);
    await expect(page.getByText('New here? Start with the FAQ', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Subscribe for research updates/)).toHaveCount(0);
    await expect(page.locator('.hero-content')).not.toContainText('Final-year research journal');
    await expect(page.locator('.hero-content')).toContainText('product built from research');
    await expect(page.locator('.hero-content [aria-hidden="true"] > span')).toHaveText(['සිං', 'EN']);
    await expect(page.locator('.hero-description')).toHaveCSS('font-size', width < 640 ? '14px' : '15px');
    expect(await page.locator('.hero-title').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(40);
    expect(await page.locator('.hero-subtitle').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(48);
    await expect(page.locator('main').getByRole('link', { name: 'Read the research', exact: true })).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: 'Subscribe', exact: true })).toHaveCount(0);
    if (width >= 768) {
      await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Read the research', exact: true })).toHaveAttribute('href', '/research');
      await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Journey', exact: true })).toHaveAttribute('href', '/journey');
    }
    await expectNoOverflow(page);
    if (height >= 600) {
      const bounds = await actions.boundingBox();
      expect(bounds.y + bounds.height).toBeLessThan(height - 16);
    }
    if (width < 640) {
      await expect(page.locator('#subscribe form')).toHaveCSS('flex-direction', 'column');
    }
    if (width >= 640) {
      await expect(page.locator('#subscribe form')).toHaveCSS('flex-direction', 'row');
    }
    await expect(page.locator('#subscribe input')).toHaveCSS('font-size', '16px');
    await page.screenshot({ path: testInfo.outputPath('home.png') });
    // Check the shared subscription card after the entry animation has run.
    const lastForm = page.locator('.newsletter-form').last();
    await lastForm.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 120));
    await expect(lastForm).toBeInViewport({ ratio: 1 });
    await expect(lastForm).toBeVisible();
    await expectNoOverflow(page);
  });
}

test.describe('touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('uses native scrolling and touch-sized menu controls', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#subscribe')).toHaveCSS('opacity', '1');
    expect(await page.locator('main').evaluate((main) => getComputedStyle(main.parentElement).position)).toBe('static');
    const toggle = page.getByRole('button', { name: 'Open menu' });
    const bounds = await toggle.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await toggle.tap();
    await expect(page.locator('#mobile-navigation')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('mobile-menu.png') });
    await page.locator('#mobile-navigation').getByRole('link', { name: 'Read the research', exact: true }).tap();
    await expect(page.locator('#mobile-navigation')).toHaveCount(0);
    await expect(page).toHaveURL(/\/research$/);
    await expectNoOverflow(page);
  });
});

test('mobile navigation supports anchors, Escape, routes and resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  await page.locator('#mobile-navigation').getByRole('link', { name: 'Product', exact: true }).click();
  await expect(page.locator('#mobile-navigation')).toHaveCount(0);
  await expect(page).toHaveURL(/#project$/);
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#mobile-navigation')).toHaveCount(0);
  await toggle.click();
  await page.locator('#mobile-navigation').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator('#mobile-navigation')).toHaveCount(0);
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#mobile-navigation')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

for (const path of ['/blog', '/journey', '/research', '/about', '/faq', '/privacy', '/terms', '/not-a-page']) {
  test(`${path} fits a narrow phone`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expectNoOverflow(page);
  });
}
