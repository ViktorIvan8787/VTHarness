/*
 * Preload (2026-09-17, narrow-window wave): the ONLY bridge between the
 * sandboxed renderer and the main process. contextIsolation + sandbox are
 * on (electron/main.cjs), so this file is the renderer's entire access to
 * Electron — keep it a minimal, explicit API surface.
 *
 *   window.vt.platform — read-only OS identity for native window-control
 *   gutters (darwin: left traffic lights; win32/linux: right overlay).
 *
 *   window.vt.expandWindow() — widen the window to the sidebar auto-close
 *   threshold (928px) when the sidebar is opened below it. The main
 *   process clamps: no-op if the window is already wide enough.
 *
 *   window.vt.onZoom(cb) / window.vt.getZoom() — the zoom truth (owner
 *   round 7, 2026-10-05): every ⌘±/⌘0 change arrives as "vt:zoom" with
 *   the new factor; getZoom covers the first-paint race. The renderer
 *   publishes it as --vt-zoom so physical-constant lengths (the traffic-
 *   light gutter) can divide by it.
 *
 *   window.vt.onUpdateStatus(cb) / window.vt.installUpdate() — the
 *   auto-update channel (Wave C, 2026-10-10): "vt:update-status" pushes
 *   {status, version, revision} on updater events; installUpdate asks main
 *   to kill the server and quit-and-install. getUpdateState retrieves the
 *   snapshot for a late subscriber; checkForUpdates requests a manual
 *   check (including download/install-on-quit, even with automatic checks OFF).
 *
 *   window.vt.onOpenSettings(cb) — menu navigation, buffered until React
 *   subscribes after a window is reopened. Browser builds have no bridge.
 *
 * Channel names are mirrored in electron/main.cjs — keep them in sync.
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

let openSettingsListener = null;
let pendingOpenSettings = null;
ipcRenderer.on("vt:open-settings", (_event, section) => {
	if (openSettingsListener) openSettingsListener(section);
	else pendingOpenSettings = section;
});

contextBridge.exposeInMainWorld("vt", {
	platform: process.platform,
	// Resolve only a renderer-supplied, OS-backed File. No filesystem API,
	// uploads, copies, or DOM File IPC to main; sandbox/isolation stay on.
	getPathForFile: (file) => webUtils.getPathForFile(file),
	chooseAttachmentFolder: () => ipcRenderer.invoke("vt:attachment:pick", "folder"),
	...(process.argv?.includes("--vt-web-subscriptions") ? {
		subscriptionTransport: "web",
		openSubscriptionBrowser: (action) => ipcRenderer.invoke("vt:subscriptions:web-browser", action),
	} : {}),
	chatgpt: {
		status: () => ipcRenderer.invoke("vt:chatgpt:control", { op: "status" }),
		login: (id) => ipcRenderer.invoke("vt:chatgpt:control", { op: "login", id }),
		cancel: () => ipcRenderer.invoke("vt:chatgpt:control", { op: "cancel" }),
		select: (id) => ipcRenderer.invoke("vt:chatgpt:control", { op: "select", id }),
		disconnect: (id) => ipcRenderer.invoke("vt:chatgpt:control", { op: "disconnect", id }),
		logout: (id) => ipcRenderer.invoke("vt:chatgpt:control", { op: "logout", id }),
		consent: (enabled) => ipcRenderer.invoke("vt:chatgpt:control", { op: "consent", enabled }),
		onChange: (cb) => {
			const listener = () => cb();
			ipcRenderer.on("vt:chatgpt:changed", listener);
			return () => ipcRenderer.removeListener("vt:chatgpt:changed", listener);
		},
	},
	subscriptions: {
		status: () => ipcRenderer.invoke("vt:subscriptions:control", { op: "status" }),
		login: (providerId, enabled) => ipcRenderer.invoke("vt:subscriptions:control", { op: "login", providerId, enabled }),
		cancel: (providerId) => ipcRenderer.invoke("vt:subscriptions:control", { op: "cancel", providerId }),
		respond: (providerId, attemptId, promptId, value) => ipcRenderer.invoke("vt:subscriptions:control", { op: "respond", providerId, attemptId, promptId, value }),
		open: (providerId, attemptId, actionId) => ipcRenderer.invoke("vt:subscriptions:control", { op: "open", providerId, attemptId, actionId }),
		retry: (providerId) => ipcRenderer.invoke("vt:subscriptions:control", { op: "retry", providerId }),
		disconnect: (providerId) => ipcRenderer.invoke("vt:subscriptions:control", { op: "disconnect", providerId }),
		consent: (providerId, enabled) => ipcRenderer.invoke("vt:subscriptions:control", { op: "consent", providerId, enabled }),
		onChange: (cb) => {
			const listener = () => cb();
			ipcRenderer.on("vt:subscriptions:changed", listener);
			return () => ipcRenderer.removeListener("vt:subscriptions:changed", listener);
		},
	},
	expandWindow: () => ipcRenderer.send("vt:expand-window"),
	onZoom: (cb) => {
		const listener = (_event, factor) => cb(factor);
		ipcRenderer.on("vt:zoom", listener);
		return () => ipcRenderer.removeListener("vt:zoom", listener);
	},
	getZoom: () => ipcRenderer.invoke("vt:zoom:get"),
	onUpdateStatus: (cb) => {
		const listener = (_event, status) => cb(status);
		ipcRenderer.on("vt:update-status", listener);
		return () => ipcRenderer.removeListener("vt:update-status", listener);
	},
	installUpdate: () => ipcRenderer.send("vt:update-install"),
	getUpdateState: () => ipcRenderer.invoke("vt:update:get"),
	checkForUpdates: () => ipcRenderer.invoke("vt:update:check"),
	onOpenSettings: (cb) => {
		openSettingsListener = cb;
		if (pendingOpenSettings !== null) {
			const section = pendingOpenSettings;
			pendingOpenSettings = null;
			cb(section);
		}
		return () => {
			if (openSettingsListener === cb) openSettingsListener = null;
		};
	},
});
