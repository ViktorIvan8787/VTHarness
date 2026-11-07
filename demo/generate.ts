/** Regenerate the committed, credential-free sample records: node --import tsx demo/generate.ts */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildDemoDataset } from "./dataset.ts";

const target = fileURLToPath(new URL("./seed/", import.meta.url));
const data = buildDemoDataset();
// This directory contains generated sample records only, never demo runtime data.
rmSync(target, { recursive: true, force: true });
mkdirSync(path.join(target, "chats"), { recursive: true });
mkdirSync(path.join(target, "graph"));
const json = (name: string, value: unknown) => writeFileSync(path.join(target, name), JSON.stringify(value, null, "\t") + "\n");
const jsonl = (name: string, values: unknown[]) => writeFileSync(path.join(target, name), values.map(v => JSON.stringify(v)).join("\n") + "\n");
for (const chat of data.chats) json(`chats/${chat.id}.json`, chat);
jsonl("graph/nodes.jsonl", data.nodes);
jsonl("graph/chains.jsonl", data.chains);
jsonl("graph/coverage.jsonl", data.coverage);
jsonl("graph/sessions.jsonl", data.chats.filter(c => c.kind === "teach").map(c => ({ chatId: c.id, foldedAt: c.updatedAt })));
json("graph/format.json", { version: 1 });
json("graph/sources.json", {});
json("graph/positions.json", { positions: data.positions, updatedAt: 0 });
json("graph/render-settings.json", data.renderSettings);
json("settings.json", data.settings);
json("manifest.json", data.manifest);
console.log(`Generated ${data.chats.length} synthetic sessions, ${data.nodes.length} propositions, and ${data.chains.length} reasoning chains in demo/seed/.`);
