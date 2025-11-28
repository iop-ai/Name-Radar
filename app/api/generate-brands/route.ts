import { auth } from "@/lib/auth";
import { isUserSubscribed } from "@/lib/subscription";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Check subscription
    const hasSubscription = await isUserSubscribed();
    if (!hasSubscription) {
      return NextResponse.json(
        { error: "Subscription required. Please subscribe to generate brand names." },
        { status: 403 }
      );
    }

    // Get the user input from request body
    const body = await request.json();
    const { userInput } = body;

    if (!userInput || typeof userInput !== "string" || userInput.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a brand description." },
        { status: 400 }
      );
    }

    // Get Fireworks API key
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      console.error("Fireworks API key not configured");
      return NextResponse.json(
        { error: "Service configuration error. Please contact support." },
        { status: 500 }
      );
    }

    // Build the prompt
    const prompt = `You are a creative brand naming expert. Generate 10 unique, catchy brand names based on this description: "${userInput}".

For each name, provide:
1. The brand name
2. A brief explanation of why it fits

Return ONLY valid JSON in this exact format, nothing else:
[
  {"name": "BrandName1", "explanation": "Why this name fits"},
  {"name": "BrandName2", "explanation": "Why this name fits"}
]`;

    // Call Fireworks API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that returns only valid JSON responses.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 3000,
          top_p: 0.9,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fireworks API Error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate brand names. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from the response
    let brandNames;
    try {
      brandNames = JSON.parse(content);
    } catch {
      // Try to extract JSON array from markdown or text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        brandNames = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Could not parse JSON from response:", content);
        return NextResponse.json(
          { error: "Invalid response from AI. Please try again." },
          { status: 500 }
        );
      }
    }

    if (!Array.isArray(brandNames) || brandNames.length === 0) {
      return NextResponse.json(
        { error: "No brand names generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ brandNames });
  } catch (error) {
    console.error("Error generating brand names:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
