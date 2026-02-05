import { NextResponse } from "next/server";
import { planSchema } from "@/lib/schema";

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

function buildEditPrompt(input: {
  plan: unknown;
  prompt: string;
  messages: { role: string; content: string }[];
  instruction: string;
}) {
  const history = input.messages.length
    ? input.messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n")
    : "None.";

  return [
    "You are a senior technical project planner.",
    "Update the existing plan JSON based on the user's latest instruction.",
    "Return JSON with two fields: message (a short, friendly summary of changes) and plan (the full updated plan).",
    "The plan must conform exactly to the required schema, including team_members and assignees.",
    "Every task must include 2-4 subtasks.",
    "Preserve IDs and existing structure where possible unless the user explicitly requests changes.",
    "Only output JSON that matches the required schema.",
    "",
    "Original prompt:",
    input.prompt || "(none)",
    "",
    "Current plan JSON:",
    JSON.stringify(input.plan, null, 2),
    "",
    "Conversation so far:",
    history,
    "",
    "Latest instruction:",
    input.instruction
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in the environment." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const plan = body?.plan;
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const instruction = typeof body?.instruction === "string" ? body.instruction : "";
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (!plan || !instruction.trim()) {
    return NextResponse.json({ error: "Plan and instruction are required." }, { status: 400 });
  }

  const input = buildEditPrompt({
    plan,
    prompt,
    messages,
    instruction: instruction.trim()
  });

  const editSchema = {
    name: "plan_edit_response",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["message", "plan"],
      properties: {
        message: { type: "string" },
        plan: planSchema.schema
      }
    }
  } as const;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: editSchema.name,
          schema: editSchema.schema,
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
    return NextResponse.json({ plan: json.plan, message: json.message });
  } catch (error) {
    return NextResponse.json(
      { error: "Model did not return valid JSON.", details: outputText },
      { status: 500 }
    );
  }
}
