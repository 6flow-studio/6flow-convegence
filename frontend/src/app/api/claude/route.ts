import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert reviewer for 6Flow Studio workflows.

6Flow Studio is a tokenization workflow platform for the Chainlink Runtime Environment (CRE). Users design workflows as visual node-edge graphs that compile into deployable CRE TypeScript code.

Key concepts:
- Workflows are directed graphs of typed nodes connected by edges
- Node types include: trigger (scheduleTrigger, webhookTrigger), data (httpRequest, evmRead, evmWrite), transform (jsonParse, abiEncode, abiDecode), control flow (ifElse, merge), convenience (mintToken, burnToken, transferToken, checkKyc), and utility (codeNode, configVar, secretRef)
- CRE has resource budgets: max 5 HTTP calls, 10 EVM reads, 5 EVM writes per execution
- Workflows must have exactly one trigger node as the entry point
- Branch (ifElse) nodes must reconverge with a merge node
- globalConfig holds chain/contract/address settings shared across nodes

Review workflows for: structural issues, missing or invalid configurations, security concerns, CRE best practices, resource budget usage, and optimization opportunities. Be specific and actionable.`;

export async function POST(req: NextRequest) {
  const { message, system } = await req.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: system ?? SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return NextResponse.json({ text });
}
