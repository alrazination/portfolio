/* ------------------------------------------------------------------
   YOUR CONTACT DETAILS: fill these in before publishing.
   Anything left empty is simply not shown (no "add address" text).
   ------------------------------------------------------------------ */
const CONTACT = {
  email: '',      // e.g. 'hello@razinabdullah.com'
  linkedin: '',   // e.g. 'https://www.linkedin.com/in/razinabdullah'
  calendar: ''    // optional booking link, e.g. a Calendly URL
};

(function () {
  const actions = document.querySelector('[data-contact-actions]');
  const list = document.querySelector('[data-contact-list]');
  if (!actions) return;

  const subject = encodeURIComponent('A training problem to make playable');
  const add = (html) => actions.insertAdjacentHTML('beforeend', html);
  const item = (html) => list && list.insertAdjacentHTML('beforeend', `<li>${html}</li>`);

  if (CONTACT.email) {
    add(`<a class="btn" href="mailto:${CONTACT.email}?subject=${subject}">Email me</a>`);
    item(`Email: <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`);
  }
  if (CONTACT.calendar) add(`<a class="btn btn--panel" href="${CONTACT.calendar}" rel="noopener">Book a 20-minute call</a>`);
  if (CONTACT.linkedin) {
    add(`<a class="btn btn--panel" href="${CONTACT.linkedin}" rel="noopener">Message me on LinkedIn</a>`);
  }
  if (!actions.children.length) {
    console.warn('[site] No contact details set. Fill in CONTACT in js/site.js before publishing.');
  }
})();
