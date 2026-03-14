import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_DEACTIVATION_BAN_DURATION = "876000h";

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(String(value || "").trim());
}

function parseAllowedOrigins(): string[] {
  return String(Deno.env.get("ALLOWED_ORIGIN") || "https://youssef256d.github.io")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCorsHeaders(requestOrigin: string): HeadersInit {
  const configured = parseAllowedOrigins();
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  };

  if (!configured.length || configured.includes("*")) {
    return {
      ...base,
      "Access-Control-Allow-Origin": "*",
    };
  }

  if (requestOrigin && configured.includes(requestOrigin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": requestOrigin,
      "Vary": "Origin",
    };
  }

  return {
    ...base,
    "Access-Control-Allow-Origin": configured[0],
    "Vary": "Origin",
  };
}

function jsonResponse(status: number, payload: unknown, requestOrigin = ""): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store",
      ...buildCorsHeaders(requestOrigin),
    },
  });
}

function parseBearerToken(authHeader: string): string {
  const value = String(authHeader || "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return value.slice("bearer ".length).trim();
}

Deno.serve(async (req) => {
  const requestOrigin = String(req.headers.get("origin") || "").trim();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(requestOrigin),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." }, requestOrigin);
  }

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      500,
      { ok: false, error: "Server configuration is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      requestOrigin,
    );
  }

  const accessToken = parseBearerToken(req.headers.get("authorization") || "");
  if (!accessToken) {
    return jsonResponse(401, { ok: false, error: "Missing bearer token." }, requestOrigin);
  }

  let body: { targetAuthId?: string; targetAuthIds?: string[]; approved?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON payload." }, requestOrigin);
  }

  const targetAuthIds = [...new Set(
    (Array.isArray(body?.targetAuthIds) ? body.targetAuthIds : [body?.targetAuthId])
      .map((entry) => String(entry || "").trim())
      .filter((entry) => isUuid(entry)),
  )];
  const approved = body?.approved;
  if (!targetAuthIds.length) {
    return jsonResponse(400, { ok: false, error: "targetAuthIds must include at least one valid UUID." }, requestOrigin);
  }
  if (typeof approved !== "boolean") {
    return jsonResponse(400, { ok: false, error: "approved must be a boolean." }, requestOrigin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: actorData, error: actorError } = await adminClient.auth.getUser(accessToken);
  const actorId = String(actorData?.user?.id || "").trim();
  if (actorError || !isUuid(actorId)) {
    return jsonResponse(401, { ok: false, error: "Unauthorized. Log in again and retry." }, requestOrigin);
  }

  const { data: actorProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,role")
    .eq("id", actorId)
    .maybeSingle();
  if (profileError) {
    return jsonResponse(500, { ok: false, error: "Could not verify actor profile role." }, requestOrigin);
  }
  if (String(actorProfile?.role || "").trim().toLowerCase() !== "admin") {
    return jsonResponse(403, { ok: false, error: "Only admin users can update account access." }, requestOrigin);
  }

  const updatedIds: string[] = [];
  const notFoundIds: string[] = [];
  const failedIds: string[] = [];
  let firstFailureMessage = "";

  for (const targetAuthId of targetAuthIds) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetAuthId, {
      ban_duration: approved ? "none" : ACCOUNT_DEACTIVATION_BAN_DURATION,
    });
    if (!updateError) {
      updatedIds.push(targetAuthId);
      continue;
    }
    const details = String(updateError.message || "").trim();
    if (/not found|user not found/i.test(details)) {
      notFoundIds.push(targetAuthId);
      continue;
    }
    failedIds.push(targetAuthId);
    if (!firstFailureMessage) {
      firstFailureMessage = details || "Supabase admin access update failed.";
    }
  }

  if (!failedIds.length) {
    return jsonResponse(200, { ok: true, updatedIds, notFoundIds, failedIds: [] }, requestOrigin);
  }

  return jsonResponse(
    updatedIds.length || notFoundIds.length ? 200 : 500,
    {
      ok: false,
      updatedIds,
      notFoundIds,
      failedIds,
      error: firstFailureMessage || `${failedIds.length} account(s) could not be updated.`,
    },
    requestOrigin,
  );
});
