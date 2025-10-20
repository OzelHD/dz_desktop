import React, { useEffect, useState } from "react";
import { Modal, TextInput, Stack, Group, Button, Loader, Text } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
  onPathChange?: (path: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  opened,
  onClose,
  onPathChange,
}) => {
  const [dzPartsPath, setDzPartsPath] = useState<string>("");
  const [mouserApiKey, setMouserApiKey] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Load all settings when modal opens
  useEffect(() => {
    if (!opened) return;

    (async () => {
      try {
        const [dzPath, apiKey] = await Promise.all([
          invoke<string | null>("get_setting", { key: "dz_parts_path" }),
          invoke<string | null>("get_setting", { key: "mouser_api_key" }),
        ]);

        if (dzPath) setDzPartsPath(dzPath);
        if (apiKey) setMouserApiKey(apiKey);
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [opened]);

  // Auto-save DZ Parts path
  useEffect(() => {
    if (loading) return;
    onPathChange?.(dzPartsPath);

    const timeout = setTimeout(() => {
      invoke("set_setting", { key: "dz_parts_path", value: dzPartsPath }).catch((err) =>
        console.error("Failed to save dz_parts_path:", err)
      );
    }, 400);
    return () => clearTimeout(timeout);
  }, [dzPartsPath, loading]);

  // Auto-save Mouser API key
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      invoke("set_setting", { key: "mouser_api_key", value: mouserApiKey }).catch((err) =>
        console.error("Failed to save mouser_api_key:", err)
      );
    }, 400);
    return () => clearTimeout(timeout);
  }, [mouserApiKey, loading]);

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" centered>
      {loading ? (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      ) : (
        <Stack>
          {/* DZ Parts Path */}
          <Text size="sm" fw={500}>
            DZ Parts Path
          </Text>
          <TextInput
            placeholder="Enter local or network path (e.g. C:\\Users\\georg\\Documents\\dz_parts)"
            value={dzPartsPath}
            onChange={(e) => setDzPartsPath(e.currentTarget.value)}
          />

          {/* Mouser API Key */}
          <Text size="sm" fw={500} mt="md">
            Mouser API Key
          </Text>
          <TextInput
            placeholder="Enter your Mouser API key"
            type="password"
            value={mouserApiKey}
            onChange={(e) => setMouserApiKey(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
};
