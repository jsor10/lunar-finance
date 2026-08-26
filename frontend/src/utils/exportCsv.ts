import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { Transaction, Goal, SalaryEntry } from "@/src/context/AppContext";

function field(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function buildCsv(data: {
  transactions: Transaction[];
  goals: Goal[];
  salaryHistory: SalaryEntry[];
  salary: number;
  currency: string;
}): string {
  const lines: string[] = [];
  lines.push("TRANSACTIONS");
  lines.push("Date,Type,Category,Description,Amount,Currency");
  const sorted = [...data.transactions].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
  for (const t of sorted) {
    lines.push(
      [
        field(t.created_at.slice(0, 10)),
        field(t.type),
        field(t.category || "Other"),
        field(t.description),
        field(t.amount),
        field(data.currency),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("SALARY");
  lines.push("Month,Salary");
  if (data.salaryHistory.length) {
    for (const h of data.salaryHistory) lines.push(`${field(h.month)},${field(h.salary)}`);
  } else {
    lines.push(`current,${field(data.salary)}`);
  }
  lines.push("");
  lines.push("SAVINGS GOALS");
  lines.push("Name,Target,Saved");
  for (const g of data.goals) {
    lines.push([field(g.name), field(g.target), field(g.saved)].join(","));
  }
  return lines.join("\n");
}

export async function exportCsv(data: Parameters<typeof buildCsv>[0]): Promise<void> {
  const csv = buildCsv(data);
  const filename = "salary-manager-export.csv";
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: filename });
  }
}
