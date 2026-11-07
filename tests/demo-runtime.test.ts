import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { acquireDemoLock, prepareDemo, SEED_DIR } from "../demo/runtime.mjs";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "vt-demo-launcher-"));
	roots.push(root);
	const source = path.join(root, "regular");
	fs.mkdirSync(source);
	const settingsFile = path.join(source, "settings.json");
	const models = { strong: { model: { provider: "fixture-provider", id: "chosen-tutor" } }, cheap: { model: { provider: "fixture-provider", id: "chosen-helper" } }, vision: { model: { provider: "fixture-provider", id: "chosen-vision" } } };
	fs.writeFileSync(settingsFile, JSON.stringify({ version: 1, models, graph: { rendering: false } }));
	fs.writeFileSync(path.join(source, "chatgpt-credentials.json"), "fixture-secret-must-stay-here");
	return { root, settingsFile, models, runtime: path.join(root, "runtime") };
}

test("initial demo imports saved model settings without copying credentials or changing ordinary data", () => {
	const f = fixture();
	const before = fs.readFileSync(f.settingsFile);
	const { dataDir, initialized } = prepareDemo(f.runtime, f.settingsFile);
	assert.equal(initialized, true);
	assert.equal(fs.readdirSync(path.join(dataDir, "chats")).length, 8);
	assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, "settings.json"), "utf8")).models, f.models);
	assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, "settings.json"), "utf8")).graph.rendering, true);
	assert.equal(fs.existsSync(path.join(dataDir, "chatgpt-credentials.json")), false);
	assert.deepEqual(fs.readFileSync(f.settingsFile), before);
	assert.equal(fs.readFileSync(path.join(path.dirname(f.settingsFile), "chatgpt-credentials.json"), "utf8"), "fixture-secret-must-stay-here");
});

test("ordinary restart keeps rehearsal changes; explicit reset restores seed and keeps demo choices", () => {
	const f = fixture();
	const { dataDir } = prepareDemo(f.runtime, f.settingsFile);
	const settings = { version: 1, models: { strong: { model: { provider: "fixture-provider", id: "rehearsal-choice" } } } };
	fs.writeFileSync(path.join(dataDir, "settings.json"), JSON.stringify(settings));
	const file = "chat_demo_gradient-descent.json";
	fs.writeFileSync(path.join(dataDir, "chats", file), "rehearsal edit");
	fs.mkdirSync(path.join(dataDir, "jobs"));
	fs.writeFileSync(path.join(dataDir, "jobs", "rehearsal.json"), "{}");
	assert.equal(prepareDemo(f.runtime, f.settingsFile).initialized, false);
	assert.equal(fs.readFileSync(path.join(dataDir, "chats", file), "utf8"), "rehearsal edit");
	prepareDemo(f.runtime, f.settingsFile, true);
	assert.deepEqual(fs.readFileSync(path.join(dataDir, "chats", file)), fs.readFileSync(path.join(SEED_DIR, "chats", file)));
	assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, "settings.json"), "utf8")).models, settings.models);
	assert.equal(fs.existsSync(path.join(dataDir, "jobs")), false);
});

test("demo reset refuses unrecognised data instead of overwriting it", () => {
	const f = fixture();
	const data = path.join(f.runtime, "data");
	fs.mkdirSync(data, { recursive: true });
	fs.writeFileSync(path.join(data, "keep.json"), "keep this file");
	assert.throws(() => prepareDemo(f.runtime, f.settingsFile, true), /Refusing to overwrite/);
	assert.equal(fs.readFileSync(path.join(data, "keep.json"), "utf8"), "keep this file");
});

test("the demo lock prevents concurrent launch/reset and is released after stopping", () => {
	const f = fixture();
	const release = acquireDemoLock(f.runtime);
	assert.throws(() => acquireDemoLock(f.runtime), /already running/);
	release();
	const nextRelease = acquireDemoLock(f.runtime);
	nextRelease();
});
