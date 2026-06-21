import {
  verifySubmission,
  type FillAnswerKey,
  type FlashcardAnswerKey,
  type McqAnswerKey,
  type ParsonsAnswerKey,
  type PredictAnswerKey,
} from "../../../src/shared/answerCheck.ts";
import { adminClient, userClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Activity = "quiz" | "match" | "memory" | "code" | "convert";

interface RequestBody {
  event_id: string;
  ranked_item_id: string;
  activity: Activity;
  submitted: unknown;
}

interface ContentItem {
  item_id: string;
  content_kind:
    | "mcq"
    | "flashcard"
    | "code-predict"
    | "code-fill"
    | "code-parsons"
    | "conversion";
  ranked_activities: string[];
  difficulty: number;
  answer_key:
    | McqAnswerKey
    | FlashcardAnswerKey
    | PredictAnswerKey
    | FillAnswerKey
    | ParsonsAnswerKey
    | null;
  ranked_enabled: boolean;
}

const allowedActivities = new Set<Activity>([
  "quiz",
  "match",
  "memory",
  "code",
  "convert",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, { status: 405 });
  }

  try {
    const token = getBearerToken(req);
    const authClient = userClient(token);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(req, { error: "Unauthorised" }, { status: 401 });
    }
    if (!user.email_confirmed_at) {
      return jsonResponse(req, { error: "Email is not verified" }, { status: 403 });
    }

    const body = (await req.json()) as RequestBody;
    const validation = validateRequestBody(body);
    if (validation) {
      return jsonResponse(req, { error: validation }, { status: 400 });
    }

    const admin = adminClient();
    const { data: duplicate, error: duplicateError } = await admin
      .from("answer_events")
      .select("xp_awarded, correct")
      .eq("id", body.event_id)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      const totals = await fetchTotals(admin, user.id);
      return jsonResponse(req, {
        correct: duplicate.correct,
        xp_awarded: duplicate.xp_awarded,
        totals,
      });
    }

    const limit = await checkAndIncrementRateLimit(admin, user.id);
    if (!limit.allowed) {
      return jsonResponse(req, { error: "Rate limit exceeded" }, { status: 429 });
    }

    const { data: item, error: itemError } = await admin
      .from("content_items")
      .select("item_id, content_kind, ranked_activities, difficulty, answer_key, ranked_enabled")
      .eq("item_id", body.ranked_item_id)
      .maybeSingle<ContentItem>();

    if (itemError) throw itemError;
    if (!item || !item.ranked_enabled) {
      return jsonResponse(req, { error: "Item is not ranked" }, { status: 400 });
    }
    if (!item.ranked_activities.includes(body.activity)) {
      return jsonResponse(req, { error: "Activity is not ranked for this item" }, { status: 400 });
    }

    const correct = verifySubmission(
      {
        item_id: item.item_id,
        content_kind: item.content_kind,
        answer_key: item.answer_key as never,
      } as never,
      body.activity,
      body.submitted as never,
    );

    const { data: rows, error: applyError } = await admin
      .rpc("apply_ranked_event", {
        p_event_id: body.event_id,
        p_user_id: user.id,
        p_item_id: item.item_id,
        p_activity: body.activity,
        p_content_kind: item.content_kind,
        p_correct: correct,
        p_submitted: body.submitted,
        p_difficulty: item.difficulty,
      });
    if (applyError) throw applyError;

    const row = Array.isArray(rows) ? rows[0] : rows;
    return jsonResponse(req, {
      correct: row?.correct ?? correct,
      xp_awarded: row?.xp_awarded ?? 0,
      totals: {
        xp: row?.xp ?? 0,
        level: row?.level ?? 1,
        streak: row?.streak ?? 0,
        best_streak: row?.best_streak ?? 0,
        total_answered: row?.total_answered ?? 0,
        last_answer_at: row?.last_answer_at ?? null,
        updated_at: row?.updated_at ?? null,
      },
    });
  } catch (error) {
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
});

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Missing bearer token");
  return match[1];
}

function validateRequestBody(body: RequestBody) {
  if (!body || typeof body !== "object") return "Invalid body";
  if (!isUuid(body.event_id)) return "Invalid event id";
  if (typeof body.ranked_item_id !== "string" || body.ranked_item_id.length > 120) {
    return "Invalid item id";
  }
  if (!allowedActivities.has(body.activity)) return "Invalid activity";
  return validateSubmitted(body.submitted);
}

function validateSubmitted(value: unknown): string | null {
  if (!isRecord(value) || typeof value.kind !== "string") return "Invalid submission";
  const jsonSize = JSON.stringify(value).length;
  if (jsonSize > 4096) return "Submission is too large";

  if (value.kind === "mcq") {
    return Number.isInteger(value.selectedIndex) ? null : "Invalid MCQ submission";
  }
  if (value.kind === "match") {
    return isShortString(value.termId) && isShortString(value.definitionId)
      ? null
      : "Invalid match submission";
  }
  if (value.kind === "memory") {
    return isShortString(value.firstPairId) &&
      isShortString(value.secondPairId) &&
      isCardKind(value.firstKind) &&
      isCardKind(value.secondKind)
      ? null
      : "Invalid memory submission";
  }
  if (value.kind === "code-predict") {
    return isBoundedString(value.answer, 1000) ? null : "Invalid code submission";
  }
  if (value.kind === "code-fill") {
    if (!isRecord(value.answersByBlankId)) return "Invalid fill submission";
    return Object.entries(value.answersByBlankId).every(
      ([key, answer]) => isShortString(key) && isBoundedString(answer, 300),
    )
      ? null
      : "Invalid fill submission";
  }
  if (value.kind === "code-parsons") {
    return Array.isArray(value.lines) &&
      value.lines.length <= 40 &&
      value.lines.every((line) => isBoundedString(line, 300))
      ? null
      : "Invalid Parsons submission";
  }
  if (value.kind === "conversion") {
    return isBoundedString(value.mode, 40) &&
      isConversionOperands(value.operands) &&
      isBoundedString(value.submittedAnswer, 200)
      ? null
      : "Invalid conversion submission";
  }
  return "Unknown submission kind";
}

function isConversionOperands(value: unknown) {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "value") return isNumberInRange(value.value, -128, 255);
  if (value.kind === "binary-add") {
    return isNumberInRange(value.left, 0, 255) && isNumberInRange(value.right, 0, 255);
  }
  if (value.kind === "shift") {
    return isNumberInRange(value.value, 0, 255) &&
      (value.direction === "left" || value.direction === "right");
  }
  if (value.kind === "image") {
    return isNumberInRange(value.width, 1, 10000) &&
      isNumberInRange(value.height, 1, 10000) &&
      isNumberInRange(value.depth, 1, 64);
  }
  if (value.kind === "sound") {
    return isNumberInRange(value.seconds, 1, 3600) &&
      isNumberInRange(value.sampleRate, 1, 192000) &&
      isNumberInRange(value.resolution, 1, 64);
  }
  return false;
}

async function checkAndIncrementRateLimit(admin: ReturnType<typeof adminClient>, userId: string) {
  const now = new Date();
  const minuteStart = new Date(now);
  minuteStart.setUTCSeconds(0, 0);
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);

  for (const bucket of [
    { kind: "minute", start: minuteStart.toISOString(), max: 30 },
    { kind: "hour", start: hourStart.toISOString(), max: 300 },
  ]) {
    const { data, error } = await admin
      .from("ranked_rate_limits")
      .select("count")
      .eq("user_id", userId)
      .eq("bucket_kind", bucket.kind)
      .eq("bucket_start", bucket.start)
      .maybeSingle();
    if (error) throw error;
    if ((data?.count ?? 0) >= bucket.max) return { allowed: false };
  }

  for (const bucket of [
    { kind: "minute", start: minuteStart.toISOString() },
    { kind: "hour", start: hourStart.toISOString() },
  ]) {
    const { data } = await admin
      .from("ranked_rate_limits")
      .select("count")
      .eq("user_id", userId)
      .eq("bucket_kind", bucket.kind)
      .eq("bucket_start", bucket.start)
      .maybeSingle();
    const { error } = await admin.from("ranked_rate_limits").upsert({
      user_id: userId,
      bucket_kind: bucket.kind,
      bucket_start: bucket.start,
      count: (data?.count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  return { allowed: true };
}

async function fetchTotals(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await admin
    .from("progress")
    .select("xp, level, streak, best_streak, total_answered, last_answer_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isShortString(value: unknown) {
  return isBoundedString(value, 120);
}

function isBoundedString(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function isCardKind(value: unknown) {
  return value === "term" || value === "definition";
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max;
}
