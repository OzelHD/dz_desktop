import React, { useEffect, useState } from "react";
import { Table, Loader, Center, Text, ScrollArea } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";

interface ParsedCSV {
  headers: string[];
  data: Record<string, string>[];
}

interface PartTableProps {
  path: string;
}

function parseCSV(csv: string): ParsedCSV {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const data = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    return row;
  });

  return { headers, data };
}

const PartTable: React.FC<PartTableProps> = ({ path }) => {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCSV = async () => {
      try {
        const content = await invoke<string>("read_csv_file", { path });
        setCsvText(content);
      } catch (err: any) {
        setError(err.toString());
      }
    };

    loadCSV();
  }, [path]);

  if (error) {
    return (
      <Center h="100%">
        <Text c="red">Error: {error}</Text>
      </Center>
    );
  }

  if (!csvText) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  const { headers, data } = parseCSV(csvText);

  return (
    // ✅ Only one scroll container controls vertical scroll
    <ScrollArea h="calc(100vh - 180px)" offsetScrollbars type="auto">
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        stickyHeader // ✅ works now
        stickyHeaderOffset={0} // optional fine-tuning
        miw={800}
      >
        <Table.Thead>
          <Table.Tr>
            {headers.map((header) => (
              <Table.Th key={header}>{header}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {headers.map((header) => (
                <Table.Td key={header}>{row[header]}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

export default PartTable;
