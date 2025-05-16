"use client";

import { ApiKeySettingsDialog } from "@/components/ApiKeySettingsDialog"; // ApiKeySettingsDialog をインポート
import EditableReceiptGrid from "@/components/EditableReceiptGrid";
import ExportCsvButton from "@/components/ExportCsvButton";
import OcrProcessor from "@/components/OcrProcessor";
import WebcamCapture from "@/components/WebcamCapture";
import {
  AlertDialog, // AlertDialogを追加
  AlertDialogAction, // AlertDialogAction を追加
  AlertDialogCancel, // ialogCancel を AlertDialogCancel に修正
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card"; // 作成したSectionCardをインポート
import { useOcrStore } from "@/store/ocrStore";
import { useCallback, useEffect, useState } from "react"; // useCallback を追加

export default function Home() {
  const {
    capturedImage,
    gridRows,
    clearAllData,
    setOcrResult,
    setIsProcessing,
    setError,
  } = useOcrStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const processOcr = useCallback(
    async (imageSrc: string | null | undefined) => {
      if (!imageSrc) {
        setError(
          "画像が設定されていません。先に領収書を撮影またはアップロードしてください。",
        );
        return;
      }

      try {
        setIsProcessing(true);
        setError(null);
        const header = "日付,支払先,借方,貸方,金額,税区分,摘要";
        const recentJournalData = [
          header,
          ...gridRows.slice(-10).map((row) => {
            return `${row.date},${row.vendor},${row.debitAccountCategory},${row.creditAccountCategory},${row.amount},${row.taxCategory},${row.description}`;
          }),
        ].join("\n");
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageSrc,
            recentJournalData,
            geminiApiKey: process.env.GEMINI_API_KEY,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "OCR処理に失敗しました");
        }
        const result = await response.json();
        if (result.error) {
          setError(result.error);
          return;
        }
        setOcrResult(result); // これが gridRows を更新するはず
      } catch (err) {
        console.error("OCR処理エラー:", err);
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [gridRows, setOcrResult, setIsProcessing, setError],
  ); // capturedImage を依存配列から削除

  return (
    // Tailwind CSSのテーマに合わせて背景色とフォントを変更
    <div className="min-h-screen bg-background p-4 font-sans">
      <main className="flex flex-col md:flex-row gap-4 mx-auto max-w-7xl">
        {/* 左側カラム: Step1 & Step2 */}
        <div className="w-full md:w-[400px] flex flex-col gap-4">
          <div className="flex flex-row justify-start">
            <h1 className="text-xl font-semibold">image2row</h1>
          </div>

          <SectionCard title="Step 1. 証憑指定">
            <WebcamCapture processOcr={processOcr} />
          </SectionCard>

          <SectionCard title="Step 2: OCR処理ステータス">
            {/* OcrProcessor は OCR 結果の表示とエラー表示のみを担当 */}
            <OcrProcessor />
            {/* ユーザーへのフィードバックは OcrProcessor 内で処理されるため、
                capturedImage がない場合のメッセージは OcrProcessor 側で表示するか、
                またはこの場所に残すか検討。現状は OcrProcessor 側にプレビューがあるので、
                ここでは capturedImage がない場合のメッセージは不要かもしれません。
                ただし、OCR実行前の状態を示すために残すことも考えられます。
                ここでは、OcrProcessorが画像プレビューも担当するため、
                この条件分岐は不要になるか、OcrProcessorの表示内容に依存します。
                一旦、OcrProcessorが画像未選択時の表示も制御すると仮定し、
                この分岐をシンプルにします。
            */}
            {!capturedImage &&
              !useOcrStore.getState().isProcessing &&
              !useOcrStore.getState().ocrResult && (
                <div className="flex items-center justify-center h-[200px] border border-border rounded bg-muted/20">
                  <p className="text-muted-foreground">
                    「領収書を取り込む」ボタンを押してOCR処理を開始してください
                  </p>
                </div>
              )}
          </SectionCard>
        </div>

        {/* 右側カラム: データ編集 & エクスポート */}
        <div className="w-full md:flex-1 flex flex-col gap-4">
          {/* classNameを追加して高さを固定 */}
          <div className="flex flex-col sm:flex-row justify-end items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <ApiKeySettingsDialog />
            <ExportCsvButton
              gridRows={gridRows}
              disabled={gridRows.length === 0}
            />

            {isMounted && gridRows.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 mr-2"
                    >
                      <title>すべて削除</title>
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75H4.5a.75.75 0 0 0 0 1.5h11a.75.75 0 0 0 0-1.5H14A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.532.348 2.036.914l.914-.914A2.25 2.25 0 0 0 10.69 2H9.309a2.25 2.25 0 0 0-2.26 1.086l.914.914A1.752 1.752 0 0 1 10 4ZM4.5 6.5A.75.75 0 0 0 3.75 7.25v7.5A2.75 2.75 0 0 0 6.5 17.5h7A2.75 2.75 0 0 0 16.25 14.75v-7.5a.75.75 0 0 0-.75-.75h-11Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    すべてのデータを削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>データ削除の確認</AlertDialogTitle>
                    <AlertDialogDescription>
                      すべてのデータを削除してもよろしいですか？この操作は元に戻せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllData}>
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <EditableReceiptGrid />
        </div>
      </main>
    </div>
  );
}
