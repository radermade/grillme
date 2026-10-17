#[derive(serde::Serialize)]
struct AppMetadata {
    version: &'static str,
}

const SECURE_SERVICE: &str = "com.grillme.study";
const SECURE_KEYS: [&str; 4] = ["refresh-token", "pkce-verifier", "oauth-state", "lab-connection-ticket"];

fn secure_entry(key: &str) -> Result<keyring::Entry, String> {
    if !SECURE_KEYS.contains(&key) {
        return Err("INVALID_SECURE_KEY".into());
    }
    keyring::Entry::new(SECURE_SERVICE, key).map_err(|_| "SECURE_STORAGE_UNAVAILABLE".into())
}

#[tauri::command]
fn app_metadata() -> AppMetadata {
    AppMetadata { version: env!("CARGO_PKG_VERSION") }
}

#[tauri::command]
fn secure_get(key: String) -> Result<Option<String>, String> {
    match secure_entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("SECURE_STORAGE_UNAVAILABLE".into()),
    }
}

#[tauri::command]
fn secure_set(key: String, value: String) -> Result<(), String> {
    if value.is_empty() || value.len() > 4096 {
        return Err("INVALID_SECURE_VALUE".into());
    }
    secure_entry(&key)?.set_password(&value).map_err(|_| "SECURE_STORAGE_UNAVAILABLE".into())
}

#[tauri::command]
fn secure_remove(key: String) -> Result<(), String> {
    match secure_entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("SECURE_STORAGE_UNAVAILABLE".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_metadata, secure_get, secure_set, secure_remove])
        .run(tauri::generate_context!())
        .expect("failed to run application");
}
