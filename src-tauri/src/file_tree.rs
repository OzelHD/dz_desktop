use std::fs;
use std::path::Path;
use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct TreeNode {
    pub name: String,
    pub children: Option<Vec<TreeNode>>,
}

/// Recursively read a folder and return its structure as a tree.
#[command]
pub fn read_folder_tree(path: String) -> Result<Vec<TreeNode>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let root_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("root")
        .to_string();

    let root_node = if path.is_dir() {
        let mut children = Vec::new();
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let child_path = entry.path();
            children.push(read_folder_node(&child_path)?);
        }
        TreeNode {
            name: root_name,
            children: Some(children),
        }
    } else {
        TreeNode {
            name: root_name,
            children: None,
        }
    };

    Ok(vec![root_node]) // return as an array like treeData = [ ... ]
}

fn read_folder_node(path: &Path) -> Result<TreeNode, String> {
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    if path.is_dir() {
        let mut children = Vec::new();
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let child_path = entry.path();
            children.push(read_folder_node(&child_path)?);
        }

        Ok(TreeNode {
            name,
            children: Some(children),
        })
    } else {
        Ok(TreeNode {
            name,
            children: None,
        })
    }
}
