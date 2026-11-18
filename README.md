# GitGet ⚡ The Universal Open-Source Binary Finder & App Hub

[![Live App](https://img.shields.io/badge/Live_App-oathanrex.github.io%2Fgitget-2ea44f?style=for-the-badge&logo=github)](https://oathanrex.github.io/gitget/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Zero Tracking](https://img.shields.io/badge/Privacy-100%25_Client--Side-green?style=for-the-badge)](https://oathanrex.github.io/gitget/)

> **The definitive way to download GitHub releases.** No more digging through release asset tables or guessing which `.dmg`, `.AppImage`, or `.apk` matches your hardware. GitGet auto-detects your operating system and CPU architecture, verifies SHA-256 integrity in your browser, and serves direct upstream downloads instantly.

---

## ⚡ Game-Changing Features

- 🎯 **1-Click Smart Matching** — Automatically scores and selects the highest-scoring installer for your specific OS and CPU (`Windows x64/ARM64`, `macOS Apple Silicon/Intel`, `Linux AppImage/deb`, `Android arm64-v8a/universal`).
- ⌘ **Raycast-Style Command Palette (`Cmd+K` / `/`)** — Keyboard-first navigation. Jump between apps, toggle platforms, and switch themes instantly without touching a mouse.
- 🛡️ **In-Browser WebCrypto SHA-256 Verifier** — Verify file integrity locally in milliseconds using hardware-accelerated `crypto.subtle.digest('SHA-256')` against GitHub's upstream `.sha256sums`. Zero files uploaded.
- 📦 **Universal Package Manager One-Liners** — Instant 1-click terminal commands for `winget`, `brew`, `flatpak`, `scoop`, and `adb install`.
- 📱 **"Send to Phone" QR Code Sideloading** — Browse Android APKs on PC, scan the generated QR code with your phone camera, and download directly to mobile without USB cables.
- 🔄 **In-Page Multi-Platform Switcher** — Switch between Windows, macOS, Linux, and Android builds with live availability indicators without leaving the release page.
- 📚 **Personal Software Library ("Release Radar")** — Track your favorite open-source software and monitor updates in one click.

---

## 🔗 Add GitGet Download Badge to Your Repo's README

Are you an open-source maintainer? Help your users get the right binary instantly by adding the GitGet badge to your `README.md`:

```markdown
[![Download on GitGet](https://img.shields.io/badge/Download_on-GitGet-2ea44f?style=flat&logo=github)](https://oathanrex.github.io/gitget/#/r/OWNER/REPO)
```

*(Replace `OWNER/REPO` with your repository path, e.g. `neovim/neovim`)*.

---

## 🌐 Popular Apps Hub & SEO Pages

- [Termux APK Latest Release](https://oathanrex.github.io/gitget/apps/termux.html)
- [Obsidian Latest Release](https://oathanrex.github.io/gitget/apps/obsidian.html)
- [Neovim Latest Release](https://oathanrex.github.io/gitget/apps/neovim.html)
- [VSCodium Latest Release](https://oathanrex.github.io/gitget/apps/vscodium.html)
- [Godot Engine Latest Release](https://oathanrex.github.io/gitget/apps/godot.html)
- [DBeaver Latest Release](https://oathanrex.github.io/gitget/apps/dbeaver.html)
- [OBS Studio Latest Release](https://oathanrex.github.io/gitget/apps/obs-studio.html)
- [HandBrake Latest Release](https://oathanrex.github.io/gitget/apps/handbrake.html)
- [Bitwarden Latest Release](https://oathanrex.github.io/gitget/apps/bitwarden.html)
- [KeePassXC Latest Release](https://oathanrex.github.io/gitget/apps/keepassxc.html)
- [Notepad++ Latest Release](https://oathanrex.github.io/gitget/apps/notepad-plus-plus.html)

---

## 🛠️ Architecture & Privacy Guarantee

- **100% Client-Side:** GitGet queries GitHub's public API directly from your browser.
- **Zero Third-Party Storage:** We host no binaries; every download URL connects directly to `github.com/<owner>/<repo>/releases`.
- **Zero Telemetry:** No analytics scripts, no tracking pixels, no advertising cookies.
- **PWA Ready:** Fully cached offline via Service Worker.

---

## 🤝 Contributing

Contributions, bug reports, and ABI detection improvements are welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/smart-matcher`).
3. Commit your changes (`git commit -m 'feat: enhance detection logic'`).
4. Push to your branch and open a Pull Request.

---

## ❤️ Support

GitGet is free and open-source forever. If it saves you time, consider supporting development:

<a href="https://www.buymeacoffee.com/oathanrex" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="180">
</a>

---
*Crafted with precision by [Oathan Rex](https://github.com/oathanrex)*
