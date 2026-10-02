# Motif

**简体中文** | [English](README.en.md)

> 想法冒出来,一个快捷键记下;下次回看,几秒就能找到。

Motif 是一个轻便的文字收纳盒,只做两件事:**快速记下来**,**回头快速找到**。

## 💡 为什么做它

用 Notion 或手机备忘录记一个突然冒出来的想法,麻烦往往不在写,而在写之前:打开 App,想它该放哪个分区,翻到那个位置,再新建一页。等这些做完,想法可能已经没了。

反过来,图省事随手丢在一个地方,时间久了就是一大堆,没有标签,想找某一条只能从头翻。

Motif 把这两头都简化了:

- **记的时候什么都不用想**:按快捷键弹出一个输入框,写完保存,窗口消失。不用选位置,也不用填任何别的东西。
- **找的时候不乱**:有空再给想法打上自己的标签、标个优先级;之后点标签或搜关键词就能找到。

它不打算替代 Notion 或备忘录,长文档、项目资料还是放在那里。Motif 只负责接住那些来不及整理的零碎想法。

## ✏️ 怎么用

1. **记**:任何时候按 `Ctrl/Cmd + Shift + Space`(可在设置里改),输入,`Ctrl/Cmd + Enter` 保存。写一半切走也没关系,草稿会保留。
   - 以 `w ` 开头(如 `w discipline`)记为**单词**,不进收件箱,单独放在侧栏「单词」里;记错了可以在条目上点「→ 单词 / → 普通条目」切换。
2. **理**:新想法先进「收件箱」。有空时打开主窗口,给它们打上标签,需要的话标个优先级。
3. **找**:点侧栏的标签筛选,或直接搜索内容。概览页会把重要的和很久没动过的事项放在最前面。

另外:数据是本地的 Markdown 文件,不联网、没有账号;支持深浅色主题、中英文界面,Windows 和 macOS 都能用。

## 🗃️ 数据与同步:文件即真相

Motif **不用数据库**。每条想法就是一个人类可读的 Markdown 文件(带极简 frontmatter),存在你指定的「数据目录」里:

```
<数据目录>/
  items/<uuid>.md      # 一条想法一个文件,正文即 Markdown
  tags/<uuid>.md       # 一个标签一个文件
  conflicts/           # 同步冲突中落败的文件(自动生成)
```

同步交给你**已有的同步工具**(iCloud Drive / OneDrive / Dropbox / Syncthing / git……),把数据目录放进任意一个被同步的文件夹即可。Motif 自己没有服务器、没有账号、不联网。

- **启动或窗口获得焦点时**重新读取目录,拾取其他设备的改动。
- **冲突处理**:同一条想法两边都改了,保留 `updated_at` 较新的一份,另一份移到 `conflicts/`,不会丢。
- 所有 `.md` 文件都能用普通文本编辑器打开,手动修改后 Motif 能正确读取。

### 🤖 给 agent 读

数据目录就是纯文本,可以让 AI agent(只读)直接看你的待办和单词。下面这段可以直接贴给 agent,路径换成它那边的:

> 我的 Motif 数据在 `<数据目录>/items/`,每条一个 `.md`:开头 `---` 之间是 frontmatter,后面是正文(我的原话)。
>
> - **先跳过 `deleted_at` 不是 `null` 的**:那是已删除的记录,文件保留只为同步。
> - **`kind: word`** = 单词,正文第一行通常是词,后面可能跟中文说明。不属于待办。没有 `kind` 字段的都是普通条目。
> - 普通条目按 `status` 分:
>   - `todo`:我确认过的待办;
>   - `inbox`:还没整理的随手记,里面混着待办、想法、方案草稿、贴进来的消息,**请按正文判断是不是待办**;设了 `priority` 的基本都是待办;
>   - `done`:做完了,`updated_at` 可以近似当作完成时间(之后编辑过也会刷新);
>   - `archived`:不再关心,忽略。
> - `priority`:1 最高,`null` = 没设。
> - `tags` 是 `tags/` 目录里的标签 id;要看名字去 `tags/<id>.md` 的 `name`。
> - 同一个 `id` 偶尔会出现两份(同步冲突副本),取 `updated_at` 新的那份。
> - **只读,不要改这些文件。**

## 🚀 安装

到 [Releases](../../releases) 下载对应平台的安装包:

- **Windows**:`Motif_x.y.z_x64-setup.exe`
- **macOS**(Intel / Apple 芯片通用):`Motif_x.y.z_universal.dmg`

安装包没有做代码签名,首次打开可能被系统拦截:

- **Windows**:SmartScreen 提示时点「更多信息」→「仍要运行」。
- **macOS**:先双击打开一次(会被拦截),再到「系统设置 → 隐私与安全性」,在底部点「仍要打开」。若提示「已损坏,无法打开」,在终端执行 `xattr -cr /Applications/Motif.app` 后再打开。

升级时直接覆盖安装,数据不受影响。

## 🛠️ 从源码构建

依赖:[Node.js](https://nodejs.org/) 20+、[Rust](https://www.rust-lang.org/) 稳定版,以及 [Tauri 2 的系统依赖](https://tauri.app/start/prerequisites/)。

```bash
npm install          # 安装前端依赖
npm run tauri dev    # 开发模式(热重载)
npm run tauri build  # 打包当前平台安装包
```

产物在 `src-tauri/target/release/bundle/` 下。

## 🧱 技术栈

| 层 | 选型 |
|---|---|
| 桌面框架 | Tauri 2 |
| 前端 | Vite + React 19 + TypeScript |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 存储 | 本地 Markdown 文件(无数据库) |

## 📄 许可证

[MIT](LICENSE) © 2026 Maxwell
