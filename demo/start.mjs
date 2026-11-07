import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireDemoLock, prepareDemo } from "./runtime.mjs";

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const runtimeDir = path.join(ROOT, "demo", ".runtime");

async function main() {
	const args = process.argv.slice(2);
	let port = 3006;
	let reset = false;
	for (let index = 0; index < args.length; index++) {
		if (args[index] === "--reset") reset = true;
		else if (args[index] === "--port") port = Number(args[++index]);
		else throw new Error(`Unknown demo argument: ${args[index]}. Use --port <number> or --reset.`);
	}
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The port must be an integer from 1 to 65535.");
	// Match ordinary Next development: use the existing .env/provider configuration,
	// without copying credentials into the demo folder or inventing model defaults.
	require("@next/env").loadEnvConfig(ROOT, true);
	const sourceData = path.resolve(process.env.VT_DATA_DIR || path.join(ROOT, "data"));
	const releaseLock = acquireDemoLock(runtimeDir);
	let prepared;
	try { prepared = prepareDemo(runtimeDir, path.join(sourceData, "settings.json"), reset); }
	catch (error) { releaseLock(); throw error; }
	if (reset) {
		releaseLock();
		console.log("Restored 23 sample sessions and the knowledge graph. Demo settings and provider connections were preserved.");
		return;
	}
	console.log(`VT-Harness demo: http://localhost:${port}`);
	console.log("Sample history: 16 lessons, 7 practice sessions, 96 concepts across AI, Maths, Physics, Biology, History, and Medicine. See demo/README.md for the 60-second pitch.");
	console.log(prepared.initialized ? "Demo data prepared. Existing model selections were imported where available." : "Keeping your demo sessions and model selections.");
	console.log("Live AI uses your existing provider configuration. Choose Strong, Cheap, and Vision once in Settings if needed.");
	const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
		cwd: ROOT, stdio: "inherit",
		env: { ...process.env, VT_DATA_DIR: prepared.dataDir, VT_DEMO_MODE: "1" },
	});
	const handlers = new Map(["SIGINT", "SIGTERM"].map(signal => [signal, () => child.kill(signal)]));
	for (const [signal, handler] of handlers) process.on(signal, handler);
	const finish = code => {
		releaseLock();
		for (const [signal, handler] of handlers) process.off(signal, handler);
		process.exitCode = code;
	};
	child.once("error", error => { console.error(error.message); finish(1); });
	child.once("exit", (code, signal) => finish(code ?? (signal === "SIGINT" ? 0 : 1)));
}

main().catch(error => { console.error(`Demo: ${error.message}`); process.exitCode = 1; });
