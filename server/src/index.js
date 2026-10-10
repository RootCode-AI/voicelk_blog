import { config } from './config.js';
import app, { initializeApp } from './app.js';

await initializeApp();
app.listen(config.port, () => {
  console.info(`[api] listening on http://localhost:${config.port}`);
});
