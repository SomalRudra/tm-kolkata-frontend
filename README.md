# TM Kolkata Frontend

Static, responsive landing page for Transcendental Meditation Kolkata.

## Local preview

Open `index.html` directly in a browser, or run a static server:

```bash
python3 -m http.server 4173
```

## GitHub Pages

Push to `main`, then enable GitHub Pages with GitHub Actions as the source.
The included workflow publishes this static folder.

## Production URLs

- Primary client-facing site: `http://tmkolkata.org/`
- Secondary domain: `http://tm-kolkata.org/`
- Analytics funnel: `http://tmkolkata.org/analyticFunnel`

The form saves leads to `localStorage`, dispatches JSON callbacks, posts lead data to the Railway backend, and sends conversion events to the analytics funnel. Override these defaults before `app.js` loads when testing alternate environments:

```html
<script>
  window.TM_KOLKATA_API_URL = "https://your-api.example.com";
  window.TM_KOLKATA_ANALYTICS_URL = "https://your-analytics.example.com/analyticFunnel";
</script>
```

Callbacks:

- `window.onTMKolkataRegistration(payload)`
- `window.onTMKolkataQuestion(payload)`
- `window` events: `tmKolkataRegistration`, `tmKolkataQuestion`
