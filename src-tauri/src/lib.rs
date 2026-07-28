use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

// ── 数据目录：文件即真相，指针存本机 app-config，不参与同步 ──────────────

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).ok();
    Ok(dir.join("config.json"))
}

/// 未配置时的默认数据目录（沿用旧的选路逻辑，换成放文件的目录）
fn default_data_dir(app: &AppHandle) -> PathBuf {
    if let Ok(dir) = std::env::var("MOTIF_DATA_DIR") {
        return PathBuf::from(dir);
    }
    if cfg!(target_os = "windows") && std::path::Path::new("D:\\").exists() {
        return PathBuf::from("D:/data/Motif");
    }
    app.path()
        .app_data_dir()
        .map(|d| d.join("data"))
        .unwrap_or_else(|_| PathBuf::from("motif-data"))
}

fn ensure_subdirs(dir: &PathBuf) {
    fs::create_dir_all(dir.join("items")).ok();
    fs::create_dir_all(dir.join("tags")).ok();
}

#[tauri::command]
fn get_data_dir(app: AppHandle) -> Result<String, String> {
    let cfg = config_path(&app)?;
    let configured = fs::read_to_string(&cfg).ok().and_then(|text| {
        serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("data_dir").and_then(|x| x.as_str()).map(PathBuf::from))
    });
    let dir = configured.unwrap_or_else(|| default_data_dir(&app));
    ensure_subdirs(&dir);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn set_data_dir(app: AppHandle, path: String) -> Result<(), String> {
    let cfg = config_path(&app)?;
    let json = serde_json::json!({ "data_dir": path });
    fs::write(&cfg, serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    ensure_subdirs(&PathBuf::from(&path));
    Ok(())
}

// ── 记录文件读写（无新 crate，纯 std::fs） ─────────────────────────────

#[derive(serde::Serialize)]
struct Record {
    name: String,
    content: String,
}

/// 读某子目录（items/tags）下所有 .md 的文件名 + 内容
#[tauri::command]
fn list_records(dir: String, sub: String) -> Result<Vec<Record>, String> {
    let path = PathBuf::from(&dir).join(&sub);
    fs::create_dir_all(&path).ok();
    let mut out = Vec::new();
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if !p.is_file() {
            continue;
        }
        if p.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(".tmp-") {
            continue; // 跳过原子写入的临时文件
        }
        if let Ok(content) = fs::read_to_string(&p) {
            out.push(Record { name, content });
        }
    }
    Ok(out)
}

/// 原子写：先写同目录临时文件，再 rename 落盘
#[tauri::command]
fn write_record_atomic(dir: String, sub: String, name: String, content: String) -> Result<(), String> {
    let subdir = PathBuf::from(&dir).join(&sub);
    fs::create_dir_all(&subdir).map_err(|e| e.to_string())?;
    let tmp = subdir.join(format!(".tmp-{}", name));
    let final_path = subdir.join(&name);
    fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &final_path).map_err(|e| e.to_string())?;
    Ok(())
}

/// 把冲突落败文件归档到 conflicts/（同名则追加序号，绝不覆盖）
#[tauri::command]
fn move_to_conflicts(dir: String, sub: String, name: String) -> Result<(), String> {
    let base = PathBuf::from(&dir);
    let from = base.join(&sub).join(&name);
    let conflicts = base.join("conflicts");
    fs::create_dir_all(&conflicts).map_err(|e| e.to_string())?;
    let mut target = conflicts.join(&name);
    if target.exists() {
        let np = std::path::Path::new(&name);
        let stem = np.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = np.extension().and_then(|s| s.to_str()).unwrap_or("md");
        let mut i = 2;
        loop {
            let cand = conflicts.join(format!("{}-{}.{}", stem, i, ext));
            if !cand.exists() {
                target = cand;
                break;
            }
            i += 1;
        }
    }
    fs::rename(&from, &target).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_capture(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("capture") {
        let _ = win.hide();
    }
}

#[derive(serde::Deserialize)]
struct MdFile {
    name: String,
    content: String,
}

#[tauri::command]
fn write_md_files(dir: String, files: Vec<MdFile>) -> Result<usize, String> {
    let base = std::path::PathBuf::from(&dir);
    for file in &files {
        let path = base.join(&file.name);
        std::fs::write(&path, &file.content).map_err(|e| e.to_string())?;
    }
    Ok(files.len())
}

struct TrayItems {
    open_main: MenuItem<tauri::Wry>,
    quick_capture: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
    shortcut_err: Option<MenuItem<tauri::Wry>>,
}

#[tauri::command]
fn set_tray_language(
    state: tauri::State<'_, Mutex<TrayItems>>,
    labels: Vec<(String, String)>,
) -> Result<(), String> {
    let handles = state.lock().map_err(|e| e.to_string())?;
    for (id, text) in &labels {
        match id.as_str() {
            "open_main" => handles.open_main.set_text(text).map_err(|e| e.to_string())?,
            "quick_capture" => handles
                .quick_capture
                .set_text(text)
                .map_err(|e| e.to_string())?,
            "quit" => handles.quit.set_text(text).map_err(|e| e.to_string())?,
            "shortcut_err" => {
                if let Some(ref item) = handles.shortcut_err {
                    item.set_text(text).map_err(|e| e.to_string())?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(win) = app.get_webview_window("capture") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // CmdOrCtrl:Windows 为 Ctrl,macOS 自动为 Cmd
            let shortcut_result = app.global_shortcut().register("CmdOrCtrl+Shift+Space");
            if let Err(ref e) = shortcut_result {
                eprintln!("CmdOrCtrl+Shift+Space 注册失败: {e}");
            }

            let main_win = app.get_webview_window("main").unwrap();
            let mw = main_win.clone();
            main_win.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = mw.hide();
                }
            });

            let cap_win = app.get_webview_window("capture").unwrap();
            let cw = cap_win.clone();
            cap_win.on_window_event(move |event| {
                if let WindowEvent::Focused(false) = event {
                    let _ = cw.hide();
                }
            });

            let open_main =
                MenuItem::with_id(app, "open_main", "打开主窗口", true, None::<&str>)?;
            let quick_capture =
                MenuItem::with_id(app, "quick_capture", "快速捕获", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            // 键名文案按平台显示;JS 侧启动后会用 set_tray_language 覆盖为当前语言文案
            let shortcut_err_text = if cfg!(target_os = "macos") {
                "⚠ Cmd+Shift+Space 快捷键注册失败"
            } else {
                "⚠ Ctrl+Shift+Space 快捷键注册失败"
            };
            let shortcut_err = MenuItem::with_id(
                app,
                "shortcut_err",
                shortcut_err_text,
                false,
                None::<&str>,
            )?;

            let menu = if shortcut_result.is_err() {
                Menu::with_items(app, &[&open_main, &quick_capture, &shortcut_err, &quit])?
            } else {
                Menu::with_items(app, &[&open_main, &quick_capture, &quit])?
            };

            // Store handles for language switching
            app.manage(Mutex::new(TrayItems {
                open_main: open_main.clone(),
                quick_capture: quick_capture.clone(),
                quit: quit.clone(),
                shortcut_err: if shortcut_result.is_err() {
                    Some(shortcut_err)
                } else {
                    None
                },
            }));

            let tray = TrayIconBuilder::new()
                .tooltip("Motif")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open_main" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quick_capture" => {
                        if let Some(w) = app.get_webview_window("capture") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                });

            // macOS:单色模板图标(深浅色菜单栏均清晰);Windows/其他:沿用彩色图标
            #[cfg(target_os = "macos")]
            let tray = tray
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../icons/tray-template.png"
                ))?)
                .icon_as_template(true);
            #[cfg(not(target_os = "macos"))]
            let tray = tray.icon(app.default_window_icon().expect("app icon missing").clone());

            tray.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_capture,
            write_md_files,
            set_tray_language,
            get_data_dir,
            set_data_dir,
            list_records,
            write_record_atomic,
            move_to_conflicts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
