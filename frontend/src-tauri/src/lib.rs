
use tauri::Manager;
use std::sync::Mutex;
use serde::Serialize;

#[derive(Default)]
struct Ports {
    node_port: Mutex<Option<u16>>,
    python_port: Mutex<Option<u16>>,
}

#[derive(Serialize)]
struct SystemStatus {
    node_running: bool,
    python_running: bool,
}

#[tauri::command]
fn get_backend_ports(state: tauri::State<Ports>) -> Result<(Option<u16>, Option<u16>), String> {
    let node_port = *state.node_port.lock().unwrap();
    let python_port = *state.python_port.lock().unwrap();
    Ok((node_port, python_port))
}

#[tauri::command]
fn check_system_status(state: tauri::State<Ports>) -> Result<SystemStatus, String> {
    let node_port = *state.node_port.lock().unwrap();
    let python_port = *state.python_port.lock().unwrap();
    Ok(SystemStatus {
        node_running: node_port.is_some(),
        python_running: python_port.is_some(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(Ports::default())
    .invoke_handler(tauri::generate_handler![get_backend_ports, check_system_status])
    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
      }


      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
          use tauri_plugin_shell::ShellExt;
          use tauri_plugin_shell::process::CommandEvent;
          loop {
              if let Ok((mut rx, _child)) = match app_handle.shell().sidecar("server") {
                  Ok(s) => s.env("PORT", "0").spawn(),
                  Err(_) => Err(tauri_plugin_shell::Error::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "Sidecar missing")))
              } {
                  while let Some(event) = rx.recv().await {
                      if let CommandEvent::Stdout(line_bytes) = event {
                          if let Ok(line) = String::from_utf8(line_bytes) {
                              let l = line.trim();
                              if l.contains("Terminal Server running on port") {
                                  let parts: Vec<&str> = l.split_whitespace().collect();
                                  if let Some(port_str) = parts.last() {
                                      if let Ok(port) = port_str.parse::<u16>() {
                                          let state: tauri::State<Ports> = app_handle.state();
                                          *state.node_port.lock().unwrap() = Some(port);
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
              let state: tauri::State<Ports> = app_handle.state();
              *state.node_port.lock().unwrap() = None;
              tokio::time::sleep(std::time::Duration::from_secs(3)).await;
          }
      });

      let app_handle_py = app.handle().clone();
      tauri::async_runtime::spawn(async move {
          use tauri_plugin_shell::ShellExt;
          use tauri_plugin_shell::process::CommandEvent;
          loop {
              if let Ok((mut rx, _child)) = match app_handle_py.shell().sidecar("python-ai") {
                  Ok(s) => s.env("PORT", "0").spawn(),
                  Err(_) => Err(tauri_plugin_shell::Error::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "Sidecar missing")))
              } {
                  while let Some(event) = rx.recv().await {
                      if let CommandEvent::Stdout(line_bytes) = event {
                          if let Ok(line) = String::from_utf8(line_bytes) {
                              let l = line.trim();
                              if l.contains("Running on port") || l.contains("Running on http://") {
                                  let parts: Vec<&str> = l.split_whitespace().collect();
                                  for part in parts {
                                      if part.starts_with("http://") {
                                          if let Some(colon_idx) = part.rfind(':') {
                                              let port_part = &part[colon_idx + 1..];
                                              let clean_port = port_part.replace('/', "");
                                              if let Ok(port) = clean_port.parse::<u16>() {
                                                  let state: tauri::State<Ports> = app_handle_py.state();
                                                  *state.python_port.lock().unwrap() = Some(port);
                                              }
                                          }
                                      } else if let Ok(port) = part.parse::<u16>() {
                                          let state: tauri::State<Ports> = app_handle_py.state();
                                          *state.python_port.lock().unwrap() = Some(port);
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
              let state: tauri::State<Ports> = app_handle_py.state();
              *state.python_port.lock().unwrap() = None;
              tokio::time::sleep(std::time::Duration::from_secs(3)).await;
          }
      });


      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
