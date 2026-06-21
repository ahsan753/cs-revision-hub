import { adminClient, userClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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

    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return jsonResponse(req, { ok: true });
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
