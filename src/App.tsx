import { AppShell, Button, Group, Loader } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

import PartTable from "./components/PartTable";
import DesignZoneTree from "./components/FileTree";
import { SettingsModal } from "./components/SettingsModal";
import "./App.css";
import { AddPartModal } from "./components/AddPartModal";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((s) => normalizePath(s).replace(/^\/+|\/+$/g, "")) // trim slashes
    .join("/");
}

function App() {
  const [opened, { toggle }] = useDisclosure();
  const [dbpath, setDbpath] = useState<string>("");
  const [basepath, setBasepath] = useState<string>("");
  const [settingsOpened, setSettingsOpened] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [fullPathState, setFullPathState] = useState<string>("");
  const [addPartOpen, setAddPartOpen] = useState(false);

  // ✅ Load saved path from Tauri settings
  useEffect(() => {
    (async () => {
      try {
        const savedPath = await invoke<string | null>("get_setting", {
          key: "dz_parts_path",
        });
        if (savedPath) setBasepath(normalizePath(savedPath));
      } catch (err) {
        console.error("Failed to load dz_parts_path:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  // has to be useMemo to avoid infinite loop
  const fullPath = useMemo(() => {
    if (!basepath) return "";
    // Example: base=/home/user/dz_parts, dbpath=connectors
    return joinPath(basepath, "database", dbpath);
  }, [basepath, dbpath]);

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        <Group justify="space-between" align="center" px="md" h="100%">
          <p className="text-lg font-bold">Logo</p>

          <Button
            variant="subtle"
            aria-label="settings"
            onClick={() => setSettingsOpened(true)}
            styles={{
              root: {
                width: 40,
                height: 40,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              },
            }}
          >
            <IconSettings size={20} />
          </Button>
        </Group>

        {/* SETTINGS MODAL */}
        <SettingsModal
          opened={settingsOpened}
          onClose={() => setSettingsOpened(false)}
          onPathChange={(newPath) => setBasepath(normalizePath(newPath))}
        />

        <AddPartModal
  opened={addPartOpen}
  onClose={() => setAddPartOpen(false)}
  csvPath={fullPath}  
  onAdded={() => {}} // function to refresh after adding
/>
      </AppShell.Header>

      {/* NAVBAR */}
      <AppShell.Navbar>
        <DesignZoneTree
          basepath={basepath}
          setdbpath={(path) => {setDbpath(normalizePath(path)), setFullPathState(joinPath(basepath, "database", normalizePath(path)))}}
        />
      </AppShell.Navbar>

      {/* MAIN CONTENT */}
      <AppShell.Main>
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <>
            <div className="mb-4"></div>

            <div className="flex justify-end items-center mb-4 mr-3 gap-2">
              <Button variant="light">Update</Button>
              <Button onClick={() => setAddPartOpen(true)}>Add part</Button>
            </div>    

            {fullPathState && <PartTable path={fullPathState} />}
          </>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
