import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

function getExtensionFromMimeType(mimeType) {
  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return extensionByMimeType[mimeType] || null;
}

async function removeProfileImageFromDisk(imagePath) {
  if (!imagePath) return;
  const relativePath = imagePath.replace(/^\/+/, "");
  if (!relativePath.startsWith("profile-images/")) return;

  const filePath = path.join(process.cwd(), "public", relativePath);
  try {
    await fs.rm(filePath);
  } catch {}
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid user id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400, headers: corsHeaders }
      );
    }

    const extension = getExtensionFromMimeType(file.type);
    if (!extension) {
      return NextResponse.json(
        { message: "Only image files allowed" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const user = await db.collection("user").findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const filename = `${randomBytes(32).toString("hex")}.${extension}`;
    const savePath = path.join(process.cwd(), "public", "profile-images", filename);
    const arrayBuffer = await file.arrayBuffer();

    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(savePath, Buffer.from(arrayBuffer));

    await removeProfileImageFromDisk(user.profileImage);

    const imageUrl = `/profile-images/${filename}`;
    await db
      .collection("user")
      .updateOne({ _id: new ObjectId(id) }, { $set: { profileImage: imageUrl } });

    return NextResponse.json({ imageUrl }, { status: 200, headers: corsHeaders });
  } catch (error) {
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
    const user = await db.collection("user").findOne({ _id: new ObjectId(id) });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    await removeProfileImageFromDisk(user.profileImage);

    await db
      .collection("user")
      .updateOne({ _id: new ObjectId(id) }, { $set: { profileImage: null } });

    return NextResponse.json({ message: "Image removed" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { message: error.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
