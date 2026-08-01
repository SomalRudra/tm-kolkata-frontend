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

The form saves leads to `localStorage`, dispatches JSON callbacks, and posts to a backend when `window.TM_KOLKATA_API_URL` is configured.

```html
<script>
  window.TM_KOLKATA_API_URL = "https://your-api.example.com";
</script>
```

Callbacks:

- `window.onTMKolkataRegistration(payload)`
- `window.onTMKolkataQuestion(payload)`
- `window` events: `tmKolkataRegistration`, `tmKolkataQuestion`
