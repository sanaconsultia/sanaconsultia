const GA4_MEASUREMENT_ID = '';
const META_PIXEL_ID = '';
const CONSENT_STORAGE_KEY = 'sanaconsultia-consent';
const CONSENT_LIFETIME_MONTHS = 24;
const LEGAL_LINK_PREFIX = window.location.pathname.includes('/presentaciones/') ? '../' : '';
const COOKIE_POLICY_PATH = `${LEGAL_LINK_PREFIX}politica-cookies.html`;
const LEGAL_NOTICE_PATH = `${LEGAL_LINK_PREFIX}aviso-legal.html`;
const PRIVACY_POLICY_PATH = `${LEGAL_LINK_PREFIX}politica-privacidad.html`;

const COOKIE_TEXT = {
  es: {
    title: 'Tu privacidad importa',
    intro: 'Usamos almacenamiento necesario para recordar tus preferencias. Con tu permiso, también podemos medir el uso de la web o mostrar publicidad personalizada. Puedes aceptar, rechazar o configurar las categorías opcionales.',
    link: 'Política de cookies',
    legalLink: 'Aviso legal',
    privacyLink: 'Política de privacidad',
    necessary: 'Necesarias',
    necessaryText: 'Permiten guardar esta elección y recordar el idioma. Siempre activas.',
    analytics: 'Analítica',
    analyticsText: 'Permite medir visitas y uso de la web con Google Analytics 4.',
    advertising: 'Publicidad',
    advertisingText: 'Permite medir campañas y crear audiencias con el píxel de Meta.',
    accept: 'Aceptar',
    reject: 'Rechazar',
    configure: 'Configurar',
    manage: 'Configurar cookies',
    save: 'Guardar preferencias',
    back: 'Volver',
  },
  ca: {
    title: 'La teva privacitat ens importa',
    intro: 'Fem servir emmagatzematge necessari per recordar les teves preferències. Si ens dones permís, també podem mesurar l’ús del web o mostrar publicitat personalitzada. Pots acceptar, rebutjar o configurar les categories opcionals.',
    link: 'Política de galetes',
    legalLink: 'Avís legal',
    privacyLink: 'Política de privacitat',
    necessary: 'Necessàries',
    necessaryText: 'Permeten desar aquesta tria i recordar l’idioma. Sempre actives.',
    analytics: 'Analítica',
    analyticsText: 'Permet mesurar les visites i l’ús del web amb Google Analytics 4.',
    advertising: 'Publicitat',
    advertisingText: 'Permet mesurar les campanyes i crear audiències amb el píxel de Meta.',
    accept: 'Acceptar',
    reject: 'Rebutjar',
    configure: 'Configurar',
    manage: 'Configurar les galetes',
    save: 'Desar les preferències',
    back: 'Tornar',
  },
};

function currentLanguage() {
  return document.documentElement.lang.toLowerCase().startsWith('ca') ? 'ca' : 'es';
}

function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function readConsent() {
  const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!raw) return null;

  let consent;
  try {
    consent = JSON.parse(raw);
  } catch {
    removeCookies(['_ga', '_gid', '_gat', '_gcl_au', '_fbp', '_fbc', 'fr']);
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    return null;
  }

  if (
    consent?.version !== 1
    || !Number.isFinite(consent.expiresAt)
    || consent.expiresAt <= Date.now()
    || typeof consent.analytics !== 'boolean'
    || typeof consent.advertising !== 'boolean'
  ) {
    removeCookies(['_ga', '_gid', '_gat', '_gcl_au', '_fbp', '_fbc', 'fr']);
    Object.keys(localStorage)
      .filter((key) => key.startsWith('_ga'))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    return null;
  }

  return consent;
}

function saveConsent(analytics, advertising) {
  const now = new Date();
  const consent = {
    version: 1,
    necessary: true,
    analytics: Boolean(analytics),
    advertising: Boolean(advertising),
    updatedAt: now.getTime(),
    expiresAt: addMonths(now, CONSENT_LIFETIME_MONTHS).getTime(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  return consent;
}

function removeCookies(names) {
  const hostParts = window.location.hostname.split('.');
  const domains = [''];
  for (let index = 0; index < hostParts.length - 1; index += 1) {
    domains.push(`.${hostParts.slice(index).join('.')}`);
  }
  names.forEach((name) => {
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ''} SameSite=Lax`;
    });
  });
}

function loadAnalytics(consent) {
  if (!GA4_MEASUREMENT_ID || window.__sanaGaLoaded) return;
  window.__sanaGaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.advertising ? 'granted' : 'denied',
    ad_user_data: consent.advertising ? 'granted' : 'denied',
    ad_personalization: consent.advertising ? 'granted' : 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
  window.gtag('event', 'page_view');
}

function loadAdvertising() {
  if (!META_PIXEL_ID || window.__sanaMetaLoaded) return;
  window.__sanaMetaLoaded = true;
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'));
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function applyConsent(consent, previousConsent = null) {
  if (consent.analytics) loadAnalytics(consent);
  else if (previousConsent?.analytics) {
    if (window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    removeCookies(['_ga', '_gid', '_gat', '_gcl_au']);
    Object.keys(localStorage)
      .filter((key) => key.startsWith('_ga'))
      .forEach((key) => localStorage.removeItem(key));
  }

  if (consent.advertising) loadAdvertising();
  else if (previousConsent?.advertising) {
    if (window.fbq) window.fbq('consent', 'revoke');
    removeCookies(['_fbp', '_fbc', 'fr']);
  }
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.advertising ? 'granted' : 'denied',
      ad_user_data: consent.advertising ? 'granted' : 'denied',
      ad_personalization: consent.advertising ? 'granted' : 'denied',
    });
  }
}

function renderBanner(consent) {
  const lang = COOKIE_TEXT[currentLanguage()];
  const banner = document.querySelector('#cookie-consent');
  if (!banner) return;

  banner.hidden = Boolean(consent);
  banner.innerHTML = `
    <h2 id="cookie-consent-title">${lang.title}</h2>
    <p id="cookie-consent-description">${lang.intro}</p>
    <p class="cookie-consent__links">
      <a href="${LEGAL_NOTICE_PATH}">${lang.legalLink}</a>
      <a href="${PRIVACY_POLICY_PATH}">${lang.privacyLink}</a>
      <a href="${COOKIE_POLICY_PATH}">${lang.link}</a>
    </p>
    <div class="cookie-consent__actions">
      <button type="button" class="cookie-consent__primary" data-consent="accept">${lang.accept}</button>
      <button type="button" class="cookie-consent__secondary" data-consent="reject">${lang.reject}</button>
      <button type="button" class="cookie-consent__tertiary" data-consent="configure" aria-expanded="false">${lang.configure}</button>
    </div>
    <section class="cookie-consent__settings" hidden aria-label="${lang.configure}">
      <div class="cookie-consent__category">
        <div><h3>${lang.necessary}</h3><p>${lang.necessaryText}</p></div>
        <input type="checkbox" checked disabled aria-label="${lang.necessary}">
      </div>
      <label class="cookie-consent__category">
        <div><h3>${lang.analytics}</h3><p>${lang.analyticsText}</p></div>
        <input type="checkbox" data-consent-analytics aria-label="${lang.analytics}">
      </label>
      <label class="cookie-consent__category">
        <div><h3>${lang.advertising}</h3><p>${lang.advertisingText}</p></div>
        <input type="checkbox" data-consent-advertising aria-label="${lang.advertising}">
      </label>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__primary" data-consent="save">${lang.save}</button>
        <button type="button" class="cookie-consent__secondary" data-consent="back">${lang.back}</button>
      </div>
    </section>
  `;
}

function initialiseConsent() {
  const consent = readConsent();
  applyConsent(consent || { analytics: false, advertising: false });
  renderBanner(consent);

  const banner = document.querySelector('#cookie-consent');
  if (!banner) return;

  if (!document.querySelector('[data-cookie-settings]')) {
    const manageButton = document.createElement('button');
    manageButton.type = 'button';
    manageButton.dataset.cookieSettings = '';
    manageButton.className = 'cookie-consent__manage';
    manageButton.textContent = COOKIE_TEXT[currentLanguage()].manage;
    document.body.appendChild(manageButton);
  }

  banner.addEventListener('click', (event) => {
    const action = event.target.closest('[data-consent]')?.dataset.consent;
    if (!action) return;

    if (action === 'configure') {
      const settings = banner.querySelector('.cookie-consent__settings');
      const button = banner.querySelector('[data-consent="configure"]');
      settings.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      return;
    }

    if (action === 'back') {
      banner.querySelector('.cookie-consent__settings').hidden = true;
      banner.querySelector('[data-consent="configure"]').setAttribute('aria-expanded', 'false');
      return;
    }

    const previousConsent = readConsent();
    let nextConsent;
    if (action === 'accept') nextConsent = saveConsent(true, true);
    else if (action === 'reject') nextConsent = saveConsent(false, false);
    else {
      nextConsent = saveConsent(
        banner.querySelector('[data-consent-analytics]').checked,
        banner.querySelector('[data-consent-advertising]').checked,
      );
    }
    applyConsent(nextConsent, previousConsent);
    renderBanner(nextConsent);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-cookie-settings]')) {
      const activeConsent = readConsent();
      renderBanner(null);
      banner.hidden = false;
      const settings = banner.querySelector('.cookie-consent__settings');
      settings.hidden = false;
      banner.querySelector('[data-consent="configure"]').setAttribute('aria-expanded', 'true');
      banner.querySelector('[data-consent-analytics]').checked = Boolean(activeConsent?.analytics);
      banner.querySelector('[data-consent-advertising]').checked = Boolean(activeConsent?.advertising);
      banner.querySelector('[data-consent="accept"]').focus();
    }
  });

  const languageObserver = new MutationObserver(() => {
    renderBanner(readConsent());
    const manageButton = document.querySelector('.cookie-consent__manage');
    if (manageButton) manageButton.textContent = COOKIE_TEXT[currentLanguage()].manage;
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

function start() {
  if (!document.querySelector('#cookie-consent')) {
    const banner = document.createElement('aside');
    banner.id = 'cookie-consent';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cookie-consent-title');
    banner.setAttribute('aria-describedby', 'cookie-consent-description');
    document.body.appendChild(banner);
  }

  initialiseConsent();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
