import * as XLSX from "xlsx";

export const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
  if (!data || data.length === 0) return;
  
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-width columns
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
