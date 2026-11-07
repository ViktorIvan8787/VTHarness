import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SEED_DIR = fileURLToPath(new URL("./seed/", import.meta.url));

function readSettings(filename) {
	if (!fs.existsSync(filename)) return {};
	const record = JSON.parse(fs.readFileSync(filename, "utf8"));
	if (!record || typeof record !== "object" || Array.isArray(record) || record.version !== 1) {
		throw new Error(`Expected a version 1 settings record: ${filename}`);
	}
	return record;
}

/** Only the disposable demo data is replaced. Provider credentials stay at their original location. */
export function prepareDemo(runtimeDir, sourceSettingsFile, reset = false) {
	fs.mkdirSync(runtimeDir, { recursive: true });
	const dataDir = path.join(runtimeDir, "data");
	const manifest = path.join(dataDir, "manifest.json");
	if (fs.existsSync(manifest)) {
		const current = JSON.parse(fs.readFileSync(manifest, "utf8"));
		if (current.synthetic !== true) throw new Error("Refusing to replace a folder without the synthetic demo marker.");
		if (!reset) return { dataDir, initialized: false };
	} else if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length > 0) {
		throw new Error(`Refusing to overwrite unrecognised data in ${dataDir}`);
	}
	const previousSettings = path.join(dataDir, "settings.json");
	const selectedSettings = readSettings(fs.existsSync(previousSettings) ? previousSettings : sourceSettingsFile);
	const stagingDir = fs.mkdtempSync(path.join(runtimeDir, "seed-"));
	try {
		fs.cpSync(SEED_DIR, stagingDir, { recursive: true });
		const seedSettings = readSettings(path.join(stagingDir, "settings.json"));
		const settings = { ...seedSettings, ...selectedSettings, graph: { ...selectedSettings.graph, rendering: true } };
		fs.writeFileSync(path.join(stagingDir, "settings.json"), JSON.stringify(settings, null, "\t") + "\n");
		fs.rmSync(dataDir, { recursive: true, force: true });
		fs.renameSync(stagingDir, dataDir);
	} finally {
		fs.rmSync(stagingDir, { recursive: true, force: true });
	}
	return { dataDir, initialized: true };
}

/** Serialises launcher/reset actions and refuses reset while the demo is running. */
export function acquireDemoLock(runtimeDir) {
	fs.mkdirSync(runtimeDir, { recursive: true });
	const lockFile = path.join(runtimeDir, "server.lock");
	if (fs.existsSync(lockFile)) {
		const pid = Number(fs.readFileSync(lockFile, "utf8"));
		if (!Number.isInteger(pid) || pid <= 0) throw new Error("Unrecognised demo lock; check demo/.runtime/server.lock.");
		let running = true;
		try { process.kill(pid, 0); } catch (error) { if (error.code === "ESRCH") running = false; }
		if (running) throw new Error("The demo is already running. Stop it with Ctrl+C before restarting or resetting it.");
		fs.unlinkSync(lockFile);
	}
	fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" });
	return () => {
		if (fs.existsSync(lockFile) && fs.readFileSync(lockFile, "utf8") === String(process.pid)) fs.unlinkSync(lockFile);
	};
}
