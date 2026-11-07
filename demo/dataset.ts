import type { AssistantMessage, JsonObject } from "@earendil-works/pi-ai";
import type { ChatRecord, GraphChain, GraphNode, PlanTree } from "../src/core/contracts.ts";
import type { VtMessage } from "../src/core/native-messages.ts";
import { newAnswerResult, newGraphContextMessage, newHandoffMessage, newThinkingMessage } from "../src/core/native-messages.ts";
import { buildAnswer, normalizeOptions, resolveCorrect, type QuestionData } from "../src/core/question-core.ts";
import { CONCLUDE_ACK_TEXT } from "../src/core/contracts/chat.ts";
import { PROBE_DONE_ACK_TEXT } from "../src/core/contracts/probe.ts";
import { coverageSlots } from "../src/core/coverage.ts";
import { planBlocksFor } from "../src/core/plan-blocks.ts";
import { DEFAULT_RENDER_SETTINGS } from "../src/core/render-settings.ts";
import { deriveView } from "../src/core/graph.ts";
import { incrementalLayout } from "../src/core/layout.ts";
import { argumentsForGraph, lessons, practices, type DemoQuiz } from "./content.ts";

export const HERO_SESSION_ID = "chat_demo_gradient-descent";
export const DEMO_SEED_VERSION = 2;
const nodeId = (slug: string) => `n_demo_${slug}`;

/** Stable record ids and times make the seed reproducible and easy to inspect. */
class Transcript {
	readonly messages: VtMessage[] = [];
	constructor(readonly slug: string, readonly startedAt: number) {}
	add<T extends VtMessage>(message: T): T {
		const stamped = { ...message, id: `msg_demo_${this.slug}_${this.messages.length}`, timestamp: this.startedAt + this.messages.length * 60_000 };
		this.messages.push(stamped);
		return stamped;
	}
	user(content: string) {
		return this.add({ id: "", role: "user", content, timestamp: 0 });
	}
	assistant(text: string, name?: string, args: JsonObject = {}) {
		const content: AssistantMessage["content"] = text ? [{ type: "text", text }] : [];
		if (name) content.push({ type: "toolCall", id: `call_demo_${this.slug}_${this.messages.length}`, name, arguments: args });
		return this.add({
			id: "", role: "assistant", content, api: "openai-responses", provider: "synthetic", model: "demo-transcript",
			usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
			stopReason: name ? "toolUse" : "stop", timestamp: 0,
		});
	}
	result(message: AssistantMessage, text: string, details: unknown = null) {
		const call = message.content.find(block => block.type === "toolCall")!;
		if (call.type !== "toolCall") throw new Error("Demo tool result requires a call");
		return this.add({ id: "", role: "toolResult", toolCallId: call.id, toolName: call.name, content: [{ type: "text", text }], details: details as JsonObject, isError: false, timestamp: 0 });
	}
	quiz(quiz: DemoQuiz, tool: "probe" | "quiz", type?: "predict" | "check", planNode?: string) {
		const options = normalizeOptions(quiz.options.map((label, i) => ({ label, value: `choice-${i}` })));
		const correctAnswer = options[quiz.correct]!.value;
		const call = this.assistant("", tool, {
			question: quiz.question, options: options.map(({ label, value }) => ({ label, value })), correctAnswer, explanation: quiz.explanation,
			...(type ? { type } : {}), ...(planNode ? { nodeId: planNode } : {}),
		});
		const toolCall = call.content.find(block => block.type === "toolCall")!;
		if (toolCall.type !== "toolCall") throw new Error("Missing demo quiz call");
		const question: QuestionData = {
			id: toolCall.id, kind: "quiz", questionType: type, question: quiz.question, mode: "single-select", options,
			correctIndices: resolveCorrect(correctAnswer, options).indices, explanation: quiz.explanation, createdAt: new Date(call.timestamp).toISOString(),
		};
		const answer = buildAnswer(question, { values: [options[quiz.selected ?? quiz.correct]!.value], confidence: type === "predict" ? 60 : 90, thinking: quiz.thinking }, tool);
		answer.answeredAt = new Date(call.timestamp + 60_000).toISOString();
		this.add(newAnswerResult(toolCall.id, tool, answer));
	}
	get updatedAt() { return new Date(this.messages.at(-1)!.timestamp).toISOString(); }
}

export function buildDemoDataset() {
	const chats: ChatRecord[] = [];
	const nodes: GraphNode[] = [];
	for (const [index, lesson] of lessons.entries()) {
		const transcript = new Transcript(lesson.slug, index < 6 ? Date.UTC(2026, 9, 31 + index, 9) : Date.UTC(2026, 7, index, 9));
		const chatId = `chat_demo_${lesson.slug}`;
		transcript.user(lesson.opening);
		transcript.assistant("Let's find a useful starting point. I'll ask one short question, then build a plan from your reasoning.");
		transcript.quiz(lesson.probe, "probe");
		const probe = transcript.assistant("", "probe_done", { assessment: {
			strands: [{ strand: lesson.concepts[0]![1], assessment: "The learner can reason through a concrete example. Build from that example to the new relationship, then check transfer with different numbers or a different case." }], summary: lesson.goal,
		} });
		transcript.result(probe, PROBE_DONE_ACK_TEXT, { ok: true });
		transcript.add(newHandoffMessage(chatId));
		const tree: PlanTree = {
			nodes: lesson.concepts.map(([id, title, summary]) => ({ id, title, summary })),
			edges: lesson.concepts.slice(1).map(([id], i) => ({ from: lesson.concepts[i]![0], to: id })), version: 1,
		};
		const mermaid = ["graph TD", ...tree.nodes.map(n => `  ${n.id}[${n.title}]`), ...tree.edges.map(e => `  ${e.from} --> ${e.to}`)].join("\n");
		const plan = transcript.assistant(`Here is our route: ${lesson.goal} We'll use one concrete example throughout and test the idea with a prediction before the explanation.`, "plan_init", { mermaid });
		const planResult = transcript.result(plan, "Plan saved. The node ids are: " + tree.nodes.map(n => n.id).join(", "), { ok: true, tree });
		for (const block of planBlocksFor([], [plan, planResult], tree, transcript.messages)) {
			const stamped = transcript.add(block);
			if (stamped.role !== "custom") throw new Error("Expected a demo plan marker");
			(stamped.details as { block: { at: string } }).block.at = new Date(stamped.timestamp).toISOString();
		}
		transcript.user("That makes sense. Let's work through the example, and please check where my intuition goes wrong.");
		const firstPassage = transcript.assistant(`${lesson.example}\n\n${lesson.concepts.slice(0, 3).map(([, name, statement]) => `### ${name}\n${statement}`).join("\n\n")}`);
		transcript.quiz(lesson.predict, "quiz", "predict", lesson.concepts[2]![0]);
		transcript.user(lesson.misconception);
		const secondPassage = transcript.assistant(`${lesson.repair}\n\n${lesson.concepts.slice(3).map(([, name, statement]) => `### ${name}\n${statement}`).join("\n\n")}`);
		transcript.quiz(lesson.check, "quiz", "check", lesson.concepts[5]![0]);
		transcript.user(index < 6
			? "I can now explain why that answer works instead of only repeating the rule. How does it connect to the rest of the training process?"
			: "I can now explain why that answer works instead of only repeating the rule. How does it connect to what we learned earlier?");
		transcript.assistant(lesson.transfer);
		const createdAt = new Date(transcript.startedAt).toISOString();
		chats.push({ id: chatId, title: lesson.title, kind: "teach", version: 1, createdAt, updatedAt: transcript.updatedAt, tree, messages: transcript.messages });
		lesson.concepts.forEach(([slug, name, statement], i) => nodes.push({
			id: nodeId(slug), name, statement, aliases: [statement], createdAt,
			provenance: [{ chatId, messageId: i < 3 ? firstPassage.id : secondPassage.id }],
		}));
	}
	const byId = new Map(nodes.map(node => [node.id, node]));
	const chains: GraphChain[] = argumentsForGraph.map(([premises, conclusion], i) => {
		const node = byId.get(nodeId(conclusion))!;
		return { id: `arg_demo_${String(i + 1).padStart(2, "0")}`, premises: premises.map(nodeId), conclusion: node.id, provenance: node.provenance, createdAt: node.createdAt };
	});
	for (const [index, practice] of practices.entries()) {
		const transcript = new Transcript(practice.slug, index < 2 ? Date.UTC(2026, 10, 6 + index, 9) : Date.UTC(2026, 7, 21 + index, 9));
		const picks = practice.targets.map(slug => byId.get(nodeId(slug))!);
		const targetIds = new Set(picks.map(p => p.id));
		const contextChains = chains.filter(c => targetIds.has(c.conclusion) && c.premises.every(p => targetIds.has(p))).map(c => `${c.premises.map(id => byId.get(id)!.name).join(" + ")} → ${byId.get(c.conclusion)!.name}`);
		transcript.add(newGraphContextMessage(picks, contextChains));
		transcript.user(practice.opening);
		const problem = transcript.assistant("Try this on your own. Write down your reasoning as you go.", "problem", { statement: practice.statement, mode: "composition", target: picks.map(n => n.id), modelSolution: practice.solution });
		transcript.result(problem, "Problem posed. The learner's thinking and answer will follow.");
		const problemCall = problem.content.find(b => b.type === "toolCall")!;
		if (problemCall.type !== "toolCall") throw new Error("Missing demo problem");
		transcript.add(newThinkingMessage(problemCall.id, practice.thinking));
		transcript.user(practice.answer);
		const conclude = transcript.assistant("", "conclude", { outcome: "solved", verdict: practice.verdict, rung: null, missClass: null, retest: false });
		transcript.result(conclude, CONCLUDE_ACK_TEXT);
		transcript.assistant(`${practice.verdict}\n\nYou transferred the idea to a fresh problem. We can continue with a harder example whenever you're ready.`);
		chats.push({ id: `chat_demo_${practice.slug}`, title: practice.title, kind: "practice", version: 1, createdAt: new Date(transcript.startedAt).toISOString(), updatedAt: transcript.updatedAt, messages: transcript.messages });
	}
	const coverage = chats.filter(c => c.kind === "teach").flatMap(chat => coverageSlots(chat.messages).filter(s => s.tokens > 0).map(({ fp, tokens }) => ({ chatId: chat.id, fp, tokens, foldedAt: chat.updatedAt })));
	// Use the app's own layout engine so the saved map opens already settled.
	const view = deriveView({ nodes, chains });
	const clusters = lessons.map(lesson => ({ members: view.nodes.filter(node => node.provenance.some(point => point.chatId === `chat_demo_${lesson.slug}`)).map(node => node.id) }));
	const positions = Object.fromEntries(incrementalLayout(view.nodes, view.edges, new Map(), { clusters, logicalEdges: view.logicalEdges, impLinks: view.impLinks }));
	return {
		chats, nodes, chains, coverage, positions,
		settings: { version: 1, graph: { rendering: true } },
		renderSettings: DEFAULT_RENDER_SETTINGS,
		manifest: { version: DEMO_SEED_VERSION, synthetic: true, sessions: chats.length, propositions: nodes.length, chains: chains.length, heroSession: HERO_SESSION_ID },
	};
}
