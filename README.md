# Razin Abdullah: portfolio

Static site for GitHub Pages. Plain HTML, CSS and JavaScript, no build step.

## Admin panel

Open `/admin/` on the live site (https://alrazination.github.io/portfolio/admin/). It is not linked from the site and is hidden from search engines.

- **Sign in** with a GitHub fine-grained access key: Settings → Developer settings → Fine-grained tokens → Generate. Give it access to this repository only, with **Contents: Read and write**. The sign-in screen has the same steps.
- **Projects:** show or hide, feature, reorder, edit card text, delete, and add new projects (start image, optional "mistake" image, and an HTML file, a folder with `index.html`, or a link).
- **Testimonials & results:** testimonials, "Trusted by" client names, and an Outcome section per case study. The sample entries are placeholders and are off; replace them with real ones before switching them on.
- **Contact & settings:** email, LinkedIn, booking link, Web3Forms key (makes the contact form email you; get one free at web3forms.com), GoatCounter code (optional visitor stats).
- **Publish changes** makes one commit to `main`; GitHub Pages updates about a minute later.

Everything the admin edits lives in `data/site.json`.

## Structure

```
index.html              Home: hero, projects, testimonials, approach, services, packages, delivery, process, about, FAQ, contact form
work/<slug>.html        Hand-written case study per simulation, with the sim embedded
work/project.html       Case study page for projects added in the admin (?p=<slug>)
sims/<slug>/            The simulations; tw.css is their compiled Tailwind
data/site.json          Content edited by the admin panel
admin/                  The admin panel
img/thumbs/             <slug>-start = opening screen, <slug> = the "consequence" moment
img/og/                 1200x630 link-preview images
css/style.css           All site styles
js/site.js              Renders data/site.json: project grid, filters, quick play, proof, contact, form
js/fx.js                Interaction layer: pop-in reveals, progress bar, card tilt, hero grid, phone menu, gowning mini-game, project picker, achievements
js/play.js              Loads a sim on "Press start" and scales it; phone preview
js/project.js           Fills work/project.html
vendor/                 three.js and the sims' fonts, served locally (no CDNs)
fonts/                  Unbounded and Figtree (SIL OFL)
```

A sim with a fixed 1280×720 stage gets `data-fixed` on its `.sim` frame so it scales to fit.

If you change a simulation's Tailwind classes, rebuild its `tw.css`:
`npx tailwindcss@3.4.17 --content sims/<slug>/index.html -o sims/<slug>/tw.css --minify`

## Brand

"Level up": a game world at night.

- Colours: night `#14082B`, panel `#22114A`, hot coral `#FF4F6D`, lime `#C6FF3D`, sky `#66D9FF`, cream `#FFF6EA`.
- Coral marks consequences (what happens when you get it wrong). Lime marks success and the main action.
- Unbounded for headings, Figtree for text.
- Chunky panels with hard drop-shadows; buttons press down when clicked.

## Run locally

```
python3 -m http.server
```
Then open http://localhost:8000.
