import { NextResponse } from "next/server";
import { creditCosts, isCreditAction } from "@/lib/credits/credit-rules";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
  }

  const action = typeof body === "object" && body !== null && "action" in body ? (body as { action?: unknown }).action : null;
  if (!isCreditAction(action)) {
    return NextResponse.json({ success: false, error: "Unknown credit action." }, { status: 400 });
  }

  const credits = creditCosts[action];
  const { error } = await supabase.rpc("consume_creator_credits", {
    credit_action: action,
    credit_amount: credits,
  });

  if (error) {
    const insufficient = /insufficient credits/i.test(error.message);
    return NextResponse.json(
      {
        success: false,
        action,
        credits,
        error: insufficient ? "Insufficient credits" : error.message,
      },
      { status: insufficient ? 402 : 500 },
    );
  }

  return NextResponse.json({
    success: true,
    action,
    creditsUsed: credits,
  });
}
