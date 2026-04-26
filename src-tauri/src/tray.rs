use log::info;
use tauri::{
  AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
  SystemTrayMenuItem,
};
use tauri::api::shell::open;

use crate::APP;
use crate::config::get;
use crate::window::{config_window, get_main_window, update_window};

pub fn init_tray() -> SystemTray {
    // Tray 菜单
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("toggle".to_string(), "显示/隐藏").accelerator("Ctrl+F1"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("option".to_string(), "首选项..."))
        .add_item(CustomMenuItem::new("help".to_string(), "帮助"))
        .add_item(CustomMenuItem::new("update".to_string(), "检查更新..."))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("relaunch".to_string(), "重启"))
        .add_item(CustomMenuItem::new("quit".to_string(), "退出"));
    SystemTray::new().with_menu(tray_menu)
}

pub fn init_tray_tooltip(cheatsheet_shortcut: &str, active_window_shortcut: &str) {
    let cheatsheet = if cheatsheet_shortcut.is_empty() {
        match get("cheatSheetShortCut") {
            Some(v) => v.as_str().unwrap().to_string(),
            None => "".to_string(),
        }
    } else {
        cheatsheet_shortcut.to_string()
    };
    let active_window = if active_window_shortcut.is_empty() {
        match get("activeWindowShortCut") {
            Some(v) => v.as_str().unwrap().to_string(),
            None => "".to_string(),
        }
    } else {
        active_window_shortcut.to_string()
    };
    let app_handle = APP.get().unwrap();
    app_handle
        .tray_handle()
        .set_tooltip(
            format!(
                "CheatSheetNew\n显示快捷键: {cheatsheet}\n当前应用快捷键: {active_window}"
            )
            .as_str(),
        )
        .unwrap();
}

pub fn tray_handler<'a>(app: &'a AppHandle, event: SystemTrayEvent) {
    match event {
        // 暂时保留
        SystemTrayEvent::LeftClick { .. } => on_left_click(),
        SystemTrayEvent::RightClick { .. } => on_right_click(),
        // 根据菜单 id 进行事件匹配
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "toggle" => on_toggle(),
            "option" => on_config(),
            "help" => on_help(app),
            "update" => on_update(),
            "relaunch" => on_relaunch(app),
            "quit" => on_quit(app),
            _ => (),
        },
        _ => {}
    }
}

static mut LEFT_CLICK_TYPE: &str = "null";
pub fn init_tray_click() {
    let kind = match get("trayLeftClick") {
        Some(v) => v.as_str().unwrap().to_string(),
        None => "".to_string(),
    };
    unsafe {
        LEFT_CLICK_TYPE = Box::leak(kind.into_boxed_str());
    }
}

fn on_left_click() {
    info!("🎉🎉🎉 tray: left click");
    unsafe {
        match LEFT_CLICK_TYPE {
            "cheatsheetnew" => {
                get_main_window().show().unwrap();
            }
            "config" => {
                config_window();
            }
            _ => (),
        }
    }
}

#[tauri::command]
pub fn left_click_type(lc_type: String) {
    unsafe {
        LEFT_CLICK_TYPE = Box::leak(lc_type.into_boxed_str());
    }
}

fn on_right_click() {
    info!("🎉🎉🎉 tray: right click");
}

fn on_toggle() {
    let main_window = get_main_window();
    if main_window.is_visible().unwrap() {
      main_window.hide().unwrap();
    } else {
      main_window.show().unwrap();
      main_window.set_focus().unwrap();
    }
}

fn on_config() {
    config_window();
}

fn on_help(app: &AppHandle) {
    open(
        &app.app_handle().shell_scope(),
        "https://github.com/Nerders/CheatSheetNew/issues",
        None,
    )
    .unwrap();
}

fn on_relaunch(app: &AppHandle) {
    app.restart();
}

fn on_update() {
    update_window();
}

fn on_quit(app: &AppHandle) {
    app.exit(0);
}