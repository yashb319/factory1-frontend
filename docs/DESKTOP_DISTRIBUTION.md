# Factory1 Desktop Distribution

Factory1 desktop is an Electron shell that opens the hosted Factory1 web app at the login screen.

## Why UI/backend changes update automatically

The desktop app loads:

```text
https://factory1-frontend.vercel.app/login
```

That means normal Factory1 UI changes update when the frontend is deployed to Vercel. Backend changes update when the backend is deployed to Render. Users do not need a new installer for ordinary UI or API changes.

Build and release a new desktop installer only when the Electron shell changes, such as app icon, window behavior, startup URL, auto-update logic, or installer configuration.

## Website Download Links

The public home page points to latest GitHub Release assets:

```text
https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-mac-arm64.dmg
https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-win-x64.exe
```

You can override these at Vercel build time:

```text
NEXT_PUBLIC_FACTORY1_MAC_DOWNLOAD_URL=
NEXT_PUBLIC_FACTORY1_WINDOWS_DOWNLOAD_URL=
```

## Release Installers

Create a new GitHub Release by pushing a tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `.github/workflows/desktop-release.yml` workflow builds:

- macOS Apple Silicon DMG/ZIP
- Windows x64 NSIS installer

It also attaches the generated installer files to the GitHub Release.

## Local Commands

```bash
npm run desktop:dev
npm run desktop:pack:mac
npm run desktop:pack:win
```

macOS public distribution will eventually need Apple Developer ID signing and notarization. Windows public distribution should eventually use a code signing certificate.
