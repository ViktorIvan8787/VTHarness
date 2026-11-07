import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { Usage } from "@earendil-works/pi-ai";
import { createWebTools } from "../tools/web.ts";
import { createPdfReadTools } from "../tools/pdf-read.ts";
import type { PiEngine } from "../models.ts";
import { runSubagent } from "./pi-run.ts";

/**
 * The researcher sub-agent (vision §2.5): a SEPARATE ToolLoopAgent instance
 * from the teacher — an isolated loop with URL and PDF reading tools, so
 * raw search/fetch churn never touches the teacher's context window.
 *
 * System prompt adapted from the pi researcher agent
 * (~/.pi/agent/extensions/interactive-subagents/agents/researcher.md).
 * The engine is injectable so tests run the loop with a scripted faux engine.
 */

const INSTRUCTIONS = `You are a research specialist. You work for a teacher agent inside a learning
application: given a research question, conduct thorough web research and produce a focused,
well-sourced brief that the teacher can teach from.

You operate in an isolated context with no knowledge of the lesson or any prior conversation.
All necessary context is in the task description.

Process:
1. Identify the source URLs supplied in the task or context.
2. Read those pages with web_fetch. Follow relevant source links found in their contents.
3. When a URL is a PDF, use web_fetch_pdf and then pdf_extract; use pdf_search to locate relevant pages in long documents. Cite PDF claims with page numbers.
4. Prefer primary sources and explain conflicting or missing evidence.
5. Produce a focused brief grounded in the sources you actually read.

There is no web-search tool. Do not invent URLs, search results, or citations. If the task supplies no usable source URLs, state that source URLs are needed. If available sources do not answer the question, describe the gap. Fetch failures are recoverable: try another supplied URL or report the limitation.

Your FINAL assistant message is your entire deliverable — it must stand alone, using this format:

## Summary
2-3 sentence direct answer.

## Findings
Numbered findings with inline source citations:
1. **Finding** — explanation. [Source](url)

## Sources
- Kept: Source Title (url) — why relevant
- Dropped: Source Title — why excluded

## Gaps
What couldn't be answered. Suggested next steps.`;

export interface ResearcherRunOptions {
	engine?: PiEngine;
	/** The researcher's PDF dir (PDF wave, 2026-10-07): when present, the
	 *  toolset gains web_fetch_pdf + pdf_info/pdf_extract/pdf_search scoped
	 *  to this per-job temp dir — PDFs from the web, read page-level. The
	 *  runner owns its lifecycle (mkdtemp before, rm after). */
	pdfDir?: string;
	abortSignal?: AbortSignal;
	onUsage?: (usage: Usage) => void;
	onToolStart?: (toolName: string, args: unknown) => void;
	/** Debug: raw provider-event recording key (VT_PROVIDER_EVENTS=1). */
	chatId?: string;
}

/**
 * Run the researcher to completion: isolated context, web tools only, final
 * text = the brief. The engine is injectable so tests run
 * the loop scripted.
 */
export async function runResearcherAgent(prompt: string, opts: ResearcherRunOptions = {}): Promise<string> {
	const tools = Object.values(createWebTools());
	if (opts.pdfDir) tools.push(...Object.values(createPdfReadTools(opts.pdfDir)));
	const { text } = await runSubagent(tools, {
		role: "researcher",
		prompt,
		engine: opts.engine,
		systemPrompt: INSTRUCTIONS,
		maxTurns: 12,
		abortSignal: opts.abortSignal,
		onUsage: opts.onUsage,
		onToolStart: opts.onToolStart,
		chatId: opts.chatId,
	});
	return text;
}

export type ResearcherAgent = ReturnType<typeof runResearcherAgent>;
