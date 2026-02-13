import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid user id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = await req.json();
    const update = {};

    if (typeof payload.firstname === "string") {
      update.firstname = payload.firstname.trim();
    }
    if (typeof payload.lastname === "string") {
      update.lastname = payload.lastname.trim();
    }
    if (typeof payload.email === "string") {
      update.email = payload.email.trim().toLowerCase();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");
    const result = await db
      .collection("user")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ message: "User updated" }, { headers: corsHeaders });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate Email!!" },
        { status: 400, headers: corsHeaders }
      );
    }
    return NextResponse.json(
      { message: error.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid user id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");
    const result = await db.collection("user").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ message: "User deleted" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { message: error.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
