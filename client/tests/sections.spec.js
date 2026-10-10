import { test, expect } from '@playwright/test';

const sample = (section) => ({
  _id: section, section, slug: `${section}-note`, title: section === 'research' ? 'Evaluation outcomes' : 'Solving training problems',
  excerpt: 'A manually written update.', tags: ['tts'], publishedAt: '2026-10-01', readingMinutes: 2,
});

test('Journey and Research keep listing, tags, search and pagination separate', async ({ page }, testInfo) => {
  const requests = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const section = url.searchParams.get('section');
    if (url.pathname.endsWith('/tags')) return route.fulfill({ json: { tags: [{ tag: 'tts', count: 1 }] } });
    if (url.pathname.endsWith('/posts')) {
      const post = sample(section);
      const next = url.searchParams.get('page') === '2';
      return route.fulfill({ json: { posts: [{ ...post, _id: `${section}-${next}`, title: next ? `${post.title} continued` : post.title }], page: next ? 2 : 1, pages: 2, total: 2 } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/journey');
  await expect(page.getByRole('heading', { name: 'Our product journey' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Solving training problems', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evaluation outcomes' })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Read the research' }).click();
  await expect(page).toHaveURL(/\/research$/);
  await expect(page.getByRole('heading', { name: 'Results & outcomes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results & outcomes' })).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('research.png') });
  await expect(page.getByRole('heading', { name: 'Evaluation outcomes', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Solving training problems' })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search notes' }).fill('evaluation');
  await expect(page).toHaveURL(/\/research\?q=evaluation/);
  await page.getByRole('button', { name: 'tts 1' }).click();
  await expect(page.getByRole('link', { name: 'Load more notes' })).toHaveAttribute('href', '/research?tag=tts&q=evaluation&page=2');
  // The desktop page uses a fixed, spring-driven content layer: scroll as a reader would.
  await page.mouse.wheel(0, 600);
  await expect(page.getByRole('link', { name: 'Load more notes' })).toBeInViewport();
  await page.getByRole('link', { name: 'Load more notes' }).click();
  await expect(page.getByRole('heading', { name: 'Evaluation outcomes continued' })).toBeVisible();
  expect(requests.filter((url) => url.pathname.endsWith('/posts') || url.pathname.endsWith('/tags')).every((url) => ['journey', 'research'].includes(url.searchParams.get('section')))).toBe(true);
  expect(requests.some((url) => url.searchParams.get('section') === 'research' && url.searchParams.get('page') === '2' && url.searchParams.get('q') === 'evaluation' && url.searchParams.get('tag') === 'tts')).toBe(true);
});

test('admin can manually create, publish and reclassify a post', async ({ page }, testInfo) => {
  let saved;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { admin: { name: 'Test editor', email: 'editor@example.test' } } });
    if (path.startsWith('/api/admin/posts')) {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        saved = { ...request.postDataJSON(), _id: 'test-post', updatedAt: '2026-10-10', publishedAt: '2026-10-10' };
      }
      return route.fulfill({ json: { post: saved } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/admin/posts/new');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Manual evaluation results');
  await page.getByRole('textbox', { name: 'Excerpt', exact: true }).fill('Our model evaluation outcomes.');
  await page.getByPlaceholder(/^Write here\./).fill('## Evaluation\n\nWe compared the baseline and trained model using listening tests.');
  await page.getByLabel('Section', { exact: true }).selectOption('research');
  await page.screenshot({ path: testInfo.outputPath('admin-research-editor.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/test-post$/);
  expect(saved.section).toBe('research');
  expect(saved.status).toBe('draft');
  expect(saved.blocks[0].data.markdown).toContain('listening tests');
  await page.reload();
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('research');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toBeVisible();
  expect(saved.status).toBe('published');
  await page.getByLabel('Section', { exact: true }).selectOption('journey');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
  expect(saved.section).toBe('journey');
  expect(saved.slug).toBe('manual-evaluation-results');
});

test('admin dashboard combines section and publication filters', async ({ page }) => {
  let latestQuery;
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { admin: { name: 'Test editor' } } });
    if (url.pathname === '/api/admin/posts') {
      latestQuery = url.searchParams;
      const posts = ['journey', 'research'].filter((section) => !latestQuery.get('section') || latestQuery.get('section') === section)
        .map((section) => ({ ...sample(section), status: latestQuery.get('status') || 'draft', updatedAt: '2026-10-10' }));
      return route.fulfill({ json: { posts } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/admin');
  await expect(page.getByRole('link', { name: /Evaluation outcomes/ })).toBeVisible();
  await page.getByLabel('Filter by section').selectOption('research');
  await expect(page.getByRole('link', { name: /Solving training problems/ })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Published', exact: true }).click();
  await expect.poll(() => latestQuery.get('status')).toBe('published');
  expect(latestQuery.get('section')).toBe('research');
  await page.getByLabel('Filter by section').selectOption('journey');
  await expect(page.getByRole('link', { name: /Solving training problems/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Evaluation outcomes/ })).toHaveCount(0);
});
