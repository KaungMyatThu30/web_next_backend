import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("item").deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const partialUpdate = {};

    if (data.name) partialUpdate.itemName = data.name;
    if (data.category) partialUpdate.itemCategory = data.category;
    if (data.price) partialUpdate.itemPrice = data.price;
    if (data.status) partialUpdate.status = data.status;

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db
      .collection("item")
      .updateOne({ _id: new ObjectId(id) }, { $set: partialUpdate });

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}
