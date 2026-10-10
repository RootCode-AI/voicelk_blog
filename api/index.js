import app, { initializeApp } from '../server/src/app.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const apiPath = url.searchParams.get('__path');

  if (apiPath !== null) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = `/api/${apiPath}${query ? `?${query}` : ''}`;
  }

  await initializeApp();
  return app(req, res);
}
