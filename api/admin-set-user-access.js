"use strict";

const {
  applyCorsHeaders,
  getAuthUser,
  getProfileById,
  getServerEnv,
  isRateLimited,
  isUuid,
  json,
  parseBearerToken,
  parseJsonBody,
  updateAuthUserAccess,
} = require("./_supabase");

const ACCESS_UPDATE_CONCURRENCY = 12;

async function applyAuthAccessUpdatesInParallel(env, targetAuthIds, approved) {
  const updatedIds = [];
  const notFoundIds = [];
  const failedIds = [];
  let firstFailureMessage = "";
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < targetAuthIds.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const targetAuthId = targetAuthIds[currentIndex];
      try {
        const updated = await updateAuthUserAccess(env, targetAuthId, approved);
        if (updated.ok) {
          updatedIds.push(targetAuthId);
          continue;
        }
        if (updated.notFound) {
          notFoundIds.push(targetAuthId);
          continue;
        }
        failedIds.push(targetAuthId);
        if (!firstFailureMessage) {
          firstFailureMessage = updated.error || "Supabase admin access update failed.";
        }
      } catch (error) {
        failedIds.push(targetAuthId);
        if (!firstFailureMessage) {
          firstFailureMessage = String(error?.message || "").trim() || "Unexpected error while updating user access.";
        }
      }
    }
  };

  const workerCount = Math.min(ACCESS_UPDATE_CONCURRENCY, targetAuthIds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    updatedIds,
    notFoundIds,
    failedIds,
    firstFailureMessage,
  };
}

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

  const targetAuthIds = [...new Set(
    (Array.isArray(body?.targetAuthIds) ? body.targetAuthIds : [body?.targetAuthId])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => isUuid(entry)),
  )];
  const approved = body?.approved;
  if (!targetAuthIds.length) {
    json(res, 400, { ok: false, error: "targetAuthIds must include at least one valid UUID." });
    return;
  }
  if (typeof approved !== "boolean") {
    json(res, 400, { ok: false, error: "approved must be a boolean." });
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
    json(res, 403, { ok: false, error: "Only admin users can update account access." });
    return;
  }

  const {
    updatedIds,
    notFoundIds,
    failedIds,
    firstFailureMessage,
  } = await applyAuthAccessUpdatesInParallel(env, targetAuthIds, approved);

  if (!failedIds.length) {
    json(res, 200, { ok: true, updatedIds, notFoundIds, failedIds: [] });
    return;
  }

  const payload = {
    ok: false,
    updatedIds,
    notFoundIds,
    failedIds,
    error: firstFailureMessage || `${failedIds.length} account(s) could not be updated.`,
  };
  json(res, updatedIds.length || notFoundIds.length ? 200 : 500, payload);
};
