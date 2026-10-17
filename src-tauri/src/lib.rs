use serde::Serialize;

#[derive(Serialize)]
struct AppMetadata {
    version: &'static str,
}

#[tauri::command]
fn app_metadata() -> AppMetadata {
    AppMetadata {
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_metadata])
        .run(tauri::generate_context!())
        .expect("failed to run application");
}