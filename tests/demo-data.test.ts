import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { buildDemoDataset, HERO_SESSION_ID } from "../demo/dataset.ts";
import { SEED_DIR } from "../demo/runtime.mjs";
import type { VtMessage } from "../src/core/native-messages.ts";
import type { ToolResultMessage } from "@earendil-works/pi-ai";

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vt-demo-data-"));
fs.cpSync(SEED_DIR, temporary, { recursive: true });
process.env.VT_DATA_DIR = temporary;
process.env.VT_AUTH_FILE = path.join(temporary, "unused-auth.json");
const { chatStore } = await import("../src/store/chats.ts");
const { graphStore } = await import("../src/store/graph.ts");
const { getGraph, graphSnapshot } = await import("../src/core/graph.ts");
const { danglingQuestionOf, activeProblemOf, toLlmMessages } = await import("../src/core/native-messages.ts");
const { phaseAt3Vt } = await import("../src/core/phases.ts");
const { projectView } = await import("../src/core/view.ts");
const { coverageOf } = await import("../src/core/coverage.ts");
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

test("demo records render through production stores and can continue without pending tool calls", () => {
	const list = chatStore.listChats();
	assert.equal(list.length, 8);
	assert.equal(list.filter(chat => chat.kind === "teach").length, 6);
	assert.equal(list.filter(chat => chat.kind === "practice").length, 2);
	for (const summary of list) {
		const chat = chatStore.getChat(summary.id)!;
		assert.ok(chat.messages.length >= 9);
		assert.equal(danglingQuestionOf(chat.messages), null);
		assert.equal(activeProblemOf(chat.messages), null);
		assert.ok(projectView(chat.messages).length > 0);
		if (chat.kind === "teach") {
			assert.equal(phaseAt3Vt(chat.messages), "teach");
			assert.equal(chat.tree?.nodes.length, 6);
			assert.equal(coverageOf(chat.messages, graphStore.readCoverage(), chat.id).uncoveredCount, 0);
		}
		const pending = new Set<string>();
		for (const message of toLlmMessages(chat.messages)) {
			assert.notEqual(message.role, "custom");
			if (message.role === "assistant") for (const block of message.content) if (block.type === "toolCall") pending.add(block.id);
			if (message.role === "toolResult") {
				assert.ok(pending.delete(message.toolCallId), "every result corresponds to a preceding call");
			}
		}
		assert.equal(pending.size, 0);
		assert.equal(chat.messages.at(-1)?.role, "assistant");
		assert.equal(chat.settings?.model, undefined, "saved sample model stamps never pin the live provider");
	}
});

test("demo graph retains all 36 concepts, valid reasoning endpoints, positions and source passages", () => {
	const graph = getGraph(graphStore);
	assert.equal(graph.nodes.length, 36);
	assert.equal(graph.chains.length, 23);
	const ids = new Set(graph.nodes.map(node => node.id));
	for (const chain of graph.chains) {
		assert.ok(ids.has(chain.conclusion));
		assert.ok(chain.premises.every(id => ids.has(id)));
	}
	for (const node of graph.nodes) {
		assert.ok(graphStore.readPositions()[node.id]);
		for (const source of node.provenance) {
			const message = chatStore.getChat(source.chatId)?.messages.find(m => m.id === source.messageId);
			assert.ok(message && message.role === "assistant");
			assert.ok(JSON.stringify(message.content).includes(node.statement), "the cited passage actually contains the concept");
		}
	}
	const snapshot = graphSnapshot({ graphStore, chatStore });
	assert.equal(snapshot.propositions.length, 36);
	assert.ok(snapshot.edges.length > 50);
	assert.equal(Object.keys(snapshot.sessions).length, 6);
	const reached = new Set([snapshot.nodes[0]!.id]);
	for (let iteration = 0; iteration < snapshot.nodes.length; iteration++) {
		for (const edge of snapshot.edges) {
			if (reached.has(edge.from)) reached.add(edge.to);
			if (reached.has(edge.to)) reached.add(edge.from);
		}
	}
	assert.ok(graph.nodes.every(node => reached.has(node.id)), "all six lessons connect through the same knowledge graph");
});

test("hero lesson honestly grades the initial misconception and the successful follow-up", () => {
	const chat = chatStore.getChat(HERO_SESSION_ID)!;
	const answers = chat.messages.filter((m): m is VtMessage & ToolResultMessage => m.role === "toolResult" && m.toolName === "quiz");
	const first = answers[0]!.details as { correct: boolean; answers: { label: string }[]; correctIndices: number[] };
	assert.equal(first.correct, false);
	assert.equal(first.answers[0]!.label, "0.2");
	assert.deepEqual(first.correctIndices, [2]);
	assert.equal((answers[1]!.details as { correct: boolean }).correct, true);
});

test("committed seed records match their deterministic generator and contain no provider secrets", () => {
	const dataset = buildDemoDataset();
	assert.deepEqual(buildDemoDataset(), dataset);
	for (const chat of dataset.chats) {
		assert.deepEqual(JSON.parse(fs.readFileSync(path.join(SEED_DIR, "chats", `${chat.id}.json`), "utf8")), JSON.parse(JSON.stringify(chat)));
	}
	const settings = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "settings.json"), "utf8"));
	assert.equal(settings.models, undefined);
	assert.equal(fs.existsSync(path.join(SEED_DIR, "auth.json")), false);
	assert.equal(fs.existsSync(path.join(SEED_DIR, "chatgpt-credentials.json")), false);
});
