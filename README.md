# VoiceLK Journal

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

- **Newsletter:** double opt-in. Readers subscribe, then confirm by email. When you
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
