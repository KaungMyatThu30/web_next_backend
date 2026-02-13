import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaultjwtsecret";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }
  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const email = user.email;
    const profile = await db
      .collection("user")
      .findOne({ email }, { projection: { password: 0 } });
    if (!profile) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }
    return NextResponse.json(profile, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(error.toString(), { headers: corsHeaders });
  }
}

export async function PUT(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const firstname = payload.firstname?.trim();
  const lastname = payload.lastname?.trim();
  const email = payload.email?.trim().toLowerCase();

  if (!firstname || !lastname || !email) {
    return NextResponse.json(
      { message: "First name, last name and email are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: "Invalid email format" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const updateResult = await db.collection("user").updateOne(
      { email: user.email },
      {
        $set: {
          firstname,
          lastname,
          email,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        email,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        message: "Profile updated",
        data: {
          firstname,
          lastname,
          email,
        },
      },
      { status: 200, headers: corsHeaders }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate Email!!" },
        { status: 400, headers: corsHeaders }
      );
    }
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500, headers: corsHeaders }
    );
  }
}
