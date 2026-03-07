/**
 * Export data to CSV file (safe replacement for xlsx dependency).
 * CSV is universally supported by Excel, Google Sheets, and other spreadsheet tools.
 */

const escapeCSV = (value: unknown): string => {
  const str = String(value ?? "");
  // Escape if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0]);

  // Build CSV content
  const headerRow = keys.map(escapeCSV).join(",");
  const dataRows = data.map(row =>
    keys.map(key => escapeCSV(row[key])).join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\r\n");

  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
