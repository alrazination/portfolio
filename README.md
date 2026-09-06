# Razin Abdullah — Portfolio Website

A single-page portfolio for Razin Abdullah, Learning Experience Designer. Pure HTML, CSS and vanilla JavaScript — no build step, no framework, no server. Works as a static site and deploys directly to GitHub Pages.

## File structure

```
ra-portfolio/
├── index.html               ← the whole site
├── css/style.css
├── js/main.js                ← config, project data, all interactivity
├── assets/
│   ├── images/
│   │   ├── hero-poster.svg   ← placeholder, replace with hero-poster.webp
│   │   ├── projects/         ← project cover images
│   │   └── services/
│   ├── videos/
│   │   ├── hero.mp4          ← not included yet, see below
│   │   └── projects/
│   ├── icons/
│   └── documents/            ← put CV/PDF here
└── projects/
    ├── project-01.html       ← placeholder case-study pages
    ├── project-02.html
    └── project-03.html
```

## What's placeholder right now

- **Hero video** — there is no `assets/videos/hero.mp4` yet. The hero currently shows a dark navy placeholder graphic (`hero-poster.svg`) instead. The site is built to use a real video the moment you add one — nothing else needs to change.
- **Project images** — `project-01.svg` / `-02.svg` / `-03.svg` are abstract placeholder graphics standing in for real screenshots or photos.
- **Project links** — all three "Selected Work" cards currently link to placeholder pages in `/projects/` that say "coming soon."
- **Email / LinkedIn** — intentionally blank until you provide them (see below). The site does not invent contact details.

## How to change the hero video

1. Export a compressed, web-friendly `.mp4` (H.264, ideally under ~8–10MB for a ~15–20s loop).
2. Save it as `assets/videos/hero.mp4`, replacing the existing filename exactly.
3. Optionally generate a matching still frame and save it as `assets/images/hero-poster.webp`, then update this line in `js/main.js`:
   ```js
   heroPoster: "assets/images/hero-poster.webp",
   ```
   and this line in `index.html`:
   ```html
   poster="assets/images/hero-poster.webp"
   ```

**Large video files:** GitHub repositories aren't a great home for large video files. For anything beyond a small, well-compressed loop, host the video on a CDN or video platform (e.g. Cloudflare Stream, Mux, Vimeo's direct file URL, or an S3 bucket) and point `heroVideo` in `js/main.js` — and the `<source src="...">` in `index.html` — at that external URL instead.

## How to add images

- General images: `assets/images/`
- Project cover images: `assets/images/projects/`
- Service illustrations (optional, not wired up by default): `assets/images/services/`

Use `.webp` where possible for smaller file sizes.

## How to add a project

Open `js/main.js` and find the `projects` array near the top. Duplicate one object and edit the fields:

```js
{
  title: "Your Project Title",
  category: "Simulation Learning",       // shown as the small label
  image: "assets/images/projects/project-04.webp",
  description: "One or two sentences describing the project.",
  cta: "View project",                    // button text
  link: "https://example.com"             // or "" to auto-generate a placeholder page
}
```

That's the only place you need to edit — the "Selected Work" carousel renders itself from this array. Order in the array = order on the page.

## How to add a PDF (e.g. CV)

Put the file in `assets/documents/`, e.g. `assets/documents/razin-cv.pdf`, then link to it from anywhere using that relative path, for example:

```html
<a href="assets/documents/razin-cv.pdf">Download CV</a>
```

## How to change contact information

Open `js/main.js` and edit the top of the `siteConfig` object:

```js
const siteConfig = {
  ...
  email: "hello@razinabdullah.com",
  linkedin: "https://www.linkedin.com/in/razinabdullah",
  ...
};
```

Once filled in, the "Start a conversation" button, the email/LinkedIn links in the contact section, and the footer LinkedIn link all activate automatically. Leaving them blank keeps the buttons visibly present but inactive, rather than linking nowhere.

## Deploying to GitHub Pages

You don't need Node, npm, or any local setup — just a GitHub account.

1. Create a new repository on GitHub (e.g. `ra-portfolio`).
2. Upload every file and folder from this project into the repository, keeping the folder structure intact (drag-and-drop via the GitHub web UI works fine, or use `git push` if you're comfortable with it).
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Choose the `main` branch and the `/ (root)` folder, then click **Save**.
6. GitHub will give you a URL like `https://yourusername.github.io/ra-portfolio/` — it can take a minute or two to go live.
7. Whenever you push changes (new projects, new video, updated contact info), the live site updates automatically within a minute or so.

All asset paths in this project are relative (e.g. `assets/images/...`, not `/assets/images/...`), so the site works correctly whether it's hosted at the root of a domain or inside a repository subpath like `/ra-portfolio/`.

## Before publishing, replace:

- [ ] `assets/videos/hero.mp4` — real hero video
- [ ] `assets/images/projects/project-0X.*` — real project imagery
- [ ] The three placeholder pages in `/projects/` — real case studies, or external links set directly in `js/main.js`
- [ ] `email` and `linkedin` in `js/main.js`
- [ ] `assets/documents/razin-cv.pdf` if you want a downloadable CV linked anywhere

## Notes on the build

- No invented biographical details are included — education, years of experience, and role are exactly as provided in the brief. Everything else (testimonials, employers, project outcomes) was intentionally left out rather than fabricated.
- Respects `prefers-reduced-motion`: parallax, scroll-reveal and the hero role-text rotation are all disabled for visitors with that OS-level setting, and all content is fully visible without animation.
- Keyboard-navigable throughout, with visible focus states.
