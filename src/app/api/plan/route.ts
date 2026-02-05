import { NextResponse } from "next/server";
import { planSchema } from "@/lib/schema";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_TOTAL_SIZE = 6 * 1024 * 1024; // 6MB

function buildPrompt(userPrompt: string, files: { name: string; type: string; text: string }[]) {
  const fileBlocks = files
    .map((file) => {
      return `File: ${file.name}\nType: ${file.type || "unknown"}\n---\n${file.text}`;
    })
    .join("\n\n");

  return [
    "You are a senior technical project planner.",
    "Return a JSON plan that includes epics, stories, tasks, subtasks, and completion requirements for each task.",
    "Every task must include 2-4 subtasks.",
    "Use clear, action-oriented titles. Keep items atomic and well-scoped.",
    "Include all fields required by the schema. If a field is unknown, use an empty string or empty array.",
    "Only output JSON that matches the required schema.",
    "",
    "User prompt:",
    userPrompt.trim(),
    fileBlocks ? "" : "",
    fileBlocks ? "Attached files:" : "",
    fileBlocks ? fileBlocks : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function extractOutputText(data: any): string | null {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const output = data?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const contents = item?.content;
      if (!Array.isArray(contents)) continue;
      for (const content of contents) {
        if (content?.type === "output_text" && typeof content.text === "string") {
          return content.text;
        }
        if (typeof content?.text === "string") {
          return content.text;
        }
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in the environment." },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const prompt = String(form.get("prompt") || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const files = form.getAll("files").filter((file) => file instanceof File) as File[];
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files. Max ${MAX_FILES}.` },
      { status: 400 }
    );
  }

  let totalSize = 0;
  const filePayload: { name: string; type: string; text: string }[] = [];

  for (const file of files) {
    totalSize += file.size;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: `Total upload size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    const text = await file.text();
    filePayload.push({ name: file.name, type: file.type, text });
  }

  const userInput = buildPrompt(prompt, filePayload);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: userInput,
      text: {
        format: {
          type: "json_schema",
          name: planSchema.name,
          schema: planSchema.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "OpenAI request failed.", details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  const outputText = extractOutputText(data);

  if (!outputText) {
    return NextResponse.json(
      { error: "Unable to parse OpenAI response." },
      { status: 500 }
    );
  }

  try {
    const json = JSON.parse(outputText);
    return NextResponse.json({ plan: json });
  } catch (error) {
    return NextResponse.json(
      { error: "Model did not return valid JSON.", details: outputText },
      { status: 500 }
    );
  }
}
