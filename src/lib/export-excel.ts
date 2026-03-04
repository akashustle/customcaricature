import * as XLSX from "xlsx";

type CellStyle = {
  font?: { bold?: boolean; color?: { rgb?: string }; sz?: number };
  fill?: { fgColor?: { rgb?: string } };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
  border?: any;
};

const thinBorder = {
  top: { style: "thin", color: { rgb: "CCCCCC" } },
  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
  left: { style: "thin", color: { rgb: "CCCCCC" } },
  right: { style: "thin", color: { rgb: "CCCCCC" } },
};

const headerStyle: CellStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "4A3728" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: thinBorder,
};

const dataStyle: CellStyle = {
  font: { sz: 10 },
  alignment: { vertical: "center", wrapText: true },
  border: thinBorder,
};

const amountStyle: CellStyle = {
  ...dataStyle,
  font: { sz: 10, bold: true, color: { rgb: "2E7D32" } },
  alignment: { horizontal: "right", vertical: "center" },
};

const statusPaidStyle: CellStyle = {
  ...dataStyle,
  font: { sz: 10, bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "388E3C" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const statusPendingStyle: CellStyle = {
  ...dataStyle,
  font: { sz: 10, bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "D32F2F" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const altRowStyle: CellStyle = {
  ...dataStyle,
  fill: { fgColor: { rgb: "F5F0EB" } },
};

export const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
  if (!data || data.length === 0) return;
  
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-width columns
  const keys = Object.keys(data[0]);
  const colWidths = keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 4, 45) };
  });
  ws["!cols"] = colWidths;
  
  // Apply styles
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  
  // Header row styling
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = headerStyle;
    }
  }
  
  // Data rows
  for (let r = 1; r <= range.e.r; r++) {
    const isAlt = r % 2 === 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c });
      const headerVal = ws[headerAddr]?.v || "";
      const cellVal = String(ws[addr].v ?? "").toLowerCase();
      
      // Amount columns
      if (typeof headerVal === "string" && (headerVal.includes("Amount") || headerVal.includes("Price") || headerVal.includes("Revenue") || headerVal.includes("Total") || headerVal === "Amount")) {
        ws[addr].s = amountStyle;
      }
      // Status columns
      else if (typeof headerVal === "string" && (headerVal === "Status" || headerVal === "Payment")) {
        if (cellVal.includes("paid") || cellVal.includes("confirmed") || cellVal.includes("completed") || cellVal.includes("delivered")) {
          ws[addr].s = statusPaidStyle;
        } else if (cellVal.includes("pending") || cellVal.includes("cancelled") || cellVal.includes("new")) {
          ws[addr].s = statusPendingStyle;
        } else {
          ws[addr].s = isAlt ? altRowStyle : dataStyle;
        }
      }
      else {
        ws[addr].s = isAlt ? altRowStyle : dataStyle;
      }
    }
  }
  
  // Set row heights
  ws["!rows"] = [{ hpt: 28 }]; // header row height
  for (let r = 1; r <= range.e.r; r++) {
    if (!ws["!rows"]) ws["!rows"] = [];
    ws["!rows"][r] = { hpt: 22 };
  }
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`, { cellStyles: true });
};
