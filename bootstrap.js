(() => {
  const versionTag = document.querySelector('meta[name="app-version"]');
  const appVersion = String(versionTag?.getAttribute("content") || "").trim();
  const versionSuffix = appVersion ? `?v=${encodeURIComponent(appVersion)}` : "";
  const ROUTE_STATE_ROUTE_KEY = "mcq_last_route";
  const ROUTE_STATE_ROUTE_LOCAL_KEY = "mcq_last_route_local";
  const GOOGLE_OAUTH_PENDING_KEY = "mcq_google_oauth_pending";
  const KNOWN_ROUTES = new Set([
    "landing",
    "features",
    "pricing",
    "about",
    "contact",
    "login",
    "signup",
    "forgot",
    "complete-profile",
    "dashboard",
    "notifications",
    "create-test",
    "qbank",
    "builder",
    "session",
    "review",
    "analytics",
    "profile",
    "admin",
  ]);
  const OAUTH_CALLBACK_QUERY_KEYS = new Set([
    "code",
    "state",
    "error",
    "error_code",
    "error_description",
    "access_token",
    "refresh_token",
    "provider_token",
    "provider_refresh_token",
    "token_type",
    "expires_in",
    "expires_at",
  ]);
  let appLoadPromise = null;

  function parseOAuthHashParams(hashValue) {
    const rawHash = String(hashValue || "").replace(/^#/, "").trim();
    if (!rawHash || !rawHash.includes("=")) {
      return new URLSearchParams();
    }
    return new URLSearchParams(rawHash);
  }

  function hasOAuthCallbackParams() {
    let currentUrl;
    try {
      currentUrl = new URL(window.location.href);
    } catch {
      return false;
    }

    const params = new URLSearchParams(currentUrl.search || "");
    const hashParams = parseOAuthHashParams(currentUrl.hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
    return [...OAUTH_CALLBACK_QUERY_KEYS].some((key) => params.has(key));
  }

  function isGoogleOAuthPendingState() {
    try {
      return sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY) === "1";
    } catch {
      return false;
    }
  }

  function loadScript(src, options = {}) {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = Boolean(options.defer);
      script.async = Boolean(options.async);
      script.dataset.src = src;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "1";
          resolve();
        },
        { once: true },
      );
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function rememberInitialRoute(route) {
    const safeRoute = String(route || "").trim().toLowerCase();
    if (!safeRoute) {
      return;
    }
    window.__APP_INITIAL_ROUTE__ = safeRoute;
  }

  function ensureAppLoaded() {
    if (appLoadPromise) {
      return appLoadPromise;
    }

    appLoadPromise = Promise.resolve()
      .then(() => loadScript(`supabase.config.js${versionSuffix}`, { defer: true }))
      .then(() => loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", { async: true }))
      .then(() => loadScript(`main.js${versionSuffix}`, { defer: true }))
      .catch((error) => {
        appLoadPromise = null;
        console.error("Deferred app bootstrap failed.", error);
        throw error;
      });

    return appLoadPromise;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`./sw.js${versionSuffix}`).catch((error) => {
        console.error("Service worker registration failed.", error);
      });
    });
  }

  function readPersistedRoute() {
    let persistedRoute = "";
    try {
      persistedRoute = String(sessionStorage.getItem(ROUTE_STATE_ROUTE_KEY) || "").trim().toLowerCase();
    } catch {
      persistedRoute = "";
    }
    if (KNOWN_ROUTES.has(persistedRoute)) {
      return persistedRoute;
    }
    try {
      persistedRoute = String(localStorage.getItem(ROUTE_STATE_ROUTE_LOCAL_KEY) || "").trim().toLowerCase();
    } catch {
      persistedRoute = "";
    }
    return KNOWN_ROUTES.has(persistedRoute) ? persistedRoute : "";
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const navTarget = event.target.closest("[data-nav]");
      if (!navTarget) {
        return;
      }
      rememberInitialRoute(navTarget.getAttribute("data-nav"));
      ensureAppLoaded().catch(() => {});
    },
    { capture: true },
  );

  const persistedRoute = readPersistedRoute();
  if (persistedRoute && persistedRoute !== "landing") {
    ensureAppLoaded().catch(() => {});
  } else if (hasOAuthCallbackParams() || isGoogleOAuthPendingState()) {
    ensureAppLoaded().catch(() => {});
  }

  registerServiceWorker();
})();
