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
   - Start with `w ` (e.g. `w discipline`) to save a **word**: it skips the Inbox and goes to Words in the sidebar. Filed it wrong? Click "→ Word / → Note" on the item to switch.
2. **Sort**: new thoughts land in the Inbox. When you have time, open the main window and give them tags, plus a priority if needed.
3. **Find**: click a tag in the sidebar or search by content. The Overview page puts important items and long-untouched ones up front.

Also: your data is plain local Markdown files — no internet, no account. Light and dark themes, Chinese and English UI, on Windows and macOS.

## 🗃️ Data & sync: files are the source of truth

Motif **has no database**. Each thought is a human-readable Markdown file with minimal frontmatter, stored in a data folder you choose:

```
<data folder>/
  items/<uuid>.md      # in progress (inbox / todo), one file each; the body is Markdown
  items/words/         # vocabulary words
  items/archive/       # done / archived
  items/trash/         # deleted (soft-delete records; safe to empty once all devices have synced)
  tags/<uuid>.md       # one file per tag
  conflicts/           # files that lost a sync conflict (created automatically)
```

Sync is handled by **whatever you already use** — iCloud Drive, OneDrive, Dropbox, Syncthing, git… Just put the data folder inside a synced folder. Motif itself has no server, no account, and never goes online.

- **On launch and whenever the window gains focus**, Motif re-reads the folder to pick up changes from other devices.
- **Conflicts**: if the same item was edited on two devices, the copy with the newer `updated_at` wins and the other is moved to `conflicts/` — nothing is lost.
- Every `.md` file can be opened and edited in any text editor, and Motif will load your changes correctly.
- Which subfolder a file lives in follows from its fields (deleted → `trash/`, word → `words/`, done/archived → `archive/`); Motif moves it when you complete or delete something, and re-files anything misplaced on next launch.

### 🤖 Reading it from an agent

The data folder is plain text, so an AI agent can read (read-only) your todos and words directly. Paste this to the agent, with its own path:

> My Motif data is in `<data folder>/items/`, one `.md` per entry: frontmatter between the leading `---` lines, then the body (my own words). Files are sorted into folders by state automatically:
>
> - **`items/*.md` (top level only) = in progress**:
>   - `status: todo`: a todo I've confirmed;
>   - `status: inbox`: unsorted captures — a mix of todos, ideas, drafts and pasted messages; **judge from the body whether it's a todo**; ones with a `priority` are almost always todos.
> - **`items/words/` = vocabulary words**: the first line of the body is usually the word, possibly followed by a note.
> - **`items/archive/` = finished** (`status: done`) or no longer relevant (`status: archived`); `updated_at` roughly approximates when (later edits also bump it).
> - **`items/trash/` = deleted, ignore.**
> - `priority`: 1 is highest, `null` = unset. `tags` are tag ids; the name is in `<data folder>/tags/<id>.md` under `name`.
> - The fields win over the folder: occasionally a file hasn't been moved yet (Motif files it on next launch), or the same `id` appears twice (a sync conflict copy — use the newer `updated_at`).
> - **Read only — never modify or move these files.**

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
