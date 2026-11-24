# Razin Abdullah: portfolio

Static site for GitHub Pages. Plain HTML, CSS and JavaScript, no build step.

## Before you publish

1. **Add your contact details** in `js/site.js` (`email`, `linkedin`, optional `calendar`). Until you do, the contact section has no buttons.
2. **Check the case study text** in `work/*.html`. The "Where it started" and audience details were written from what the simulations themselves show. Correct anything that doesn't match how each project actually came about.

## Structure

```
index.html            Home: player card, the five simulations, process, services, about, contact
work/<slug>.html      One case study per simulation, with the sim embedded
sims/<slug>/index.html  The simulations themselves, unchanged
img/razin.webp        Profile photo (cut to a circle)
img/thumbs/           <slug>-start.webp = opening screen, <slug>.webp = the "consequence" moment
css/style.css         All styles
js/play.js            Loads a sim when the visitor presses start, and scales it to fit
js/site.js            Contact details
fonts/                Self-hosted Unbounded and Figtree (SIL OFL)
```

## Adding a simulation

1. Put it in `sims/<slug>/index.html`.
2. Add a 1280×720 screenshot of the start screen as `img/thumbs/<slug>-start.webp` and one of its most interesting mistake as `img/thumbs/<slug>.webp`.
3. Copy one of the pages in `work/`, then add a card for it to the grid in `index.html`.

A sim with a fixed 1280×720 stage gets `data-fixed` on its `.sim` frame so it scales to fit. A sim that fills the window (like the 3D kitchen) doesn't need it.

## Brand

"Level up": a game world at night.

- Colours: night `#14082B`, panel `#22114A`, hot coral `#FF4F6D`, lime `#C6FF3D`, sky `#66D9FF`, cream `#FFF6EA`.
- Coral marks consequences (what happens when you get it wrong). Lime marks success and the main action.
- Unbounded for headings, Figtree for text.
- Chunky panels with hard drop-shadows; buttons press down when clicked.

The simulations still load their own libraries (Tailwind, three.js, Google Fonts) from CDNs, as they did before.

## Run locally

```
python3 -m http.server
```
Then open http://localhost:8000.
