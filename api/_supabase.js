"use strict";

const MAX_BODY_BYTES = 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Simple in-memory rate limiter: max requests per IP within a sliding window.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map();

function isRateLimited(req) {
  const ip =
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(ip, entry);
  }
  entry.count += 1;
  // Periodically prune old entries to prevent memory leak.
  if (rateLimitStore.size > 10000) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(key);
    }
  }
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function normalizeOriginList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function applyCorsHeaders(req, res) {
  const configured = normalizeOriginList(
    process.env.ALLOWED_ORIGIN || "https://youssef256d.github.io",
  );
  const requestOrigin = String(req.headers.origin || "").trim();

  if (!configured.length || configured.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin && configured.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", configured[0]);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getEnvValue(name) {
  return String(process.env[name] || "").trim();
}

function requireAnyEnv(names) {
  for (const name of names) {
    const value = getEnvValue(name);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required environment variable. Set one of: ${names.join(", ")}`);
}

function getServerEnv() {
  const rawUrl = requireAnyEnv([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_URL",
  ]);
  const serviceRoleKey = requireAnyEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ]);
  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

function parseBearerToken(req) {
  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authorization.slice("bearer ".length).trim();
}

function isUuid(value) {
  return UUID_PATTERN.test(String(value || "").trim());
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (error) => reject(error));
  });
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    const trimmed = req.body.trim();
    return trimmed ? JSON.parse(trimmed) : {};
  }
  const rawBody = (await readRawBody(req)).trim();
  if (!rawBody) {
    return {};
  }
  return JSON.parse(rawBody);
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getAuthUser(env, accessToken) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: env.serviceRoleKey,
    },
  });

  if (!response.ok) {
    const payload = await readJsonSafe(response);
    const message = String(payload?.error_description || payload?.msg || payload?.error || "").trim();
    return {
      ok: false,
      status: response.status,
      error: message || "Unauthorized.",
      user: null,
    };
  }

  const user = await readJsonSafe(response);
  return {
    ok: Boolean(user?.id),
    status: response.status,
    error: user?.id ? "" : "Unauthorized.",
    user: user || null,
  };
}

async function getProfileById(env, profileId) {
  const response = await fetch(
    `${env.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=id,role&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
      },
    },
  );
  if (!response.ok) {
    const payload = await readJsonSafe(response);
    const message = String(payload?.message || payload?.error || "").trim();
    throw new Error(message || `Failed to load profile (${response.status}).`);
  }
  const rows = await readJsonSafe(response);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function deleteAuthUser(env, targetAuthId) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetAuthId)}`, {
    method: "DELETE",
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
    },
  });
  const payload = await readJsonSafe(response);
  const errorMessage = String(payload?.msg || payload?.error || payload?.message || "").trim();
  const isNotFound = response.status === 404 || /not found/i.test(errorMessage);
  return {
    ok: response.ok,
    notFound: isNotFound,
    status: response.status,
    error: errorMessage,
  };
}

async function updateAuthUserPassword(env, targetAuthId, password) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetAuthId)}`, {
    method: "PUT",
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const payload = await readJsonSafe(response);
  const errorMessage = String(
    payload?.msg || payload?.error_description || payload?.error || payload?.message || "",
  ).trim();
  const isNotFound = response.status === 404 || /not found/i.test(errorMessage);
  return {
    ok: response.ok,
    notFound: isNotFound,
    status: response.status,
    error: errorMessage,
  };
}

module.exports = {
  applyCorsHeaders,
  deleteAuthUser,
  getAuthUser,
  getProfileById,
  getServerEnv,
  isRateLimited,
  isUuid,
  json,
  parseBearerToken,
  parseJsonBody,
  updateAuthUserPassword,
};
