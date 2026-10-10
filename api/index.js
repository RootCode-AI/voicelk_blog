import app from '../server/src/app.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const apiPath = url.searchParams.get('__path');
  const pagePath = url.searchParams.get('__page');
  url.searchParams.delete('__page');

  if (apiPath !== null) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = `/api/${apiPath}${query ? `?${query}` : ''}`;
  } else if (pagePath !== null) {
    const query = url.searchParams.toString();
    req.url = `/${pagePath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
