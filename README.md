# SanaConsultIA

Static website for SanaConsultIA.

## Local development

Install the JavaScript dependencies and bundle the hero animation:

```sh
npm install
npm run build
```

The Three.js source is in `src/hero-network.js`; the site loads the local bundle at `js/hero-network.bundle.js`.

## Analytics and advertising consent

The consent manager is in `js/cookie-consent.js`. Set `GA4_MEASUREMENT_ID` and `META_PIXEL_ID` there when the corresponding services are ready. Both are empty by default. Google Analytics 4 and Meta Pixel scripts are only requested after consent for their respective categories. The consent record expires after 24 months.

See `politica-cookies.html` for the bilingual cookie policy.
`aviso-legal.html` and `politica-privacidad.html` are bilingual public-facing legal pages. The controller has no public-facing establishment; contact details are provided by email. Review legal requirements and processor terms as appropriate.
