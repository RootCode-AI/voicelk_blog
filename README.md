# VoiceLK Journal

VoiceLK's research journal for Sinhala-English code-switched text-to-speech:
publish experiments, evaluation results and audio samples through a React frontend
and an Express/MongoDB backend. This repository contains the journal website,
not the model-training pipeline in `voicelk_ml`.

## Community and project information

- [Contributing](CONTRIBUTING.md): local setup, verification and pull requests.
- [Code of Conduct](CODE_OF_CONDUCT.md): community expectations and private reporting.
- [Security policy](SECURITY.md): report vulnerabilities privately, not in public issues.
- [Accessibility](ACCESSIBILITY.md): goals, known limitations and reporting barriers.
- [Repository setup checklist](.github/REPOSITORY_SETUP.md): About description,
  licensing decision and administrator-only reporting settings.

Use the repository's issue chooser for bug, feature and accessibility reports.
Security and conduct reports go to `rootcode.projects@gmail.com`.

**License status:** a project license has not been selected. Public source access
does not itself grant an open-source license. Do not assume code, research media,
datasets or model weights share a license; check each asset's stated terms.

The research blog for VoiceLK, a Sinhala–English code-switched text-to-speech project.
It has two parts: a React + Vite client and an Express API backed by MongoDB, with Resend
sending the email.

```
blog/
├── client/   React 19 · Vite · Tailwind v4 · Motion (Framer Motion) · Recharts · KaTeX
└── server/   Express 5 · Mongoose · GridFS uploads · Resend
```

## Getting started

Requires Node 22 and a MongoDB database (local, or a free Atlas cluster).

```powershell
cd "D:\RUSL\Final Project\TTS\blog"
npm install
copy server\.env.example server\.env        # then fill in MONGODB_URI and JWT_SECRET
npm run create-admin -- you@example.com "a long password" "Your Name"
npm run dev                                 # API on :5000, site on http://localhost:5173
```

The admin panel is at <http://localhost:5173/admin>.

## Writing a post

Click **Add blog**. A post is a list of **blocks**, and readers see them in exactly the
order you arrange them:

| Block | What it's for |
| --- | --- |
| Text | Markdown: paragraphs, lists, links, tables, `$inline$` and `$$display$$` maths, fenced code |
| Heading | Section titles (H2 and H3 also build the post's table of contents) |
| Image | Upload, drop or paste an image, or link to one; column, wide or full-bleed width |
| Graph | Bar, line, area or donut chart drawn from a pasted table (CSV, or copied from Excel/Sheets) |
| Table | A data table from pasted rows |
| Equation | Display maths in LaTeX (KaTeX) |
| Code | Syntax-highlighted code with a filename and a copy button |
| Audio | Speech samples with a player and transcript |
| Video | YouTube, Vimeo or an uploaded mp4/webm |
| Quote, Callout, Divider | Editorial structure |

To place a block, hover between two blocks and press **+**, or use the button at the end
of the post. Drag the grip or use the arrows to reorder. Pasting an image into a text
block inserts an image block right below it. **Preview** shows the post exactly as readers
will see it, and **Ctrl + S** saves.

Uploaded files are stored in MongoDB (GridFS) and served from `/api/media/<id>`, with
range support so audio can seek. No separate file storage is needed.

## Email (Resend)

- **Newsletter:** subscriptions are active immediately; confirmation links remain
  supported for older pending subscriptions. When you
  publish, tick *Email subscribers when I publish*, or press the mail icon on the
  dashboard later. Every email carries a one-click unsubscribe link.
- **Contact form:** messages are saved to the database (Admin → Messages) and forwarded
  to `CONTACT_TO`.

When `RESEND_API_KEY` is empty, emails are printed to the API console instead of sent, so
development needs no account. To send real email, verify a domain in Resend and set
`MAIL_FROM` to an address on it. `onboarding@resend.dev` only delivers to your own Resend
login address.

## Customising

- `client/src/site.config.js` holds the repository links, team members, pipeline steps
  and tagline. A repository card with an empty `url` shows "Link coming soon".
- `client/.env` → `VITE_HERO_VIDEO_URL` sets a looping background video for the hero
  (flipped vertically, under a white wash, as in the design). Without it, the hero shows
  an animated waveform.
- Design tokens (colours, shadows, fonts) are in the `@theme` block of
  `client/src/index.css`.

## Smooth scrolling

`client/src/components/motion/SmoothScroll.jsx` drives page scrolling through a Motion
spring. It is turned off on touch screens and for readers who prefer reduced motion.
Because the page content sits in a transformed layer, anything that must be
`position: fixed` (modals, the reading-progress bar, toasts) renders through `<Portal>`.

## Production

```powershell
npm run build     # builds client/dist
npm start         # the API also serves the built site on PORT
```

Set `NODE_ENV=production` (secure cookies), a strong `JWT_SECRET`, and `PUBLIC_URL` to the
public address so email links point to the right place.

## Search engine optimization

### Launch checklist and public pages

- `/privacy`: Privacy Policy, with `rootcode.projects@gmail.com` as the public contact.
- `/terms`: Terms of Use for the research journal, code/media reuse and subscriptions.
- `/faq`: Accessible expandable answers about the project, research, samples and updates.
- The homepage has a prominent **Read the research** CTA and newsletter subscription
  form. Contact and subscribe forms link to the Privacy Policy. The footer links to
  all new pages and analytics preferences. Missing pages have a custom 404 with
  recovery links, HTTP 404 status, and `noindex`.
- Every public page has its own title, description, canonical URL and OG/Twitter
  tags. `robots.txt` (the correct spelling), the dynamic image sitemap, `llms.txt`
  and the generated 1200 x 630 OG image remain enabled. New public pages appear in
  the sitemap and have Markdown alternates automatically.

Public informational text is shared in `shared/pages.js`, so React, initial HTML and
Markdown responses use the same wording. The legal pages are **drafts for operator
review, not legal advice or a certification of compliance**. Before publishing,
confirm the operator identity, hosting/database/email providers and regions,
retention periods, privacy-request handling and any applicable legal requirements.
The site currently has no automatic contact/subscriber deletion schedule, and the
policy explicitly states this. The public contact address does not change SMTP,
Resend or `CONTACT_TO` credentials.

### Analytics and privacy choices

Vercel Web Analytics is integrated but **off until the visitor opts in**. A small
preferences panel offers Allow analytics and No thanks; the footer reopens it.
The decision is stored locally under `voicelk-analytics-consent`. Do Not Track and
Global Privacy Control override opt-in. Revoking consent prevents subsequent events;
it does not delete events already sent. Storage failures leave tracking disabled.

The integration only sends public page views on production `https://voicelk.dev`.
Query strings and fragments are stripped, admin/newsletter-action/API/unknown paths
are excluded, and no form or custom events are sent. The analytics SDK is not mounted
before permission is given. Other site resources (fonts, media and operational
hosting requests) are separate from this optional analytics choice.

In the Vercel project dashboard, enable **Web Analytics**, redeploy, allow analytics
on the production site and verify visits appear. Dashboard activation and live data
collection have not been performed by the local code changes. See
[Vercel setup](https://vercel.com/docs/analytics/quickstart) and
[privacy documentation](https://vercel.com/docs/analytics/privacy-policy).

### Image accessibility

Provide accurate visual descriptions in cover and image-block alt fields. The API
rejects publishing (or updating a published post) if a cover, informative image block,
or inline/reference Markdown image lacks alt text. Drafts can still be saved. For
pure decoration, use the image block's **Decorative image** checkbox; it deliberately
renders `alt=""`, following accessibility conventions. For Markdown, use
`![Description of the figure](URL)`; decorative assets belong in image blocks.

Rendering includes alt attributes for article covers, cards, image blocks/lightboxes,
Markdown and editor previews. Existing records are **not rewritten**: contextual
fallbacks avoid silent informative images, but are not substitutes for authored
descriptions. Review older published images in the editor before relaunching.
See [W3C alt-text guidance](https://www.w3.org/WAI/tutorials/images/decision-tree/).

Run `npm run build` then `npm run test:seo` before release. Tests cover new public
pages, metadata, sitemap/Markdown discovery, alt validation, analytics URL filtering,
404s and production server routing. Also manually check consent choices, links,
FAQ keyboard controls and forms on desktop and mobile before public deployment.

The canonical site is `https://voicelk.dev`, configured in `shared/seo.js`.
Use `PUBLIC_URL=https://voicelk.dev` and `CLIENT_ORIGIN=https://voicelk.dev` in production
so email links and browser requests use the same address. Never expose MongoDB or JWT
secrets through `VITE_*` variables.

Public page requests now return their title, description, canonical URL, Open Graph /
Twitter tags, structured data and readable HTML before JavaScript runs. React then
enhances the page. Article snapshots include the published blocks, tables, captions
and audio transcripts; only published posts are discoverable. Admin and newsletter
pages return `noindex`, missing pages return HTTP 404, and temporary database failures
return HTTP 503. Vercel preview deployments are also marked `noindex`.

`/sitemap.xml` lists the home, journal, about and published article URLs with article
modification dates. It updates from MongoDB automatically (up to five minutes of CDN
cache). `/robots.txt` advertises it. Blog pagination has crawlable links and distinct
canonical URLs. Search and tag filters are not indexed.

### AI-readable content and social previews

- `/llms.txt` is a concise Markdown discovery guide with project links and up to 30
  recent published notes. It updates from the database; drafts and private data are
  never queried by this endpoint. This follows the [llms.txt proposal](https://llmstxt.org/),
  not a guaranteed ranking signal or permission to reuse content.
- `/index.md`, `/about.md`, `/blog.md?page=2`, and `/blog/<slug>.md` expose public
  content as UTF-8 Markdown, including tables and audio transcripts. HTML pages link
  to these alternates. Markdown responses point to canonical HTML via HTTP `Link`
  headers and use `noindex` to avoid duplicate search results. Unpublished notes
  return 404; database failures return 503. No generated article snapshots are stored.
- `/og-image.png` is the default 1200 x 630 PNG for Open Graph and Twitter cards.
  Posts with valid cover images override it. Dimensions are declared only for the
  known-size default, and both formats include image alt text.
- Edit `assets/og-image.svg` to change the default social card. The client `prebuild`
  and `predev` scripts use the Sharp development dependency to generate the PNG;
  Vite copies it into `client/dist`. Install dev dependencies for builds (`npm ci`).
  The server only serves the finished image; it does not need Sharp at runtime.
- The sitemap includes published cover images using Google's image sitemap namespace.
  WebSite/Organization structured data stays consistent during client navigation.

The LLM guide and Markdown content are served dynamically on Vercel through the
existing catch-all function route, and on standalone Express hosting. The social
card is served as a static file. These features do not require public database secrets.

Deploy the **repository root** as one Vercel project using the included `vercel.json`.
The function must include `client/dist/index.html`; the configuration already declares
this. Deploying only the static `client` folder bypasses server SEO and article status
codes. On standalone hosting, run `npm run build` and `npm start`.

Vercel uses `npm ci --include=dev --include=optional` for the build installation.
Keep these flags: the OG-image generator imports the build-only `sharp` dependency,
and Sharp uses platform-specific optional packages. Plain `npm ci` can omit dev
dependencies when `NODE_ENV=production` or npm omit settings are present, causing
`ERR_MODULE_NOT_FOUND: Cannot find package 'sharp'` during `prebuild`. Keep production
mode enabled; explicitly include build dependencies instead. See
[npm's include/omit behaviour](https://docs.npmjs.com/cli/v11/commands/npm-ci/#include).
No dependency version or lockfile change is required for this installation fix.

If this error occurs, push the updated `vercel.json` and deploy that new commit.
Confirm the build log's install command contains both include flags. The repository
pins Node 22; set the Vercel project's Node version to 22.x to remove the harmless
warning about a conflicting project default. That warning is not the Sharp error.

Run `npm run test:seo` and `npm run build` before deploying. After deploying:

1. View page source for a published `/blog/<slug>`: its title, canonical URL and body
   should be present without executing JavaScript. Check `/sitemap.xml` and `/robots.txt`.
2. Add the `voicelk.dev` domain property to Google Search Console, verify its DNS record,
   and submit `https://voicelk.dev/sitemap.xml`. Use URL Inspection for the homepage and
   a published post, and test the post with Google's Rich Results Test.
3. Set your hosting provider's preferred domain to `voicelk.dev` and redirect alternate
   production domains to it. Keep Vercel previews protected.
4. Give posts descriptive titles, unique excerpts, real author names, cover-image alt
   text and useful internal links. Include transcripts alongside speech samples.

Technical SEO makes pages discoverable; indexing, rankings and rich results are decided
by search engines. Search Console verification and deployment are separate account actions.
