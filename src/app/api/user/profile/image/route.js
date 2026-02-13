import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs/promises";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

async function parseMultipartFormData(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new Error("Invalid content-type");
  }
  const formData = await req.formData();
  return formData;
}

export async function POST(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }
  let formData;
  try {
    formData = await parseMultipartFormData(req);
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid form data" },
      { status: 400, headers: corsHeaders }
    );
  }
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { message: "No file uploaded" },
      { status: 400, headers: corsHeaders }
    );
  }
  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  const extension = extensionByMimeType[file.type];
  if (!extension) {
    return NextResponse.json(
      { message: "Only image files allowed" },
      { status: 400, headers: corsHeaders }
    );
  }

  const filename = `${randomBytes(32).toString("hex")}.${extension}`;
  const savePath = path.join(
    process.cwd(),
    "public",
    "profile-images",
    filename
  );
  const arrayBuffer = await file.arrayBuffer();
  await fs.mkdir(path.dirname(savePath), { recursive: true });
  await fs.writeFile(savePath, Buffer.from(arrayBuffer));
  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    await db
      .collection("user")
      .updateOne(
        { email: user.email },
        { $set: { profileImage: `/profile-images/${filename}` } }
      );
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500, headers: corsHeaders }
    );
  }
  return NextResponse.json(
    { imageUrl: `/profile-images/${filename}` },
    { status: 200, headers: corsHeaders }
  );
}

export async function DELETE(req) {
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
    const profile = await db.collection("user").findOne({ email });
    if (profile && profile.profileImage) {
      const relativePath = profile.profileImage.replace(/^\/+/, "");
      if (!relativePath.startsWith("profile-images/")) {
        return NextResponse.json(
          { message: "Invalid profile image path" },
          { status: 400, headers: corsHeaders }
        );
      }
      const filePath = path.join(process.cwd(), "public", relativePath);
      try {
        await fs.rm(filePath);
      } catch (err) {}
      await db
        .collection("user")
        .updateOne({ email }, { $set: { profileImage: null } });
    }
    return NextResponse.json(
      { message: "OK" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
