# Razin Abdullah: portfolio

Static site for GitHub Pages. Plain HTML, CSS and JavaScript, with no build step and no third-party requests.

## Before you publish

1. **Add your contact details** in `js/site.js` (`email`, `linkedin`, optional `calendar`). Until you do, the contact section has no buttons.
2. Check the facts in the hero and About section (`index.html`) are exactly how you want them stated.

## Structure

```
index.html                     Home: playable hero scenario, work, services, process, about, contact
work/tuesday-conversation.html Case study: branching leadership simulation
work/slides-to-practice.html   Case study: slide deck rebuilt as scenario-based eLearning
work/confident-and-wrong.html  Case study: confidence-based phishing check and evaluation plan
css/style.css                  All styles
js/scenario.js                 Small branching-scenario engine (hero + two case studies)
js/site.js                     Contact details
fonts/                         Self-hosted Bricolage Grotesque and Newsreader (SIL OFL)
```

## The case studies

All three are **concept projects**, labelled as such on every page. The companies, people and dialogue are invented, and none of them claims client results. Each one shows a measurement plan instead. If you add real client work later, give it the same structure: brief, real problem, design decisions, demo, measurement.

To add a scenario, copy one of the `Scenario(...)` blocks and edit the `nodes`. Every choice has a `verdict` (`good`, `mid` or `bad`), a short `label`, feedback `fb`, and the `next` node (`null` ends the scenario).

## Design notes

- Light, cool paper background with navy ink. Interactive things look like index cards.
- Yellow highlighter only marks something the visitor did: a choice they picked, or a score.
- Fonts are self-hosted, so the site sends visitor IPs to no third party (embedding Google Fonts has led to GDPR claims in Germany).
- No autoplay video and no scroll animations. Total page weight is about 220 KB, most of it fonts.
- Keyboard focus is visible, reduced-motion is respected, and every demo works with a keyboard.

## Run locally

```
python3 -m http.server
```
Then open http://localhost:8000.
