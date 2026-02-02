# GitGet 📦

**The simplest way to download GitHub apps.** No more digging through "Assets" or checking if a `.dmg` works on Windows. GitGet auto-detects your system and serves the right installer instantly.

[**🔴 Live Demo**](https://oathanrex.github.io/gitget/)

<div align="center">
  <img src="assets/og-image.png" alt="GitGet Preview" width="100%">
</div>

## ✨ Features

- **🚀 Instant Downloads** - Finds the correct installer for your OS (Windows, macOS, Linux, Android) automatically.
- **🔍 Universal Search** - Search any repository by name (e.g., `vscode` or `microsoft/vscode`).
- **📚 My Library** - Track your favorite apps and check for updates in one click.
- **🛡️ Secure & Direct** - All downloads come directly from GitHub releases. No third-party hosting.
- **🌙 Dark Mode** - Automatically syncs with your system preference.
- **⚡ SEO Friendly** - Optimized for discoverability with JSON-LD rich snippets.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS (ES Modules), HTML5, CSS3 (Variables).
- **API:** GitHub REST API.
- **Storage:** LocalStorage for library persistence.
- **Zero Dependencies:** No frameworks, no build steps, just pure web capability.

## 🚀 Deployment

GitGet is built to run on **GitHub Pages** (or any static host) out of the box.

1.  **Clone & Personalize:**
    ```bash
    git clone https://github.com/yourusername/gitget.git
    cd gitget
    ```

2.  **Upload to GitHub:**
    Push the code to a new repository named `gitget`.

3.  **Enable Pages:**
    Go to `Settings` -> `Pages` -> Select `main` branch -> `Save`.

Your app will be live at `https://yourusername.github.io/gitget/`!

## 🤝 Contributing

Contributions are welcome! If you find a bug or want to improve the detection logic:
1.  Fork the repo.
2.  Create a branch (`patch-detection-logic`).
3.  Submit a Pull Request.

## ❤️ Support

GitGet is free forever. If it saves you time, consider buying me a coffee:

<a href="https://www.buymeacoffee.com/oathanrex" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217">
</a>

---
*Built with ❤️ by [Oathan Rex](https://github.com/oathanrex)*
