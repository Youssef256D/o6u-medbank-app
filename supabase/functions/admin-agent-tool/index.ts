import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN_PATTERN = /^mba_[A-Za-z0-9_-]{32,128}$/;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitByAgent = new Map<string, { count: number; startedAt: number }>();
const ACTION_PERMISSIONS: Record<string, string> = {
  get_dashboard_summary: "read_dashboard",
  create_announcement_draft: "draft_announcements",
  request_publish_announcement: "request_content_publish",
};

function parseAllowedOrigins(): string[] {
  return String(Deno.env.get("ALLOWED_ORIGIN") || "https://youssef256d.github.io")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCorsHeaders(requestOrigin: string): HeadersInit {
  const configured = parseAllowedOrigins();
  const origin = !configured.length || configured.includes("*")
    ? "*"
    : configured.includes(requestOrigin) ? requestOrigin : configured[0];
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Agent-Token, apikey, x-client-info",
  };
  if (origin !== "*") headers.Vary = "Origin";
  return headers;
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

function readAgentToken(req: Request): string {
  const headerToken = String(req.headers.get("x-agent-token") || "").trim();
  if (headerToken) return headerToken;
  const authorization = String(req.headers.get("authorization") || "").trim();
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((entry) => entry.toString(16).padStart(2, "0"))
    .join("");
}

async function logAction(
  adminClient: ReturnType<typeof createClient>,
  agentId: string | null,
  actionKey: string,
  actionStatus: string,
  requestPayload: Record<string, unknown>,
  responseSummary: Record<string, unknown>,
) {
  await adminClient.from("admin_agent_action_log").insert({
    agent_id: agentId,
    action_key: actionKey,
    action_status: actionStatus,
    request_payload: requestPayload,
    response_summary: responseSummary,
  });
}

function isRateLimited(agentId: string): boolean {
  const now = Date.now();
  const current = rateLimitByAgent.get(agentId);
  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitByAgent.set(agentId, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function summarizeRequestPayload(action: string, input: Record<string, unknown>): Record<string, unknown> {
  if (action === "create_announcement_draft") {
    return {
      courseId: String(input.courseId || "").trim(),
      title: String(input.title || "").trim().slice(0, MAX_TITLE_LENGTH),
    };
  }
  if (action === "request_publish_announcement") {
    return {
      announcementId: String(input.announcementId || "").trim(),
      reason: String(input.reason || "").trim().slice(0, 240),
    };
  }
  return {};
}

Deno.serve(async (req) => {
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(requestOrigin) });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." }, requestOrigin);
  }

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { ok: false, error: "Agent service is not configured." }, requestOrigin);
  }

  const token = readAgentToken(req);
  if (!TOKEN_PATTERN.test(token)) {
    return jsonResponse(401, { ok: false, error: "Invalid agent token." }, requestOrigin);
  }

  let body: { action?: string; input?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON payload." }, requestOrigin);
  }
  const action = String(body.action || "").trim();
  const input = body.input && typeof body.input === "object" ? body.input : {};
  const auditInput = summarizeRequestPayload(action, input);
  const requiredPermission = ACTION_PERMISSIONS[action];
  if (!requiredPermission) {
    return jsonResponse(400, { ok: false, error: "Unknown agent action." }, requestOrigin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256Hex(token);
  const { data: agent, error: agentError } = await adminClient
    .from("admin_agents")
    .select("id,name,status")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (agentError || !agent || agent.status !== "active") {
    return jsonResponse(401, { ok: false, error: "Agent is not authorized." }, requestOrigin);
  }
  if (isRateLimited(agent.id)) {
    await logAction(adminClient, agent.id, action, "denied", auditInput, { error: "Rate limit exceeded." });
    return jsonResponse(429, { ok: false, error: "Agent request limit reached. Try again shortly." }, requestOrigin);
  }

  const { data: permission } = await adminClient
    .from("admin_agent_permissions")
    .select("permission_key")
    .eq("agent_id", agent.id)
    .eq("permission_key", requiredPermission)
    .maybeSingle();
  if (!permission) {
    await logAction(adminClient, agent.id, action, "denied", auditInput, { error: "Missing permission." });
    return jsonResponse(403, { ok: false, error: "Agent is not permitted to perform this action." }, requestOrigin);
  }

  await adminClient.from("admin_agents").update({ last_used_at: new Date().toISOString() }).eq("id", agent.id);

  try {
    if (action === "get_dashboard_summary") {
      const [coursesResult, requestsResult, profilesResult] = await Promise.all([
        adminClient.from("platform_courses").select("id", { count: "exact", head: true }),
        adminClient.from("platform_course_enrollment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      ]);
      const result = {
        courses: coursesResult.count || 0,
        pendingEnrollmentRequests: requestsResult.count || 0,
        students: profilesResult.count || 0,
      };
      await logAction(adminClient, agent.id, action, "success", {}, result);
      return jsonResponse(200, { ok: true, agent: agent.name, result }, requestOrigin);
    }

    if (action === "create_announcement_draft") {
      const courseId = String(input.courseId || "").trim();
      const title = String(input.title || "").trim();
      const announcementBody = String(input.body || "").trim();
      if (
        !/^[0-9a-f-]{36}$/i.test(courseId)
        || !title
        || title.length > MAX_TITLE_LENGTH
        || !announcementBody
        || announcementBody.length > MAX_BODY_LENGTH
      ) {
        await logAction(adminClient, agent.id, action, "failed", auditInput, { error: "Missing required draft fields." });
        return jsonResponse(400, { ok: false, error: "Provide a courseId, a short title, and body text under 4000 characters." }, requestOrigin);
      }
      const { data: announcement, error } = await adminClient
        .from("platform_course_announcements")
        .insert({ course_id: courseId, title, body: announcementBody, is_published: false })
        .select("id,course_id,title,is_published,created_at")
        .single();
      if (error) throw error;
      await logAction(adminClient, agent.id, action, "success", { courseId, title }, {
        announcementId: announcement.id,
        published: false,
      });
      return jsonResponse(200, { ok: true, result: announcement }, requestOrigin);
    }

    const announcementId = String(input.announcementId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(announcementId)) {
      await logAction(adminClient, agent.id, action, "failed", auditInput, { error: "Missing announcement id." });
      return jsonResponse(400, { ok: false, error: "announcementId is required." }, requestOrigin);
    }
    const { data: announcementDraft, error: draftError } = await adminClient
      .from("platform_course_announcements")
      .select("id,course_id,title,body,is_published")
      .eq("id", announcementId)
      .maybeSingle();
    if (draftError || !announcementDraft || announcementDraft.is_published) {
      await logAction(adminClient, agent.id, action, "failed", { announcementId }, {
        error: "Only an existing unpublished announcement can be submitted for approval.",
      });
      return jsonResponse(400, { ok: false, error: "Only an existing unpublished announcement can be submitted for approval." }, requestOrigin);
    }
    const { data: approval, error } = await adminClient
      .from("admin_agent_approval_requests")
      .insert({
        agent_id: agent.id,
        action_key: action,
        request_payload: {
          announcementId,
          courseId: announcementDraft.course_id,
          title: announcementDraft.title,
          body: announcementDraft.body,
        },
        reason: String(input.reason || "").trim() || null,
      })
      .select("id,status,created_at")
      .single();
    if (error) throw error;
    await logAction(adminClient, agent.id, action, "approval_requested", { announcementId, title: announcementDraft.title }, {
      approvalRequestId: approval.id,
    });
    return jsonResponse(202, { ok: true, approvalRequired: true, result: approval }, requestOrigin);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error || "").trim() || "Agent action failed.";
    await logAction(adminClient, agent.id, action, "failed", auditInput, { error: message });
    return jsonResponse(500, { ok: false, error: message }, requestOrigin);
  }
});
