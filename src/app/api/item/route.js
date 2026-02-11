import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req) {
  // 1. Get Pagination Parameters from URL
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "5"); // Default 5 items per page
  const skip = (page - 1) * limit;

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...corsHeaders,
  };

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");

    // 2. Fetch Paginated Data
    const result = await db
      .collection("item")
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    // 3. Get Total Count for Frontend Pagination Logic
    const totalItems = await db.collection("item").countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json(
      {
        data: result,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
        },
      },
      {
        headers: headers,
      }
    );
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(req) {
  const data = await req.json();

  // Validate required fields
  if (!data.name || !data.price || !data.category) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const result = await db.collection("item").insertOne({
      itemName: data.name,
      itemCategory: data.category,
      itemPrice: parseFloat(data.price), // Ensure price is a number
      status: "ACTIVE", // Default status
    });

    return NextResponse.json(
      { id: result.insertedId },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
}
