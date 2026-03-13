"use strict";

const {
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
} = require("./_supabase");

module.exports = async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (isRateLimited(req)) {
    json(res, 429, { ok: false, error: "Too many requests. Please try again later." });
    return;
  }

  let env;
  try {
    env = getServerEnv();
  } catch {
    json(res, 500, {
      ok: false,
      error: "Server configuration is missing Supabase environment variables.",
    });
    return;
  }

  const accessToken = parseBearerToken(req);
  if (!accessToken) {
    json(res, 401, { ok: false, error: "Missing bearer token." });
    return;
  }

  const actorAuth = await getAuthUser(env, accessToken);
  if (!actorAuth.ok || !actorAuth.user?.id) {
    json(res, 401, { ok: false, error: "Unauthorized. Log in again and retry." });
    return;
  }

  const actorId = String(actorAuth.user.id || "").trim();
  if (!isUuid(actorId)) {
    json(res, 401, { ok: false, error: "Invalid Supabase session user." });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    json(res, 400, { ok: false, error: "Invalid JSON payload." });
    return;
  }

  const targetAuthId = String(body?.targetAuthId || "").trim();
  if (!isUuid(targetAuthId)) {
    json(res, 400, { ok: false, error: "targetAuthId must be a valid UUID." });
    return;
  }

  if (targetAuthId === actorId) {
    json(res, 400, { ok: false, error: "Admin account cannot delete itself." });
    return;
  }

  let actorProfile;
  try {
    actorProfile = await getProfileById(env, actorId);
  } catch {
    json(res, 500, { ok: false, error: "Could not verify actor profile role." });
    return;
  }

  if (String(actorProfile?.role || "").trim().toLowerCase() !== "admin") {
    json(res, 403, { ok: false, error: "Only admin users can delete users." });
    return;
  }

  try {
    const deleted = await deleteAuthUser(env, targetAuthId);
    if (deleted.notFound) {
      json(res, 200, { ok: true, deleted: false, message: "User already removed." });
      return;
    }
    if (!deleted.ok) {
      const status = deleted.status === 401 || deleted.status === 403 ? 403 : 500;
      json(res, status, {
        ok: false,
        error: deleted.error || "Supabase admin delete call failed.",
      });
      return;
    }
    json(res, 200, { ok: true, deleted: true });
  } catch {
    json(res, 500, { ok: false, error: "Unexpected error while deleting user." });
  }
};
