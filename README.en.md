# Motif

[简体中文](README.md) | **English**

> When a thought pops up, one hotkey saves it. When you look back, you find it in seconds.

Motif is a lightweight place to drop text. It does two things: **capture fast**, and **find it again fast**.

## 💡 Why

When you jot down a sudden idea in Notion or a phone notes app, the hard part usually isn't the writing — it's everything before it: open the app, decide which section it belongs in, navigate there, create a new page. By then the thought may be gone.

The opposite habit — dumping everything in one place — turns into a pile over time. No tags, so finding one note means scrolling from the top.

Motif simplifies both ends:

- **Nothing to decide when you capture**: a hotkey opens a single text box; type, save, and it disappears. No location to pick, nothing else to fill in.
- **No mess when you look for it**: when you have a moment, add your own tags and maybe a priority. Later, click a tag or search a keyword to find it.

It isn't meant to replace Notion or your notes app — long documents and project material still belong there. Motif just catches the scattered thoughts you don't have time to file.

## ✏️ How it works

1. **Capture**: anytime, press `Ctrl/Cmd + Shift + Space` (changeable in Settings), type, and hit `Ctrl/Cmd + Enter`. Switch away mid-sentence and your draft is kept.
2. **Sort**: new thoughts land in the Inbox. When you have time, open the main window and give them tags, plus a priority if needed.
3. **Find**: click a tag in the sidebar or search by content. The Overview page puts important items and long-untouched ones up front.

Also: your data is plain local Markdown files — no internet, no account. Light and dark themes, Chinese and English UI, on Windows and macOS.

## 🗃️ Data & sync: files are the source of truth

Motif **has no database**. Each thought is a human-readable Markdown file with minimal frontmatter, stored in a data folder you choose:

```
<data folder>/
  items/<uuid>.md      # one file per thought; the body is Markdown
  tags/<uuid>.md       # one file per tag
  conflicts/           # files that lost a sync conflict (created automatically)
```

Sync is handled by **whatever you already use** — iCloud Drive, OneDrive, Dropbox, Syncthing, git… Just put the data folder inside a synced folder. Motif itself has no server, no account, and never goes online.

- **On launch and whenever the window gains focus**, Motif re-reads the folder to pick up changes from other devices.
- **Conflicts**: if the same item was edited on two devices, the copy with the newer `updated_at` wins and the other is moved to `conflicts/` — nothing is lost.
- Every `.md` file can be opened and edited in any text editor, and Motif will load your changes correctly.

## 🚀 Install

Download the installer for your platform from [Releases](../../releases):

- **Windows**: `Motif_x.y.z_x64-setup.exe`
- **macOS** (Intel and Apple silicon): `Motif_x.y.z_universal.dmg`

The installers are not code-signed, so your system may block the first launch:

- **Windows**: when SmartScreen appears, click "More info" → "Run anyway".
- **macOS**: double-click Motif once (it will be blocked), then go to System Settings → Privacy & Security and click "Open Anyway" at the bottom. If macOS says the app "is damaged and can't be opened", run `xattr -cr /Applications/Motif.app` in Terminal and try again.

To upgrade, just install over the existing version — your data is untouched.

## 🛠️ Build from source

Requirements: [Node.js](https://nodejs.org/) 20+, stable [Rust](https://www.rust-lang.org/), and the [Tauri 2 system prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install          # install frontend dependencies
npm run tauri dev    # dev mode with hot reload
npm run tauri build  # build an installer for the current platform
```

Output goes to `src-tauri/target/release/bundle/`.

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Desktop framework | Tauri 2 |
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Storage | Local Markdown files (no database) |

## 📄 License

[MIT](LICENSE) © 2026 Maxwell
