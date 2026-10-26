import { test, expect } from '@playwright/test';
import { DEFAULT_OPEN_CODE, publicOpenCode } from '../../shared/openCode.js';

async function mockApi(page, { failedLoad = false, failedSave = false } = {}) {
  let saved = structuredClone(DEFAULT_OPEN_CODE);
  let writes = 0;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { admin: { name: 'Test admin' } } });
    if (path === '/api/admin/open-code') {
      if (route.request().method() === 'PUT') {
        if (failedSave) return route.fulfill({ status: 400, json: { error: 'Please check the highlighted fields.', details: { 'repos.0.url': 'Use a full https:// URL.' } } });
        writes += 1;
        saved = { ...route.request().postDataJSON(), revision: saved.revision + 1 };
      } else if (failedLoad) return route.fulfill({ status: 500, json: { error: 'Could not load Open code.' } });
      return route.fulfill({ json: saved });
    }
    if (path === '/api/open-code') return route.fulfill({ json: publicOpenCode(saved) });
    if (path === '/api/posts') return route.fulfill({ json: { posts: [], total: 0 } });
    return route.fulfill({ json: {} });
  });
  return { value: () => saved, writes: () => writes };
}

test('admin edits, adds, reorders, hides and removes repositories and publishes matching public links', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await mockApi(page);
  await page.goto('/admin/open-code');
  await expect(page.getByRole('heading', { name: 'Open code', exact: true })).toBeVisible();
  const first = page.getByRole('region', { name: 'Repository 1', exact: true });
  await first.getByLabel('Display title', { exact: true }).fill('Neural speech source');
  await first.getByLabel('Repository URL', { exact: true }).fill('https://github.com/example/speech');
  await page.getByRole('button', { name: 'Add repository', exact: true }).click();
  const added = page.getByRole('region', { name: 'Repository 5', exact: true });
  await added.getByLabel('Repository name', { exact: true }).fill('speech_tools');
  await added.getByLabel('Display title', { exact: true }).fill('Speech tools');
  await added.getByLabel('Description', { exact: true }).fill('Tools for working with speech.');
  await added.getByLabel('Tech stack', { exact: true }).fill('Python');
  await added.getByLabel('Repository URL', { exact: true }).fill('https://github.com/example/tools');
  await page.getByRole('button', { name: 'Move repository 5 up', exact: true }).click();
  await page.getByRole('region', { name: 'Repository 2', exact: true }).getByLabel('Show this repository').uncheck();
  await page.getByRole('button', { name: 'Remove repository 3', exact: true }).click();
  expect(state.writes()).toBe(0);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  expect(state.value().repos.map(repo => repo.name)).toEqual(['voicelk_ml', 'bridge', 'speech_tools', 'voicelk_fe']);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Repository 1', exact: true }).getByLabel('Display title', { exact: true })).toHaveValue('Neural speech source');
  await page.screenshot({ path: testInfo.outputPath('open-code-admin.png'), fullPage: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Read the source' })).toBeVisible();
  const cards = page.getByRole('heading', { name: 'Read the source' }).locator('..').locator('..').locator('..');
  await expect(page.getByRole('heading', { name: 'Neural speech source' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Speech tools', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TTS bridge', exact: true })).toHaveCount(0);
  await expect(page.locator('footer').getByRole('link', { name: 'Neural speech source', exact: true })).toHaveAttribute('href', 'https://github.com/example/speech');
  await expect(page.locator('footer').getByText('TTS bridge', { exact: true })).toHaveCount(0);
  await page.goto('/admin/open-code');
  await page.getByLabel('Show Open code on the website').uncheck();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Read the source' })).toHaveCount(0);
  await expect(page.locator('footer').getByRole('link', { name: 'Neural speech source', exact: true })).toHaveCount(0);
});

test('mobile editor fits the viewport and keeps invalid edits for correction', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockApi(page, { failedSave: true });
  await page.goto('/admin/open-code');
  const first = page.getByRole('region', { name: 'Repository 1', exact: true });
  await first.getByLabel('Repository URL', { exact: true }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please check');
  await expect(first.getByLabel('Repository URL', { exact: true })).toHaveValue('javascript:alert(1)');
  await expect(first.getByText('Use a full https:// URL.')).toBeVisible();
  expect(state.writes()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('open-code-mobile.png'), fullPage: true });
});

test('failed loading cannot overwrite stored settings with an empty form', async ({ page }) => {
  const state = await mockApi(page, { failedLoad: true });
  await page.goto('/admin/open-code');
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  expect(state.writes()).toBe(0);
});
