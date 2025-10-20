// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod download_pdf;
mod file_tree;
mod mouser_filler;
mod read_csv;
mod settings;
mod write_csv;
use download_pdf::download_pdf;
use file_tree::read_folder_tree;
use mouser_filler::query_mouser_part;
use read_csv::read_csv_file;
use settings::{get_all_settings, get_setting, remove_setting, set_setting};

use write_csv::append_to_csv;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_all_settings,
            get_setting,
            set_setting,
            remove_setting,
            read_folder_tree,
            read_csv_file,
            append_to_csv,
            download_pdf,
            query_mouser_part
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
