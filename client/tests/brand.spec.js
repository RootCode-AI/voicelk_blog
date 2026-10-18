import { test, expect } from '@playwright/test';

test('the logo, icons and manifest are served from the generated brand files', async ({ page, request }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: { posts: [], tags: [], page: 1, pages: 1, total: 0 } }));
  await page.goto('/');
  const logo = page.locator('header').getByRole('link', { name: 'VoiceLK home' });
  await expect(logo.locator('svg.brand-mark image')).toHaveCount(2);
  await expect(logo.locator('.brand-bar')).toHaveCount(5);

  for (const [path, type] of [
    ['/brand/voicelk-book.webp', 'image/webp'],
    ['/brand/voicelk-wordmark.webp', 'image/webp'],
    ['/favicon-32.png', 'image/png'],
    ['/icon-192.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest.name).toBe('VoiceLK');
  await expect(page.locator('link[rel="icon"][sizes="192x192"]')).toHaveAttribute('href', '/icon-192.png');
});

test('the bars speak on hover, rest afterwards, and stay still for reduced motion', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: { posts: [], tags: [], page: 1, pages: 1, total: 0 } }));
  const animation = (locator) => locator.evaluate((el) => getComputedStyle(el).animationName);

  await page.goto('/');
  const bar = page.locator('header .brand-bar').nth(2);
  await page.locator('header').getByRole('link', { name: 'VoiceLK home' }).hover();
  expect(await animation(bar)).toBe('brand-speak');
  await page.mouse.move(640, 600);
  await expect(page.locator('header .brand-mark')).toHaveAttribute('data-voice', 'intro');
  // Silent on the 404 page: each bar is flattened to a dot.
  await page.goto('/nothing-here');
  const silent = await page.locator('main .brand-mark[data-voice="silent"] .brand-bar').first().evaluate((el) => getComputedStyle(el).transform);
  expect(silent).not.toBe('none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('header').getByRole('link', { name: 'VoiceLK home' }).hover();
  expect(await animation(page.locator('header .brand-bar').nth(2))).toBe('none');
});
