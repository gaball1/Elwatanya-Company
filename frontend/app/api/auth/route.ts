import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action: action ?? "login",
      user: {
        id: "1",
        email,
        name: email.split("@")[0],
        role: "admin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Auth API ready" });
}
