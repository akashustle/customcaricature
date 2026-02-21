import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";

interface ExportButtonProps {
  data: any[];
  sheetName: string;
  fileName: string;
  label?: string;
}

const ExportButton = ({ data, sheetName, fileName, label = "Export Excel" }: ExportButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportToExcel(data, sheetName, fileName)}
      disabled={!data || data.length === 0}
      className="font-sans text-xs gap-1"
    >
      <Download className="w-3 h-3" />
      {label}
    </Button>
  );
};

export default ExportButton;
