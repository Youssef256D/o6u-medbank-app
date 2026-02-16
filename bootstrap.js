(() => {
  const versionTag = document.querySelector('meta[name="app-version"]');
  const appVersion = String(versionTag?.getAttribute("content") || "").trim();
  const versionSuffix = appVersion ? `?v=${encodeURIComponent(appVersion)}` : "";
  let appLoadPromise = null;

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
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Service worker registration failed.", error);
      });
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const navTarget = event.target instanceof Element ? event.target.closest("[data-nav]") : null;
      if (navTarget) {
        rememberInitialRoute(navTarget.getAttribute("data-nav"));
      }
      ensureAppLoaded().catch(() => {});
    },
    { capture: true },
  );

  window.addEventListener(
    "keydown",
    () => {
      ensureAppLoaded().catch(() => {});
    },
  );

  registerServiceWorker();
})();
