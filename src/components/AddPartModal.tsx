import React, { useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  Stack,
  Group,
  Button,
  Loader,
  Text,
  Textarea,
  Grid,
  ScrollArea,
  Progress,
  Tooltip,
} from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { PDFDocument } from "pdf-lib"; // ✅ added for repair

interface AddPartModalProps {
  opened: boolean;
  onClose: () => void;
  csvPath: string;
  onAdded?: () => void;
}

// ✅ Helper to repair malformed PDFs (e.g. Mouser.com)
async function repairPdf(base64DataUrl: string): Promise<string> {
  try {
    const base64 = base64DataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const newPdf = await pdfDoc.save();
    const repairedBase64 = btoa(String.fromCharCode(...newPdf));
    return `data:application/pdf;base64,${repairedBase64}`;
  } catch (err) {
    console.warn("⚠️ PDF repair failed, returning original:", err);
    return base64DataUrl;
  }
}

export const AddPartModal: React.FC<AddPartModalProps> = ({
  opened,
  onClose,
  csvPath,
  onAdded,
}) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fetchingMouser, setFetchingMouser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfData, setPdfData] = useState("");

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // ✅ Normalize header strings for matching
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, "").trim();

  // ✅ Reset all state when modal closes
  useEffect(() => {
    if (!opened) {
      setHeaders([]);
      setFormData({});
      setPdfUrl("");
      setPdfData("");
      setError(null);
      setLoading(true);
      setSaving(false);
      setDownloading(false);
      setFetchingMouser(false);
    }
  }, [opened]);

  // ✅ Load CSV headers
  useEffect(() => {
    if (!opened) return;

    async function loadHeaders() {
      try {
        setLoading(true);
        const csvText = await invoke<string>("read_csv_file", { path: csvPath });
        const lines = csvText.trim().split("\n");
        const parsedHeaders = lines[0].split(",").map((h) => h.trim());
        setHeaders(parsedHeaders);
        const empty = Object.fromEntries(parsedHeaders.map((h) => [h, ""]));
        setFormData(empty);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }

    loadHeaders();
  }, [opened, csvPath]);

  // ✅ Properly convert base64 -> blob URL for Viewer and repair Mouser PDFs
  useEffect(() => {
    if (pdfUrl && pdfUrl.startsWith("http")) {
      setDownloading(true);
      invoke<string>("download_pdf", { url: pdfUrl })
        .then(async (dataUri) => {
          if (
            typeof dataUri === "string" &&
            dataUri.startsWith("data:application/pdf;base64,")
          ) {
            const repaired = await repairPdf(dataUri); // 🔧 repair step
            setPdfData(repaired);
          } else {
            console.warn("⚠️ Invalid PDF data received:", dataUri?.slice?.(0, 80));
            setPdfData(dataUri);
          }
        })
        .catch((err) => {
          console.error("Failed to download PDF:", err);
          setPdfData("");
        })
        .finally(() => setDownloading(false));
    } else {
      setPdfData("");
    }
  }, [pdfUrl]);

  // ✅ Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pdfData && pdfData.startsWith("blob:")) {
        URL.revokeObjectURL(pdfData);
      }
    };
  }, [pdfData]);

  // ✅ Input changes & detect PDF links
  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (/datasheet|pdf|link/i.test(key) && value.startsWith("http")) {
      setPdfUrl(value);
    }
  };

  // ✅ Save part (append CSV line)
  const handleSave = async () => {
    try {
      setSaving(true);
      const csvLine = headers
        .map((h) => (formData[h] ?? "").replace(/,/g, ";"))
        .join(",");
      await invoke("append_to_csv", { path: csvPath, line: csvLine });
      onAdded?.();
      handleClose();
    } catch (err: any) {
      setError("Failed to save part: " + err.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setPdfUrl("");
    setPdfData("");
    setHeaders([]);
    setFormData({});
  };

  // ✅ Fetch data from Mouser API
  const fetchMouserData = async () => {
    const ipnKey = headers.find((h) => /ipn|mpn|part.?number/i.test(h));
    const partNumber = ipnKey ? formData[ipnKey] : "";
    if (!partNumber) {
      setError("Please enter a part number (IPN or MPN) first.");
      return;
    }

    setFetchingMouser(true);
    setError(null);

    try {
      const apiKey = await invoke<string | null>("get_setting", {
        key: "mouser_api_key",
      });
      if (!apiKey) throw new Error("No Mouser API key found in settings.");

      const result = await invoke<any>("query_mouser_part", {
        apiKey,
        partNumber,
      });

      console.log("Mouser API results:", result);

      if (!result) throw new Error("No matching part found on Mouser.");

      const updates: Record<string, string> = {
        Supplier: "Mouser",
        SPN: result.MouserPartNumber || "",
        MPN: result.ManufacturerPartNumber || "",
        Manufacturer: result.Manufacturer || "",
        Description: result.Description || "",
        Datasheet: result.DataSheetUrl || "",
      };

      const matchedUpdates: Record<string, string> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (!val) continue;
        const match =
          headers.find((h) => normalize(h) === normalize(key)) ||
          (normalize(key) === "spn"
            ? headers.find((h) =>
                ["supplierpartnumber", "mousernumber", "suppliercode"].some(
                  (alt) => normalize(h) === alt
                )
              )
            : null) ||
          (normalize(key) === "datasheet"
            ? headers.find((h) =>
                ["datasheeturl", "datasheetlink"].some(
                  (alt) => normalize(h) === alt
                )
              )
            : null);
        if (match) matchedUpdates[match] = val;
      }

      setFormData((prev) => ({ ...prev, ...matchedUpdates }));

      if (updates.Datasheet) setPdfUrl(updates.Datasheet);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch Mouser data: " + err.toString());
    } finally {
      setFetchingMouser(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add New Part"
      centered
      size="80%"
      radius="lg"
      overlayProps={{ blur: 2 }}
    >
      {loading ? (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      ) : error ? (
        <Text c="red">{error}</Text>
      ) : (
        <Grid gutter="xl">
          {/* LEFT SIDE — PDF Viewer */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <div className="bg-[#0f1116] text-gray-200 rounded-lg p-2 h-[75vh] flex flex-col items-center justify-center">
              {downloading ? (
                <Stack align="center" justify="center">
                  <Text c="gray.4">Downloading PDF...</Text>
                  <Progress value={100} striped animated w="80%" color="blue" />
                </Stack>
              ) : pdfData ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer
                      fileUrl={pdfData}
                      plugins={[defaultLayoutPluginInstance]}
                    />
                  </Worker>
                </div>
              ) : (
                <Text c="dimmed" ta="center">
                  PDF preview will appear here once a datasheet link is available.
                </Text>
              )}
            </div>
          </Grid.Col>

          {/* RIGHT SIDE — Editable Form */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ScrollArea h="75vh">
              <Stack>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Part Details</Text>
                  <Tooltip label="Fetch part info from Mouser using IPN or MPN">
                    <Button
                      variant="light"
                      color="blue"
                      loading={fetchingMouser}
                      onClick={fetchMouserData}
                    >
                      Fetch from Mouser
                    </Button>
                  </Tooltip>
                </Group>

                {headers.map((header) => (
                  <div key={header}>
                    <Text size="sm" fw={500}>
                      {header}
                    </Text>
                    {header.toLowerCase().includes("description") ? (
                      <Textarea
                        placeholder={`Enter ${header}`}
                        value={formData[header] || ""}
                        onChange={(e) =>
                          handleChange(header, e.currentTarget.value)
                        }
                        minRows={2}
                      />
                    ) : (
                      <TextInput
                        placeholder={`Enter ${header}`}
                        value={formData[header] || ""}
                        onChange={(e) =>
                          handleChange(header, e.currentTarget.value)
                        }
                      />
                    )}
                  </div>
                ))}

                <Group justify="flex-end" mt="md">
                  <Button variant="default" onClick={handleClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} loading={saving}>
                    Save
                  </Button>
                </Group>
              </Stack>
            </ScrollArea>
          </Grid.Col>
        </Grid>
      )}
    </Modal>
  );
};
