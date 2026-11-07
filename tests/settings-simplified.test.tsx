import React from "react";
(globalThis as Record<string, unknown>).React = React;
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsDialogBody } from "../components/settings/settings-dialog.tsx";
import { AgentSection } from "../components/settings/agent-section.tsx";
import { FACTORY_SETTINGS, sanitizeUserSettings, resolveSettings, AUTH_KEYS } from "../src/core/index.ts";
import { SETTINGS_SECTIONS, parseAgentSettingsBody } from "../src/server/settings-body.ts";

test("Settings contains exactly Providers, Agent, and Graph, with stale links falling back to Providers", () => {
	for (const initialSection of [undefined, "general", "appearance", "keyboard"]) {
		const html = renderToStaticMarkup(<SettingsDialogBody onClose={() => {}} initialSection={initialSection as never} />);
		const tabs = [...html.matchAll(/data-testid="settings-nav-([^"]+)"/g)].map(match => match[1]);
		assert.deepEqual(tabs, ["keys", "agent", "graph"]);
		assert.match(html, /aria-current="true"[^>]*data-testid="settings-nav-keys"|data-testid="settings-nav-keys"[^>]*aria-current="true"/);
	}
});

test("old custom appearance and web-search preferences are ignored while other settings survive", () => {
	const old = { version: 1, appearance: { mode: "light", fontFamily: "Georgia", proseFontSize: 24, background: "#ffffff" }, agent: { search: { engine: "tavily" }, tools: { research: true } }, general: { autoUpdate: false } };
	const record = sanitizeUserSettings(old)!;
	assert.equal(record.appearance, undefined);
	assert.equal("search" in record.agent!, false);
	assert.deepEqual(resolveSettings(old).appearance, FACTORY_SETTINGS.appearance);
	assert.deepEqual(resolveSettings(record).appearance, FACTORY_SETTINGS.appearance);
	assert.equal(resolveSettings(record).general.autoUpdate, false);
	assert.equal(record.agent?.tools?.research, true);
	assert.equal("appearance" in SETTINGS_SECTIONS, false);
	const parsed = parseAgentSettingsBody(old.agent);
	assert.ok(parsed.ok);
	assert.equal("search" in parsed.settings, false);
});

test("Provider and Agent settings have no web-search configuration", () => {
	assert.deepEqual(AUTH_KEYS.map(key => key.id), ["DEEPGRAM_API_KEY"]);
	const html = renderToStaticMarkup(<AgentSection agent={undefined} models={undefined} graph={undefined} compaction={undefined} onSectionChange={() => {}} onModelsChange={() => {}} onCompactionChange={() => {}} />);
	assert.ok(!html.includes("search-engine-row"));
	assert.ok(!html.includes("Search engine"));
});
