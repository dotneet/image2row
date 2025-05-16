"use client";

import { Button, buttonVariants } from "@/components/ui/button"; // buttonVariantsをインポート
import { type GridRow, mapGridRowsToCsvData } from "@/lib/mapJsonToGrid";
import { cn } from "@/lib/utils"; // cnユーティリティをインポート
import { Download } from "lucide-react"; // アイコンをインポート
import { useCallback, useEffect, useState } from "react";
import CsvDownloader from "react-csv-downloader";

interface ExportCsvButtonProps {
  gridRows: GridRow[];
  disabled?: boolean;
}

const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({
  gridRows,
  disabled = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getFileName = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `receipt_data_${year}${month}${day}_${hours}${minutes}.csv`;
  }, []);

  const csvData = mapGridRowsToCsvData(gridRows);

  const columns = [
    { id: "取引日", displayName: "取引日" },
    { id: "借方勘定科目", displayName: "借方勘定科目" },
    { id: "貸方勘定科目", displayName: "貸方勘定科目" },
    { id: "摘要", displayName: "摘要" },
    { id: "借方金額(円)", displayName: "借方金額(円)" },
    { id: "貸方金額(円)", displayName: "貸方金額(円)" },
    { id: "税区分", displayName: "税区分" },
  ];

  if (!isMounted) {
    return (
      <div className="w-full sm:w-auto">
        <Button disabled className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-auto">
      <CsvDownloader
        filename={getFileName()}
        extension=".csv"
        separator=","
        columns={columns}
        datas={csvData}
        disabled={disabled || gridRows.length === 0}
        className={cn(
          buttonVariants({ variant: "default", size: "default" }), // shadcnのButtonスタイルを適用
          "w-full sm:w-auto", // 幅を調整
          (disabled || gridRows.length === 0) &&
            "opacity-60 cursor-not-allowed", // disabled時のスタイル
        )}
      >
        <Download className="mr-2 h-4 w-4" />
        CSVエクスポート
      </CsvDownloader>

      {gridRows.length === 0 && !disabled && (
        <p className="text-xs text-muted-foreground mt-2 text-center sm:text-left">
          エクスポートするデータがありません。
        </p>
      )}
    </div>
  );
};

export default ExportCsvButton;
