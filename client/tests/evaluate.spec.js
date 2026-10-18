import { test, expect } from '@playwright/test';

// Half a second of silence, so the player can genuinely play in the browser.
function silentWav(seconds = 0.5, rate = 8000) {
  const samples = Math.round(seconds * rate);
  const buffer = Buffer.alloc(44 + samples);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples, 40);
  buffer.fill(128, 44);
  return buffer;
}

const describe = (mean, distribution, ci95 = 0.4) => ({ mean, sd: 0.8, ci95, distribution });
const summary = {
  count: 8,
  passed: 6,
  failed: 2,
  passRate: 0.75,
  criteria: {
    overall: describe(3.88, [0, 1, 1, 4, 2]),
    clarity: describe(4.25, [0, 0, 1, 4, 3]),
    naturalness: describe(3.25, [0, 2, 2, 3, 1]),
  },
};
const empty = { count: 0, passed: 0, failed: 0, passRate: null, criteria: { overall: describe(null, [0, 0, 0, 0, 0], null), clarity: describe(null, [0, 0, 0, 0, 0], null), naturalness: describe(null, [0, 0, 0, 0, 0], null) } };
const clip = (id, title, extra = {}) => ({
  id, title, transcript: 'මම office එකට යනවා.', transcriptFilename: 'greeting.txt', system: 'pathnirwana · 120k',
  audioUrl: `http://127.0.0.1:4173/audio/${id}.wav`, audioFilename: `${id}.wav`, audioType: 'audio/wav', audioSize: 52000,
  active: true, uploadedBy: 'rater@example.com', uploadedByRole: 'evaluator', createdAt: '2026-10-18T08:00:00Z', canManage: true,
  summary, ...extra,
});

async function mockAudio(page) {
  await page.route('**/audio/*.wav', (route) => route.fulfill({ body: silentWav(), contentType: 'audio/wav' }));
}

test('listeners must play a clip, answer every question, and then see it recorded', async ({ page }, testInfo) => {
  await mockAudio(page);
  const sent = [];
  await page.route('**/api/evaluate/samples**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      sent.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { ok: true } });
    }
    return route.fulfill({
      json: {
        samples: [
          { id: 'a1', title: 'Greeting', transcript: 'මම office එකට යනවා.', audioUrl: 'http://127.0.0.1:4173/audio/a1.wav', rated: false },
          { id: 'b2', title: 'Numbers', transcript: 'Meeting එක 3.30ට.', audioUrl: 'http://127.0.0.1:4173/audio/b2.wav', rated: true },
        ],
      },
    });
  });

  // Reduced motion swaps the desktop spring-scroll layer for native scrolling, which
  // Playwright can drive to reach the form below the fold.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/evaluate');
  await expect(page.getByRole('heading', { name: 'How does VoiceLK sound to you?' })).toBeVisible();
  await expect(page.getByText('1 of 2 clips rated')).toBeVisible();
  await expect(page.getByText('your rating for this clip has been recorded')).toHaveCount(1);

  const card = page.getByRole('article', { name: 'Clip 1 · Greeting' });
  const send = card.getByRole('button', { name: 'Send rating' });
  await expect(card.getByText('Play the clip before you rate it.')).toBeVisible();
  await expect(send).toBeDisabled();

  await card.getByRole('button', { name: 'Play' }).click();
  await expect(card.getByText('Answer all four questions to send.')).toBeVisible();
  // Listeners click the visible labels; the radios themselves are visually hidden.
  const choose = async (group, option) => {
    await card.getByRole('group', { name: group }).getByText(option, { exact: true }).click();
    await expect(card.getByRole('group', { name: group }).getByRole('radio', { checked: true })).toHaveCount(1);
  };
  await choose('Overall quality', 'Good');
  await choose('Clarity', 'Excellent');
  await choose('Naturalness', 'Fair');
  await expect(send).toBeDisabled();
  await choose('Pass or fail', 'Pass');
  await card.getByLabel(/Feedback/).fill('“Office” sounded rushed.');
  await page.screenshot({ path: testInfo.outputPath('evaluate-form.png'), fullPage: true });
  await send.click();

  await expect(page.getByText('2 of 2 clips rated')).toBeVisible();
  await expect(page.getByText('All done — thank you!')).toBeVisible();
  expect(sent).toEqual([{ overall: 4, clarity: 5, naturalness: 3, verdict: 'pass', comment: '“Office” sounded rushed.', website: '' }]);
});

test('the console sends signed-out visitors to the evaluator sign-in', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, json: { error: 'Please sign in.' } }));
  await page.goto('/evaluate/console');
  await expect(page).toHaveURL(/\/evaluate\/login$/);
  await expect(page.getByRole('heading', { name: 'Evaluator sign-in' })).toBeVisible();
});

test('evaluators see clip results with charts, and no evaluator management', async ({ page }, testInfo) => {
  await mockAudio(page);
  await page.route('**/api/evaluate/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'e1', role: 'evaluator', email: 'rater@example.com', name: 'Rater' } } });
    if (path.endsWith('/console/samples')) {
      return route.fulfill({ json: { samples: [clip('a1', 'Greeting'), clip('b2', 'Numbers and dates', { summary: { ...summary, count: 5 } }), clip('c3', 'Fresh clip', { summary: empty, active: false })] } });
    }
    if (path.endsWith('/console/samples/a1')) {
      return route.fulfill({
        json: {
          sample: clip('a1', 'Greeting'),
          feedback: [
            { id: 'f1', overall: 4, clarity: 5, naturalness: 3, passed: true, comment: 'Clear but a little flat.', createdAt: '2026-10-18T09:00:00Z' },
            { id: 'f2', overall: 2, clarity: 3, naturalness: 2, passed: false, comment: '', createdAt: '2026-10-18T09:05:00Z' },
          ],
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: 'Not found' } });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/evaluate/console');
  await expect(page.getByRole('heading', { name: 'Clips & results' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Evaluators' })).toHaveCount(0);
  await expect(page.getByText('Mean scores by clip')).toBeVisible();
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('console-clips.png'), fullPage: true });

  await page.getByRole('button', { name: 'Upload clip' }).click();
  await expect(page.getByText('Audio up to 10 MB; text up to 20,000 characters.')).toBeVisible();
  await page.locator('#clip-audio').setInputFiles({ name: 'too-big.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.getByText('Audio files can be at most 10 MB; this one is 10.1 MB.')).toBeVisible();
  await page.locator('#clip-text').setInputFiles({ name: 'greeting.txt', mimeType: 'text/plain', buffer: Buffer.from('\uFEFFමම office එකට යනවා.') });
  await expect(page.locator('#clip-transcript')).toHaveValue('මම office එකට යනවා.');
  await page.screenshot({ path: testInfo.outputPath('console-upload.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('link', { name: 'Greeting', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Greeting' })).toBeVisible();
  await expect(page.getByText('Mean opinion score')).toBeVisible();
  await expect(page.getByText('Rating distribution')).toBeVisible();
  await expect(page.getByText('6 · 75%')).toBeVisible();
  await expect(page.getByText('Clear but a little flat.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('console-results.png'), fullPage: true });

  await page.getByRole('button', { name: 'View data' }).first().click();
  await expect(page.getByRole('cell', { name: '3.88' })).toBeVisible();
});

test('administrators also manage evaluator accounts', async ({ page }) => {
  await page.route('**/api/evaluate/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'a', role: 'admin', email: 'admin@example.com', name: 'Admin' } } });
    if (path.endsWith('/console/evaluators')) {
      return route.fulfill({ json: { evaluators: [{ id: 'e1', email: 'rater@example.com', name: 'Rater', createdBy: 'admin@example.com', createdAt: '2026-10-18T08:00:00Z' }] } });
    }
    return route.fulfill({ json: { samples: [] } });
  });
  await page.goto('/evaluate/console/evaluators');
  await expect(page.getByRole('heading', { name: 'Evaluators', exact: true })).toBeVisible();
  await expect(page.getByText('rater@example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add evaluator' })).toBeVisible();
});

test('the listening page and console fit a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await mockAudio(page);
  await page.route('**/api/evaluate/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'e1', role: 'evaluator', email: 'rater@example.com', name: '' } } });
    if (path.endsWith('/console/samples')) return route.fulfill({ json: { samples: [clip('a1', 'A rather long clip title that needs to wrap')] } });
    return route.fulfill({ json: { samples: [{ id: 'a1', title: 'Greeting', transcript: 'මම office එකට යනවා.', audioUrl: 'http://127.0.0.1:4173/audio/a1.wav', rated: false }] } });
  });
  for (const [path, heading] of [['/evaluate', 'How does VoiceLK sound to you?'], ['/evaluate/console', 'Clips & results']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(1);
  }
});

test('the upload form checks every limit before sending, and explains a rejection from storage', async ({ page }) => {
  const calls = [];
  await page.route('**/api/evaluate/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'e1', role: 'evaluator', email: 'rater@example.com', name: '' } } });
    if (path.endsWith('/console/samples') && route.request().method() === 'GET') return route.fulfill({ json: { samples: [] } });
    calls.push(path);
    if (path.endsWith('/console/uploads')) {
      return route.fulfill({ status: 201, json: { path: 'samples/x.wav', signedUrl: 'http://127.0.0.1:4173/storage/upload', contentType: 'audio/wav' } });
    }
    return route.fulfill({ status: 500, json: { error: 'unexpected' } });
  });
  // Storage itself refuses the file, as the bucket's 10 MB limit would.
  await page.route('**/storage/upload', (route) => route.fulfill({ status: 413, json: { statusCode: '413', message: 'The object exceeded the maximum allowed size' } }));

  await page.goto('/evaluate/console');
  await page.getByRole('button', { name: 'Upload clip' }).click();
  const form = page.locator('form');
  const picker = page.locator('#clip-audio');

  // The picker offers only the accepted types; anything else picked anyway is refused.
  expect(await picker.getAttribute('accept')).toContain('audio/x-m4a');
  await picker.setInputFiles({ name: 'notes.wma', mimeType: 'audio/x-ms-wma', buffer: Buffer.alloc(100) });
  await expect(form.getByText("audio/x-ms-wma files can't be used. Upload MP3, WAV, OGG, WebM, FLAC, M4A or AAC audio.")).toBeVisible();

  // Empty and oversized audio never get as far as the form.
  await picker.setInputFiles({ name: 'empty.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(0) });
  await expect(form.getByText('That audio file is empty.')).toBeVisible();
  await picker.setInputFiles({ name: 'big.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(form.getByText('this one is 10.1 MB')).toBeVisible();

  // Exactly 10 MB is accepted.
  await picker.setInputFiles({ name: 'limit.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(10 * 1024 * 1024) });
  await expect(form.getByText('limit.wav')).toBeVisible();
  await expect(form.getByText('10.0 MB')).toBeVisible();

  // An oversized text file is refused before it is read; over-long text before anything uploads.
  await page.locator('#clip-text').setInputFiles({ name: 'huge.txt', mimeType: 'text/plain', buffer: Buffer.alloc(256 * 1024 + 1, 'a') });
  await expect(form.getByText('keep it under 256 KB')).toBeVisible();
  await page.locator('#clip-transcript').fill('අ'.repeat(20001));
  await expect(form.getByText('20,001 / 20,000')).toHaveClass(/text-danger/);
  await form.getByRole('button', { name: 'Upload clip' }).click();
  await expect(form.getByText('The text can be at most 20,000 characters; this has 20,001.')).toBeVisible();
  expect(calls).toEqual([]);

  // Within limits it uploads; a 413 from storage reads as the size limit, not a raw error.
  await page.locator('#clip-transcript').fill('මම office එකට යනවා.');
  await form.getByRole('button', { name: 'Upload clip' }).click();
  await expect(form.getByRole('alert')).toHaveText('Audio files can be at most 10 MB.');
  expect(calls).toEqual(['/api/evaluate/console/uploads']);
});
