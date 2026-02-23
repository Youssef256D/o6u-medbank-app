"use strict";

const {
  applyCorsHeaders,
  getAuthUser,
  getProfileById,
  getServerEnv,
  isUuid,
  json,
  parseBearerToken,
  parseJsonBody,
  updateAuthUserPassword,
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
  const nextPassword = typeof body?.password === "string" ? body.password : "";
  if (!isUuid(targetAuthId)) {
    json(res, 400, { ok: false, error: "targetAuthId must be a valid UUID." });
    return;
  }
  if (!nextPassword || nextPassword.length < 6) {
    json(res, 400, { ok: false, error: "password must be at least 6 characters." });
    return;
  }
  if (nextPassword.length > 128) {
    json(res, 400, { ok: false, error: "password is too long (maximum 128 characters)." });
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
    json(res, 403, { ok: false, error: "Only admin users can update user passwords." });
    return;
  }

  try {
    const updated = await updateAuthUserPassword(env, targetAuthId, nextPassword);
    if (updated.notFound) {
      json(res, 404, { ok: false, error: "Target auth user was not found." });
      return;
    }
    if (!updated.ok) {
      const status = updated.status === 401 || updated.status === 403 ? 403 : 500;
      json(res, status, {
        ok: false,
        error: updated.error || "Supabase admin password update failed.",
      });
      return;
    }
    json(res, 200, { ok: true, updated: true });
  } catch {
    json(res, 500, { ok: false, error: "Unexpected error while updating user password." });
  }
};
