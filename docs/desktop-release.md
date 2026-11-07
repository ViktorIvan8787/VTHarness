# Desktop builds and releases

VT-Harness uses Electron with a standalone Next.js server. Build on each target OS: Next traces native binaries for its build machine, so a macOS standalone tree is not a Windows or Linux payload.

## Platforms

| Platform | Packages | Update payload |
| --- | --- | --- |
| macOS, Apple Silicon | Unsigned DMG + ZIP | ZIP through Squirrel.Mac |
| Windows, x64 | Unsigned per-user NSIS installer | NSIS |
| Linux, x64 | AppImage + `.deb` | AppImage replacement; `.deb` through dpkg/apt |

Package names, icons, application identity, and the GitHub update feed are defined in [`electron-builder.yml`](../electron-builder.yml). The feed points to [this repository’s releases](https://github.com/ViktorIvan8787/GreatUniHack/releases); it requires accessible release assets before updates can work.

Local macOS packaging has signing identity discovery and notarization disabled. No signing account or keychain profile is configured. Configure your own credentials explicitly before producing signed releases.

## Artwork

`build/icon-flat.svg` contains the VT lettering on a dark background. Run `node scripts/make-icons.mjs` after editing it to regenerate Windows, Linux, macOS fallback, and browser icons. The macOS Icon Composer document in `build/icon.icon` uses `build/icon.icon/Assets/vt.svg` for the same lettering. Packaging that document requires macOS 26+ and Xcode 26+; `scripts/after-pack.cjs` restores the full-resolution fallback ICNS.

Linux desktop identity is `vt-harness.desktop`. Desktop data is stored under the separate VT-Harness profile described in [Getting started](getting-started.md#data-privacy-and-usage). Existing profiles are not migrated.

## Build pipeline

Use Node 26 and install from the lockfile:

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run build
node scripts/smoke-provider-runtime.mjs
node scripts/build-server.mjs
node scripts/smoke-server.mjs --electron
```

The provider check inspects the fresh trace before curation. The server builder copies static assets and prompt assets, refuses known data/credential leaks, and removes standalone-root old installers and development Electron. Read each smoke script’s prerequisites before running it.

For local unsigned macOS packaging, `npm run desktop:dist` builds, checks the provider trace, curates, runs the host-Node server smoke, and packages without publishing. Select an appropriate Xcode installation through `DEVELOPER_DIR` if needed.

After building and curating on the target OS, package other platforms with:

```sh
npx electron-builder --win --x64 --publish never
npx electron-builder --linux --x64 --publish never
```

Additional native checks can run under Electron’s Node runtime:

```sh
ELECTRON_RUN_AS_NODE=1 NODE_ENV=test npx electron --import tsx --test tests/pdf-native-render.test.ts tests/pdf-ops.test.ts tests/svg-native-render.test.ts tests/browser-service.test.ts
```

This environment-prefix syntax is for POSIX shells. Automated checks use fixtures and fake providers; they do not establish real account functionality or lesson quality. Test packaged installs, window controls, zoom, model setup, PDF/SVG rendering, and updates on the intended platforms before releasing.

## Release verification

Packaging is configured to target draft GitHub releases in this repository when publishing is explicitly requested. Local packaging does not publish. This checkout does not include GitHub Actions workflows.

[`scripts/verify-release.ts`](../scripts/verify-release.ts) checks a draft against the package version, builder configuration, expected installers, blockmaps, and update-feed metadata. Its command-line usage is documented at the top of the script. Expected artifacts are:

| Artifact | Purpose |
| --- | --- |
| `VT-Harness-<v>-arm64.dmg` + `.blockmap` | macOS installer |
| `VT-Harness-<v>-arm64-mac.zip` + `.blockmap` | macOS updater |
| `VT-Harness-<v>-x64-setup.exe` + `.blockmap` | Windows installer/updater |
| `VT-Harness-<v>-x86_64.AppImage` | Linux AppImage |
| `VT-Harness-<v>-amd64.deb` | Debian package |
| `latest-mac.yml`, `latest.yml`, `latest-linux.yml` | Update feeds |

Review and publish releases explicitly after verifying the artifacts. Verify the public feed and an update from a prior installed version when testing a release.

## In-app updates

Packaged apps check at startup and every 24 hours by default, download automatically, and install on quit or Restart. The app menu’s **Check for Updates** command triggers a manual check; downloaded updates show a Restart banner. Dev builds disable the updater. Errors go to `userData/logs/main.log`; `VT_UPDATE_FEED` is a test-only generic-feed override.

Sources: [`electron/main.cjs`](../electron/main.cjs), [`preload.cjs`](../electron/preload.cjs), and [`update-state.ts`](../components/update-state.ts).
