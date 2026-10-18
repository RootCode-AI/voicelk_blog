# VoiceLK

VoiceLK is a Sinhala-English text-to-speech product built from research.
This repository contains its product website, with Journey updates, supporting
Research results, an admin editor powered by React and Express/MongoDB, and a
listening evaluation on Supabase.
The model-training pipeline lives separately in `voicelk_ml`.

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

The product website for VoiceLK, a Sinhala–English text-to-speech product.
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
# later: npm run delete-admin -- --list, then npm run delete-admin -- old@example.com
npm run dev                                 # API on :5000, site on http://localhost:5173
```

The admin panel is at <http://localhost:5173/admin>.

## Accounts and roles

| Role | Signs in at | Can |
| --- | --- | --- |
| Admin | `/admin/login` | Everything: all posts, subscribers, messages, bloggers, the evaluation console |
| Blogger | `/write/login` | Write, publish, edit and delete **their own** posts, and upload images and audio for them |
| Evaluator | `/evaluate/login` | Upload clips to the listening evaluation and read its results |

Bloggers cannot see other people's posts, subscribers or messages, feature posts on the
home page, email subscribers, or open `/admin`; each role has its own session cookie, so
signing in as one never opens another's pages. Admins see every post (a blogger's is
marked "by Name (blogger)") and can edit any of them. Removing a blogger signs them out at
once and leaves their posts on the site.

```powershell
npm run create-admin -- you@example.com "a long password" "Your Name"
npm run create-blogger -- writer@example.com "a long password" "Their Name"   # or Admin > Bloggers
```

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

## Email

- **Welcome:** everyone who subscribes is sent a welcome email straight away. If it
  could not be sent at the time, entering the same address again sends it.
- **Newsletter:** subscriptions are active immediately; confirmation links remain
  supported for older pending subscriptions. When you
  publish, tick *Email subscribers when I publish*, or press the mail icon on the
  dashboard later. Every email carries a one-click unsubscribe link.
- **Contact form:** messages are saved to the database (Admin → Messages) and forwarded
  to `CONTACT_TO`.

**Sending through Gmail (current setup).** Mail comes from `rootcode.projects@gmail.com`,
shown as "VoiceLK", and replies go to `CONTACT_TO`. No domain needs verifying.

1. Turn on 2-Step Verification for the Google account (myaccount.google.com → Security).
2. Create an app password: myaccount.google.com/apppasswords → name it "VoiceLK" → copy
   the 16 characters it shows. Your normal Gmail password will not work.
3. Set `SMTP_USER=rootcode.projects@gmail.com` and `SMTP_PASS=<app password>` in
   `server/.env` and in Heroku Config Vars. The server log then says
   `[mail] sending through smtp.gmail.com …`, and `/api/health` reports `"mail":"smtp"`.

A personal Gmail account sends to about 500 recipients a day. **Resend** is used instead
when `SMTP_USER`/`SMTP_PASS` are empty: it needs a domain verified at resend.com/domains and
`MAIL_FROM` on that domain, because `onboarding@resend.dev` only reaches your own Resend
address (health then reports `"resend-test-sender"`). With neither configured, emails are
printed to the server console.

## Listening evaluation (`/evaluate`)

A public listening test for real users, plus a separate console for the team. It runs on
**Supabase**; the rest of the site stays on MongoDB.

- **`/evaluate`**: anyone can play each clip, read the text it came from, and rate it:
  overall quality, clarity and naturalness (1–5 each), pass or fail, and optional written
  feedback. Each IP address can send one response per clip. Only a keyed one-way hash of
  the address is stored (`FEEDBACK_IP_SECRET`), never the address itself. The page is
  public but kept out of search results and the sitemap.
- **`/evaluate/console`**: evaluators sign in at `/evaluate/login` to upload an audio file
  (≤ 10 MB) with its `.txt` text file, and to read the results for each clip: mean opinion
  scores with 95% confidence intervals, the rating spread, the pass rate and listener
  comments. Responses can be exported as CSV. Blog administrators are recognised
  automatically and are the only ones who can add or remove evaluators. An evaluator
  cannot open `/admin`.

Setup:

1. Apply [`server/supabase/evaluation.sql`](server/supabase/evaluation.sql): paste it into
   the Supabase SQL editor, or run `npm run db:setup` with `SUPABASE_DB_URL` (Dashboard →
   Connect → Session pooler) in `server/.env`.
   It creates the tables (row level security on, no public policies) and the
   `evaluation-audio` storage bucket, capped at 10 MB and audio types.
2. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the `sb_secret_…` key from Project
   Settings → API Keys) and `FEEDBACK_IP_SECRET` in `server/.env` and in Heroku Config Vars. The
   secret key is server-only. The publishable key and the JWKS URL aren't used: the
   browser never talks to Supabase directly, and the blog doesn't use Supabase Auth.
3. Add evaluators from the console, or with
   `npm run create-evaluator -- rater@example.com "a long password" "Their Name"`.

Audio never passes through the API, so 10 MB clips never occupy the server. The
API checks the uploader's role, size and type and returns a signed upload URL, and the
browser uploads straight to Supabase Storage. Before saving the clip, the API checks the
stored object again.
Without the Supabase variables, the rest of the site runs normally and `/api/evaluate`
answers 503.

## Customising

- `client/src/site.config.js` holds the repository links, team members, pipeline steps
  and tagline. A repository card with an empty `url` shows "Link coming soon".
- `client/.env` → `VITE_HERO_VIDEO_URL` sets a looping background video for the hero
  (flipped vertically, under a white wash, as in the design). Without it, the hero shows
  an animated waveform.
- Design tokens (colours, shadows, fonts) are in the `@theme` block of
  `client/src/index.css`.
- **Logo:** every brand image comes from `assets/brand/voicelk-logo.png`. Before each
  `dev` and `build`, `scripts/build-brand-assets.js` turns it into these generated, untracked files:
  - the book and wordmark images, drawn in the site's ink black (the same black as its
    text and buttons; change `INK` in the script and in `Brand.jsx` together)
  - the favicon, Apple and app icons, and `site.webmanifest`
  - the logo used on the social share card

  `client/src/components/Brand.jsx` redraws the five sound bars as SVG. They speak when
  the logo first appears and on hover, and keep moving while a page loads or a clip
  plays. They go silent on the 404 page and stay still for visitors who prefer
  reduced motion. To change the logo, replace the PNG. If its layout changes,
  re-measure the regions at the top of the script and in `Brand.jsx`.

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
- `/terms`: Terms of Use for the product website, code/media reuse and subscriptions.
- `/faq`: Accessible expandable answers about the product, its research origins, samples and updates.
- The homepage has a prominent **Read the research** CTA and newsletter subscription
  form. The homepage subscription helper text and FAQ button are intentionally removed.
  The contact form and footer retain links to the Privacy Policy. The footer links to
  all new pages. Missing pages have a custom 404 with
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

### Analytics

Visitor analytics and its preference controls have been removed. The application
does not load any analytics SDK or send visitor analytics events. Hosting
logs, external fonts/media and necessary administrator cookies are separate and
are described in the Privacy Policy. Previously stored browser preferences are
no longer read. This removal does not delete historical provider data.

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
pages, metadata, sitemap/Markdown discovery, alt validation, analytics removal,
404s and production server routing. Also manually check links,
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
return HTTP 503. Set `SITE_PREVIEW=true` on a staging or review app to mark every page `noindex`.

`/sitemap.xml` lists the home, journal, about and published article URLs with article
modification dates. It updates from MongoDB automatically (cached for up to five minutes). `/robots.txt` advertises it. Blog pagination has crawlable links and distinct
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
  and `predev` scripts use Sharp to generate the PNG; Vite copies it into `client/dist`.
  Sharp is a regular dependency, not a dev one, so production-mode installs (which skip
  dev dependencies) can still build. The server only serves the finished image.
- The sitemap includes published cover images using Google's image sitemap namespace.
  WebSite/Organization structured data stays consistent during client navigation.

The LLM guide and Markdown content are served dynamically by the Express server. The
social card is served as a static file. These features do not require public database secrets.

## Deploying to Heroku

The whole site runs as one Node process: Express renders every page (with its SEO
metadata) and serves the built client, the brand images and the API. Deploy the
**repository root**; the `Procfile` starts it with `npm start`.

1. **Create the app:** Heroku Dashboard → New → Create new app.
2. **Config Vars** (Settings → Reveal Config Vars): everything in `server/.env.example`
   except `SUPABASE_DB_URL` and `SUPABASE_DB_CA`, which are for local setup only and hold
   the database password. Set `NODE_ENV=production`, and `PUBLIC_URL` and `CLIENT_ORIGIN`
   to the app's address (`https://<app>.herokuapp.com`, or `https://voicelk.dev` once the
   domain is attached). Heroku sets `PORT` itself.
3. **MongoDB Atlas → Network Access:** allow `0.0.0.0/0`; Heroku has no fixed IP addresses.
4. **Deploy:** Deploy → GitHub → connect the repository → choose the branch → Deploy
   Branch (or turn on automatic deploys). Heroku installs the dependencies, runs the root
   `build` script (which generates the brand images, icons and social card with `sharp`,
   then builds the client), and prunes dev dependencies.
5. **Check** `https://<app>.herokuapp.com/api/health`: it should report
   `{"ok":true,"mail":"resend","evaluation":"supabase"}`. If a page says "temporarily
   unavailable", More → View logs shows the `[error]` line with the database error.
6. **Custom domain:** Settings → Domains → Add `voicelk.dev`, point your DNS at the target
   Heroku shows, turn on Automatic Certificate Management, then update `PUBLIC_URL` and
   `CLIENT_ORIGIN` to `https://voicelk.dev`.

In production the server redirects plain `http://` to `https://` (Heroku's router accepts
both) and compresses its responses; built scripts and styles are cached for a year.
Node 22 is pinned in `package.json`. On any other host, run `npm run build` and `npm start`.

Run `npm run test:seo` and `npm run build` before deploying. After deploying:

1. View page source for a published `/blog/<slug>`: its title, canonical URL and body
   should be present without executing JavaScript. Check `/sitemap.xml` and `/robots.txt`.
2. Add the `voicelk.dev` domain property to Google Search Console, verify its DNS record,
   and submit `https://voicelk.dev/sitemap.xml`. Use URL Inspection for the homepage and
   a published post, and test the post with Google's Rich Results Test.
3. Set your hosting provider's preferred domain to `voicelk.dev` and redirect alternate
   production domains to it. Keep staging apps on `SITE_PREVIEW=true`.
4. Give posts descriptive titles, unique excerpts, real author names, cover-image alt
   text and useful internal links. Include transcripts alongside speech samples.

Technical SEO makes pages discoverable; indexing, rankings and rich results are decided
by search engines. Search Console verification and deployment are separate account actions.

### Journey and Research publishing

- `/journey` covers problems, experiments, development decisions and lessons learned.
- `/research` presents findings, evaluation results, speech samples and outcomes.
- Sign in at `/admin/login`, choose **Add post**, and select **Journey** or
  **Research** under **Post settings → Section**. Write the content using the
  existing text, image, chart, table, code and audio blocks, then **Save draft**
  or **Publish**. Only published posts are public; emailing subscribers is optional.
- The admin dashboard supports section and publication-status filters. Edit a post
  and change its section to move it between these pages without changing its URL.
- Existing posts without a section are treated as Journey. No database migration
  or automatic rewriting of existing posts is required. Individual `/blog/<slug>`
  URLs remain stable, and `/blog` remains the combined archive for old links.
- Both sections have dedicated metadata, sitemap entries and Markdown pages
  (`/journey.md`, `/research.md`) linked from `/llms.txt`.
- Run `npm run test:sections` for backend section validation and filtering tests;
  `npm run test:ui` also checks the editor's save/publish/reclassify workflow using
  mocked API responses, without writing to MongoDB or sending email.

### Browser layout tests

Run `npm run build`, then `npx playwright install chromium` once and `npm run test:ui`.
The browser tests use a local preview and mocked API responses, so no MongoDB
credentials or real subscriptions are needed. They check desktop, tablet, phone
and landscape layouts, first-screen desktop actions, and mobile navigation.
Screenshots and failure traces are written to the ignored `test-results/` folder.
To use an installed Edge or Chrome browser instead, set `UI_BROWSER_CHANNEL` to
`msedge` or `chrome` before running the tests.
