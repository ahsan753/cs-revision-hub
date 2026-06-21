import { Resend } from "npm:resend@6.6.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface EmailRequest {
  to?: string;
  subject?: string;
  html?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      req,
      { error: "RESEND_API_KEY is not set." },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as EmailRequest;
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL") ?? "CS Revision Hub <onboarding@resend.dev>",
      to: [body.to ?? "techlecturer57@gmail.com"],
      subject: body.subject ?? "Hello World",
      html:
        body.html ??
        "<p>Congrats on sending your <strong>first email</strong>!</p>",
    });

    if (error) {
      return jsonResponse(req, { error }, { status: 400 });
    }

    return jsonResponse(req, { data });
  } catch (error) {
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
});
