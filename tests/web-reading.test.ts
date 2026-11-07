import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createWebTools } from "../src/agent/tools/web.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("research tools expose URL reading without a web-search tool", () => {
	assert.deepEqual(Object.keys(createWebTools()), ["web_fetch"]);
});

test("reading a supplied URL returns its source and text without search credentials", async () => {
	const url = "https://example.com/supplied-source";
	globalThis.fetch = async input => {
		assert.equal(String(input), url);
		return new Response("A supplied, synthetic source document.", { headers: { "content-type": "text/plain" } });
	};
	const result = await createWebTools().web_fetch!.execute!("source-read", { url });
	assert.match(String(result.details), /Source: https:\/\/example.com\/supplied-source/);
	assert.match(String(result.details), /synthetic source document/);
});

test("invalid URLs do not issue a network request", async () => {
	globalThis.fetch = async () => { throw new Error("must not fetch"); };
	const result = await createWebTools().web_fetch!.execute!("invalid-read", { url: "not a URL" });
	assert.match(String(result.details), /invalid URL/);
});

test("URL fetching still hands PDFs to the document reader", async () => {
	globalThis.fetch = async () => new Response("fixture PDF", { headers: { "content-type": "application/pdf" } });
	const result = await createWebTools().web_fetch!.execute!("pdf-read", { url: "https://example.com/source.pdf" });
	assert.match(String(result.details), /web_fetch_pdf/);
});
