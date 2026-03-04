(() => {
  const versionTag = document.querySelector('meta[name="app-version"]');
  const appVersion = String(versionTag?.getAttribute("content") || "").trim();
  const versionSuffix = appVersion ? `?v=${encodeURIComponent(appVersion)}` : "";
  const ROUTE_STATE_ROUTE_KEY = "mcq_last_route";
  const ROUTE_STATE_ROUTE_LOCAL_KEY = "mcq_last_route_local";
  const GOOGLE_OAUTH_PENDING_KEY = "mcq_google_oauth_pending";
  const SUPABASE_SDK_SOURCES = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@supabase/supabase-js@2",
  ];
  const SCRIPT_LOAD_TIMEOUT_MS = 12000;
  const BOOTSTRAP_STATUS_ID = "bootstrap-status";
  const KNOWN_ROUTES = new Set([
    "landing",
    "features",
    "pricing",
    "about",
    "contact",
    "login",
    "signup",
    "forgot",
    "reset-password",
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
    "type",
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
  let appPrefetchTriggered = false;

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
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : SCRIPT_LOAD_TIMEOUT_MS;
    let existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        return Promise.resolve();
      }
      if (existing.dataset.failed === "1") {
        existing.remove();
        existing = null;
      }
    }

    if (existing) {
      return waitForScriptLoad(existing, src, timeoutMs);
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = Boolean(options.defer);
    script.async = Boolean(options.async);
    script.dataset.src = src;
    const loadPromise = waitForScriptLoad(script, src, timeoutMs);
    document.head.appendChild(script);
    return loadPromise;
  }

  function waitForScriptLoad(script, src, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finalize = (handler, value) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        handler(value);
      };

      const onLoad = () => {
        script.dataset.loaded = "1";
        script.dataset.failed = "0";
        finalize(resolve);
      };
      const onError = () => {
        script.dataset.failed = "1";
        script.remove();
        finalize(reject, new Error(`Failed to load ${src}`));
      };
      const timeoutId = window.setTimeout(() => {
        script.dataset.failed = "1";
        script.remove();
        finalize(reject, new Error(`Timed out loading ${src}`));
      }, timeoutMs);

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
    });
  }

  async function loadScriptWithFallback(sources, options = {}) {
    const list = Array.isArray(sources) ? sources : [sources];
    let lastError = null;
    for (const src of list) {
      try {
        await loadScript(src, options);
        return src;
      } catch (error) {
        lastError = error;
        console.warn(`Script load failed: ${src}`, error?.message || error);
      }
    }
    throw lastError || new Error("Script loading failed.");
  }

  function rememberInitialRoute(route) {
    const safeRoute = String(route || "").trim().toLowerCase();
    if (!safeRoute || !KNOWN_ROUTES.has(safeRoute)) {
      return;
    }
    window.__APP_INITIAL_ROUTE__ = safeRoute;
    syncRouteHash(safeRoute);
  }

  function readRouteFromHash() {
    const rawHash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (!rawHash || rawHash.includes("=")) {
      return "";
    }
    return KNOWN_ROUTES.has(rawHash) ? rawHash : "";
  }

  function syncRouteHash(route) {
    let currentUrl;
    try {
      currentUrl = new URL(window.location.href);
    } catch {
      return;
    }

    const safeRoute = String(route || "").trim().toLowerCase();
    if (!KNOWN_ROUTES.has(safeRoute)) {
      return;
    }
    const nextHash = safeRoute === "landing" ? "" : `#${safeRoute}`;
    if ((currentUrl.hash || "") === nextHash) {
      return;
    }
    const query = currentUrl.searchParams.toString();
    const nextUrl = `${currentUrl.pathname}${query ? `?${query}` : ""}${nextHash}`;
    window.history.replaceState(window.history.state, document.title, nextUrl);
  }

  function setNavLoadingState(loading) {
    document.querySelectorAll("[data-nav]").forEach((node) => {
      if (!(node instanceof HTMLButtonElement)) {
        return;
      }
      if (loading) {
        if (!("bootstrapWasDisabled" in node.dataset)) {
          node.dataset.bootstrapWasDisabled = node.disabled ? "1" : "0";
        }
        node.disabled = true;
        node.style.cursor = "progress";
        return;
      }
      if (!("bootstrapWasDisabled" in node.dataset)) {
        return;
      }
      node.disabled = node.dataset.bootstrapWasDisabled === "1";
      delete node.dataset.bootstrapWasDisabled;
      node.style.cursor = "";
    });
  }

  function getBootstrapStatusElement() {
    let element = document.getElementById(BOOTSTRAP_STATUS_ID);
    if (element) {
      return element;
    }
    element = document.createElement("div");
    element.id = BOOTSTRAP_STATUS_ID;
    element.hidden = true;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    Object.assign(element.style, {
      position: "fixed",
      left: "50%",
      bottom: "1rem",
      transform: "translateX(-50%)",
      zIndex: "1300",
      borderRadius: "999px",
      padding: "0.45rem 0.8rem",
      fontSize: "0.85rem",
      fontWeight: "600",
      color: "#ffffff",
      background: "rgba(16, 42, 67, 0.92)",
      boxShadow: "0 10px 24px rgba(9, 25, 39, 0.16)",
    });
    document.body.appendChild(element);
    return element;
  }

  function showBootstrapStatus(message, tone = "info") {
    const element = getBootstrapStatusElement();
    element.textContent = String(message || "").trim();
    element.style.background = tone === "error" ? "rgba(180, 35, 24, 0.94)" : "rgba(16, 42, 67, 0.92)";
    element.hidden = false;
  }

  function clearBootstrapStatus() {
    const element = document.getElementById(BOOTSTRAP_STATUS_ID);
    if (element) {
      element.hidden = true;
    }
  }

  function getBootstrapLoadingMessage(route) {
    const safeRoute = String(route || "").trim().toLowerCase();
    if (safeRoute === "signup") {
      return "Opening sign up...";
    }
    if (safeRoute === "login") {
      return "Opening login...";
    }
    return "Loading app...";
  }

  function startAppLoad() {
    if (appLoadPromise) {
      return appLoadPromise;
    }

    appLoadPromise = Promise.resolve()
      .then(() => loadScript(`supabase.config.js${versionSuffix}`, { defer: true, timeoutMs: SCRIPT_LOAD_TIMEOUT_MS }))
      .then(() => loadScriptWithFallback(SUPABASE_SDK_SOURCES, { async: true, timeoutMs: SCRIPT_LOAD_TIMEOUT_MS }))
      .then(() => loadScript(`main.js${versionSuffix}`, { defer: true, timeoutMs: SCRIPT_LOAD_TIMEOUT_MS }))
      .catch((error) => {
        appLoadPromise = null;
        console.error("Deferred app bootstrap failed.", error);
        throw error;
      });

    return appLoadPromise;
  }

  function ensureAppLoaded(options = {}) {
    const showBusyUi = Boolean(options.showBusyUi);
    const route = options.route;
    const loadPromise = startAppLoad();
    if (!showBusyUi) {
      return loadPromise;
    }
    setNavLoadingState(true);
    showBootstrapStatus(getBootstrapLoadingMessage(route));
    return loadPromise
      .then((value) => {
        clearBootstrapStatus();
        return value;
      })
      .catch((error) => {
        showBootstrapStatus("Could not open the page. Check your connection and try again.", "error");
        throw error;
      })
      .finally(() => {
        setNavLoadingState(false);
      });
  }

  function prefetchAppOnIntent() {
    if (appPrefetchTriggered) {
      return;
    }
    appPrefetchTriggered = true;
    ensureAppLoaded().catch(() => {
      appPrefetchTriggered = false;
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    window.addEventListener("load", () => {
      const currentSwUrl = new URL(`./sw.js${versionSuffix}`, window.location.href).href;
      const currentCacheName = `o6u-medbank-static-v${appVersion.replaceAll(".", "-") || "runtime"}`;

      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map(async (registration) => {
          const scriptUrl = registration.active?.scriptURL
            || registration.waiting?.scriptURL
            || registration.installing?.scriptURL
            || "";
          if (scriptUrl && scriptUrl !== currentSwUrl) {
            await registration.unregister();
          }
        })))
        .catch((error) => {
          console.warn("Could not clean old service worker registrations.", error);
        })
        .finally(() => {
          if ("caches" in window) {
            caches.keys()
              .then((keys) => Promise.all(
                keys
                  .filter((key) => key.startsWith("o6u-medbank-static-v") && key !== currentCacheName)
                  .map((key) => caches.delete(key)),
              ))
              .catch((error) => {
                console.warn("Could not clean old static caches.", error);
              });
          }

          navigator.serviceWorker.register(`./sw.js${versionSuffix}`)
            .then((registration) => {
              registration.update().catch(() => {});
            })
            .catch((error) => {
              console.error("Service worker registration failed.", error);
            });
        });
    });
  }

  function readPersistedRoute() {
    const hashRoute = readRouteFromHash();
    if (hashRoute) {
      return hashRoute;
    }

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
      const route = navTarget.getAttribute("data-nav");
      rememberInitialRoute(route);
      ensureAppLoaded({ showBusyUi: true, route }).catch(() => {});
    },
    { capture: true },
  );

  document.addEventListener(
    "pointerover",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const navTarget = event.target.closest('[data-nav="login"], [data-nav="signup"]');
      if (!navTarget) {
        return;
      }
      prefetchAppOnIntent();
    },
    { capture: true },
  );

  document.addEventListener(
    "touchstart",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const navTarget = event.target.closest('[data-nav="login"], [data-nav="signup"]');
      if (!navTarget) {
        return;
      }
      prefetchAppOnIntent();
    },
    { capture: true, passive: true },
  );

  const persistedRoute = readPersistedRoute();
  if (persistedRoute && persistedRoute !== "landing") {
    ensureAppLoaded().catch(() => {});
  } else if (hasOAuthCallbackParams() || isGoogleOAuthPendingState()) {
    ensureAppLoaded().catch(() => {});
  }

  registerServiceWorker();
})();
