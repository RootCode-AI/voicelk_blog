# Contributing to VoiceLK

This repository is `RootCode-AI/voicelk_blog`: the VoiceLK product website.
Model training and datasets belong to their respective repositories. Read the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Choose the right channel

- Use a bug, feature or accessibility issue template for public, non-sensitive work.
- Discuss substantial changes before implementation so the scope can be agreed.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities; never file exploit details
  or credentials in a public issue.
- Email `rootcode.projects@gmail.com` for private conduct or accessibility concerns.

Search existing issues first. Include reproducible steps and environment details,
not production database exports or logs containing personal information.

## Local setup

Use Node.js 22, npm, and a local or dedicated development MongoDB database.
From a clone or fork of this repository:

```sh
npm ci
```

Copy `server/.env.example` to `server/.env` and supply development values.
Never use a production database for contribution testing. Follow the
[README](README.md#getting-started) to create a local administrator if needed.

```sh
npm run dev
```

The client runs on port 5173 and the API on port 5000 by default. Email delivery
can remain disabled locally; the development fallback prints email content to
the console, so do not include those logs in a public report.

## Implementation guidelines

- Keep changes focused and preserve unrelated work.
- Keep secrets on the server. `VITE_*` values are public client configuration.
- Validate API input and preserve authentication for administrative routes.
- Do not expose drafts or subscriber/contact data through HTML, Markdown,
  analytics, logs or discovery endpoints.
- Update shared metadata and page content when changing public routes. Verify
  canonical URLs, status codes and sitemap entries, not just the React view.
- Provide meaningful image descriptions, audio transcripts and usable keyboard
  controls. Follow [ACCESSIBILITY.md](ACCESSIBILITY.md).
- Do not add datasets, voice recordings, screenshots or dependencies without
  checking their permissions and privacy implications.

## Verify your change

```sh
npm run build
npm run test:seo
git diff --check
```

Build first so the production-template smoke test is exercised. The SEO tests
use test fixtures and do not need a live production database. Add regression
coverage when changing behaviour. For UI changes, also check desktop/mobile
layouts, keyboard navigation, reduced motion, and relevant screen-reader output.
Do not reintroduce visitor tracking without an explicit privacy and consent review.
Document anything you could not verify; automated SEO tests are not an accessibility audit.

## Pull requests

Create a focused branch and use the pull request template. Explain the problem,
solution, related issue, verification and any deployment or environment changes.
Include screenshots for visual changes, with secrets and personal data removed.
Update documentation alongside behaviour changes. Do not include `.env` files,
generated `client/dist` output, generated `client/public/og-image.png`, or unrelated
lockfile churn. Maintainers decide review and merge timing; no response SLA applies.

## Licensing is pending

The owner has not selected a repository license. This guide does not grant a
license or require copyright assignment. Before submitting substantial original
code or third-party content, agree on the intended contribution terms with the
maintainers. Dependencies and external assets retain their own licenses.
