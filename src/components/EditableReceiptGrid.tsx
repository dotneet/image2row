"use client";

import { Button } from "@/components/ui/button"; // shadcnのButtonをインポート
import { Input } from "@/components/ui/input"; // shadcnのInputをインポート
import { cn } from "@/lib/utils";
import { FileSpreadsheet, Loader2, Trash2 } from "lucide-react"; // アイコンをインポート
import { useEffect, useRef, useState } from "react";
import type { GridRow } from "../lib/mapJsonToGrid";
import { useOcrStore } from "../store/ocrStore";

// 税区分のオプション (EditableReceiptGridでは直接使用されていませんが、参考として残します)
// const TAX_CATEGORIES = ["課税10%", "課税8%", "非課税", "不課税", "免税"];

const EditableReceiptGrid: React.FC = () => {
  const {
    ocrResult,
    gridRows,
    setGridRows,
    updateGridRow,
    deleteGridRow: storeDeleteGridRow,
  } = useOcrStore();
  const [activeCell, setActiveCell] = useState<{
    rowIndex: number;
    colKey: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      // IME変換中でない場合のみ全選択する
      inputRef.current.select();
    }
  }, [activeCell]);

  // ストア側でgridRowsが更新されるため、このuseEffectは不要になりました。
  // useEffect(() => {
  //   if (isMounted && ocrResult && gridRows.length === 0) {
  //     const newGridRows = mapOcrResultToGridRows(ocrResult);
  //     setGridRows(newGridRows);
  //   }
  // }, [ocrResult, gridRows.length, setGridRows, isMounted]);

  const columns = [
    { key: "date", name: "日付", width: "120px", editable: true },
    { key: "vendor", name: "支払先", width: "150px", editable: true },
    {
      key: "debitAccountCategory",
      name: "借方勘定科目",
      width: "150px",
      editable: true,
    },
    {
      key: "creditAccountCategory",
      name: "貸方勘定科目",
      width: "150px",
      editable: true,
    },
    {
      key: "amount",
      name: "金額",
      width: "120px",
      editable: true,
      isNumber: true,
    },
    { key: "taxCategory", name: "税区分", width: "120px", editable: true },
    { key: "description", name: "摘要", width: "200px", editable: true },
    { key: "actions", name: "", width: "60px", editable: false }, // 幅を少し広げる
  ];

  const handleCellClick = (rowIndex: number, colKey: string) => {
    if (colKey === "actions") return;
    const column = columns.find((col) => col.key === colKey);
    if (!column?.editable) return;

    const row = gridRows[rowIndex];
    const value = row[colKey as keyof GridRow];
    setActiveCell({ rowIndex, colKey });
    setEditValue(value !== undefined ? String(value) : "");
    // setTimeout内のフォーカス処理はuseEffectに移動しました
  };

  const handleCellBlur = () => {
    if (!activeCell) return;
    const { id } = gridRows[activeCell.rowIndex];
    const column = columns.find((col) => col.key === activeCell.colKey);
    let value: string | number = editValue;
    if (column?.isNumber && editValue !== "") {
      value = Number.parseFloat(editValue) || 0;
    }
    updateGridRow(id, { [activeCell.colKey]: value });
    setActiveCell(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>,
  ) => {
    // IME変換中またはIME変換確定時はキー処理をスキップ
    if (isComposing || e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault(); // デフォルトのEnterキー動作を防止
      handleCellBlur();
    } else if (e.key === "Escape") {
      setActiveCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (!activeCell) return;
      const { rowIndex, colKey } = activeCell;
      const currentColIndex = columns.findIndex((col) => col.key === colKey);
      let nextColIndex = currentColIndex;
      let nextRowIndex = rowIndex;
      do {
        nextColIndex++;
        if (nextColIndex >= columns.length) {
          nextColIndex = 0;
          nextRowIndex++;
          if (nextRowIndex >= gridRows.length) {
            nextRowIndex = 0;
          }
        }
        if (columns[nextColIndex].key === "actions") continue;
        if (columns[nextColIndex].editable) break;
      } while (
        (nextColIndex !== currentColIndex || nextRowIndex !== rowIndex) &&
        nextColIndex < columns.length
      );
      handleCellBlur();
      handleCellClick(nextRowIndex, columns[nextColIndex].key);
    }
  };

  const handleDeleteRow = (rowId: string) => {
    storeDeleteGridRow(rowId);
  };

  const formatCellValue = (row: GridRow, key: string) => {
    const value = row[key as keyof GridRow];
    if (key === "amount" && typeof value === "number") {
      return value.toLocaleString();
    }
    return value || "";
  };

  return (
    <div className="w-full h-full flex flex-col">
      {" "}
      {/* 親要素にflex-colとh-fullを追加 */}
      {!isMounted ? (
        <div
          className="border border-border rounded-lg p-6 text-center text-muted-foreground bg-muted/20 flex items-center justify-center flex-grow" // flex-growを追加
          style={{ minHeight: "150px" }}
        >
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground animate-spin" />
            <p>データを読み込んでいます...</p>
          </div>
        </div>
      ) : gridRows.length > 0 ? (
        <div
          className="border border-border rounded-lg overflow-auto shadow-sm bg-card flex-grow" // flex-growを追加
          // style={{ maxHeight: "calc(100vh - 300px)" }} // maxHeightを削除または調整
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
              {/* ヘッダー背景を調整 */}
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="p-3 text-left font-semibold text-foreground border-b border-border" // テキスト色を調整
                    style={{ width: column.width }}
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* 行間の区切り線 */}
              {gridRows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    row.isHeader && "font-semibold text-foreground",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={`${row.id}-${column.key}`}
                      className={cn(
                        "p-2.5 text-xs", // パディングを少し調整
                        column.isNumber ? "text-right" : "text-left",
                        column.editable && "cursor-pointer",
                      )}
                      onClick={() => handleCellClick(rowIndex, column.key)}
                      onKeyUp={(e) => {
                        if (isComposing) return;
                        if (e.key === "Enter" || e.key === " ") {
                          handleCellClick(rowIndex, column.key);
                        }
                      }}
                      style={{ minHeight: "48px" }} // セルの高さを確保
                      tabIndex={
                        column.key !== "actions" && column.editable ? 0 : -1
                      }
                      role={column.editable ? "button" : undefined}
                    >
                      {activeCell &&
                      activeCell.rowIndex === rowIndex &&
                      activeCell.colKey === column.key ? (
                        <Input
                          ref={inputRef}
                          type={column.isNumber ? "number" : "text"}
                          className={cn(
                            "w-full h-full text-sm p-1.5",
                            column.isNumber && "text-right",
                          )}
                          value={editValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditValue(e.target.value)
                          }
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          onCompositionStart={() => setIsComposing(true)}
                          onCompositionEnd={(e) => {
                            // IME変換確定時の処理
                            const target = e.target as HTMLInputElement;
                            const length = target.value.length;

                            // カーソルを文末に移動（選択状態を解除）
                            target.setSelectionRange(length, length);

                            // 少し遅延させてisComposingフラグを更新
                            setTimeout(() => {
                              setIsComposing(false);
                            }, 100);
                          }}
                        />
                      ) : column.key === "actions" ? (
                        <div className="flex justify-center items-center h-full">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRow(row.id);
                            }}
                            title="行を削除"
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "h-[24px] whitespace-nowrap overflow-hidden text-ellipsis",
                            column.isNumber && "text-right",
                          )}
                          title={String(formatCellValue(row, column.key))}
                        >
                          {formatCellValue(row, column.key)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="border border-border rounded-lg p-6 text-center text-muted-foreground bg-muted/20 flex items-center justify-center"
          style={{ minHeight: "150px" }}
        >
          <div className="flex flex-col items-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p>OCR結果がありません。</p>
            <p className="text-sm">
              領収書を撮影またはアップロードし、OCR処理を実行してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableReceiptGrid;
