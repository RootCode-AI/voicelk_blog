import { test, expect } from '@playwright/test';

const post = (id, title, status, extra = {}) => ({
  _id: id, title, slug: id, status, section: 'journey', tags: ['g2p'], author: 'Anna',
  publishedAt: status === 'published' ? '2026-10-18T08:00:00Z' : null, updatedAt: '2026-10-18T09:00:00Z', ...extra,
});

test('signed-out visitors to the writing desk are sent to the writer sign-in', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, json: { error: 'Please sign in to write.' } }));
  await page.goto('/write');
  await expect(page).toHaveURL(/\/write\/login$/);
  await expect(page.getByRole('heading', { name: 'Writer sign-in' })).toBeVisible();
});

test("a blogger's desk lists their posts and offers no admin-only options", async ({ page }, testInfo) => {
  const requested = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    if (url.pathname === '/api/write/auth/me') return route.fulfill({ json: { user: { id: 'b1', email: 'anna@example.com', name: 'Anna', role: 'blogger' } } });
    if (url.pathname === '/api/write/posts') return route.fulfill({ json: { posts: [post('p1', 'Teaching VITS to code-switch', 'published'), post('p2', 'Draft on G2P', 'draft')] } });
    if (url.pathname === '/api/write/posts/p1') return route.fulfill({ json: { post: { ...post('p1', 'Teaching VITS to code-switch', 'published'), excerpt: '', coverImage: { url: '', alt: '' }, blocks: [] } } });
    return route.fulfill({ status: 404, json: { error: 'Not found' } });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/write');
  await expect(page.getByRole('heading', { name: 'My posts' })).toBeVisible();
  await expect(page.getByText('Teaching VITS to code-switch')).toBeVisible();
  await expect(page.getByText('Draft on G2P')).toBeVisible();
  await expect(page.getByText('Subscribers', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Email subscribers' })).toHaveCount(0);
  await expect(page.locator('main').getByText('1', { exact: true }).first()).toBeVisible();
  expect(requested).not.toContain('/api/admin/stats');
  await page.screenshot({ path: testInfo.outputPath('writer-desk.png'), fullPage: true });

  await page.getByRole('link', { name: 'Edit' }).first().click();
  await expect(page).toHaveURL(/\/write\/posts\/p1$/);
  await expect(page.getByLabel('Author')).toHaveValue('Anna');
  await expect(page.getByText('Featured post')).toHaveCount(0);
  await expect(page.getByText('Email subscribers when I publish')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to posts' }).click();
  await expect(page).toHaveURL(/\/write$/);

  await page.getByRole('link', { name: 'Add post' }).first().click();
  await expect(page).toHaveURL(/\/write\/posts\/new$/);
  expect(requested.some((p) => p.startsWith('/api/admin'))).toBe(false);
});

test('administrators add and see bloggers on their own admin page', async ({ page }, testInfo) => {
  const added = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { admin: { id: 'a', email: 'admin@example.com', name: 'Admin' } } });
    if (url.pathname === '/api/admin/bloggers' && route.request().method() === 'POST') {
      added.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { blogger: {} } });
    }
    if (url.pathname === '/api/admin/bloggers') {
      return route.fulfill({ json: { bloggers: [{ _id: 'b1', email: 'anna@example.com', name: 'Anna', createdBy: 'admin@example.com', createdAt: '2026-10-18T08:00:00Z', published: 3, drafts: 1 }] } });
    }
    return route.fulfill({ json: {} });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/bloggers');
  await expect(page.getByRole('heading', { name: 'Bloggers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bloggers' })).toBeVisible();
  await expect(page.getByText('anna@example.com')).toBeVisible();
  await expect(page.getByText('3 published')).toBeVisible();

  await page.getByLabel('Email').fill('ben@example.com');
  await page.getByLabel('Name').fill('Ben');
  await page.getByLabel('Password').fill('ben-password-123');
  await page.getByRole('button', { name: 'Add blogger' }).click();
  await expect.poll(() => added.length).toBe(1);
  expect(added[0]).toEqual({ email: 'ben@example.com', name: 'Ben', password: 'ben-password-123' });
  await page.screenshot({ path: testInfo.outputPath('admin-bloggers.png'), fullPage: true });
});
