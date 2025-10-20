import React, { useState, useEffect } from "react";
import { IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";

export interface TreeNodeType {
  name: string;
  children?: TreeNodeType[];
}

interface TreeNodeProps {
  node: TreeNodeType;
  selectedNode: string | null;
  onSelect: (name: string) => void;
  setdbpath: (path: string) => void;
  parentPath?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  selectedNode,
  onSelect,
  setdbpath,
  parentPath = "",
}) => {
  const [open, setOpen] = useState(false);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setOpen((prev) => !prev);
      return;
    }
    onSelect(node.name);
    setdbpath(currentPath);
  };

  const isSelected = selectedNode === node.name && !hasChildren;

  return (
    <div className="mt-[2px]">
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 cursor-pointer select-none rounded px-1 py-[2px] ${
          isSelected
            ? "bg-blue-600 text-white"
            : hasChildren
            ? "text-gray-300 hover:text-white"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {hasChildren ? (
          open ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )
        ) : (
          <span className="w-[14px]" />
        )}
        <span>{node.name}</span>
      </div>

      {open && hasChildren && (
        <div className="ml-3 border-l border-gray-700 pl-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              selectedNode={selectedNode}
              onSelect={onSelect}
              setdbpath={setdbpath}
              parentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DesignZoneTreeProps {
  setdbpath: (path: string) => void;
  basepath: string; // 👈 add basepath prop
}

export const DesignZoneTree: React.FC<DesignZoneTreeProps> = ({
  setdbpath,
  basepath,
}) => {
  const [treeData, setTreeData] = useState<TreeNodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTree(path: string) {
      if (!path) return;
      try {
        setLoading(true);
        const data = await invoke<TreeNodeType[]>("read_folder_tree", { path });

        if (Array.isArray(data) && data.length > 0) {
          const root = data[0];
          setTreeData(root.children || []);
        } else {
          setTreeData([]);
        }
      } catch (error) {
        console.error("Error loading tree:", error);
        setTreeData([]);
      } finally {
        setLoading(false);
      }
    }

    // 👇 reload when basepath changes
    const normalizedPath = basepath.replace(/\\/g, "/").replace(/\/+$/, "");
    const finalPath = /database\/?$/.test(normalizedPath.toLowerCase())
      ? normalizedPath
      : `${normalizedPath}/database`;

    loadTree(finalPath);
  }, [basepath]); // 👈 triggers reload when basepath changes

  return (
    <div className="bg-[#0f1116] text-gray-200 p-4 rounded-lg text-sm font-mono w-full h-screen flex flex-col">
      <div className="overflow-y-auto flex-1 pr-1">
        {loading && <div className="text-gray-400">Loading tree...</div>}
        {!loading &&
          treeData.map((node) => (
            <TreeNode
              key={node.name}
              node={node}
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
              setdbpath={setdbpath}
            />
          ))}
      </div>

      {selectedNode && (
        <div className="text-xs text-gray-400 border-t border-gray-800 pt-2 mt-2">
          Selected file: <span className="text-blue-400">{selectedNode}</span>
        </div>
      )}
    </div>
  );
};

export default DesignZoneTree;
