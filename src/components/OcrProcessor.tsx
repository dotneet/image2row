"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, ScanText } from "lucide-react"; // アイコンをインポート
import { useCallback } from "react";
import { useOcrStore } from "../store/ocrStore";

// OcrProcessorコンポーネントはOCR結果の表示とエラー表示に専念します。
// OCR処理の実行ロジックはpage.tsxに移動しました。

// propsが不要なため、interface OcrProcessorProps は削除します。
// const OcrProcessor: React.FC = () => { とします。

const OcrProcessor: React.FC = () => {
  const {
    capturedImage, // 表示用
    ocrResult, // 表示用
    isProcessing, // 表示用 (ローディングスピナーなど)
    error, // 表示用 (エラーメッセージ)
    apiKey, // APIキーを取得
  } = useOcrStore();

  // OCR処理を実行する関数 (page.tsxから移動)
  const processOcr = useCallback(async () => {
    if (!capturedImage) {
      useOcrStore.getState().setError("画像がキャプチャされていません。");
      return;
    }
    if (!apiKey) {
      useOcrStore.getState().setError("APIキーが設定されていません。");
      return;
    }

    useOcrStore.getState().setIsProcessing(true);
    useOcrStore.getState().setError(null);
    useOcrStore.getState().setOcrResult(null); // 前回の結果をクリア

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: capturedImage, apiKey }), // APIキーを送信
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `OCR処理に失敗しました: ${response.statusText}`,
        );
      }

      const result = await response.json();
      useOcrStore.getState().setOcrResult(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        useOcrStore.getState().setError(err.message);
      } else {
        useOcrStore
          .getState()
          .setError("OCR処理中に不明なエラーが発生しました。");
      }
    } finally {
      useOcrStore.getState().setIsProcessing(false);
    }
  }, [capturedImage, apiKey]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {capturedImage && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">取り込み画像プレビュー</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <img
              src={capturedImage}
              alt="Captured receipt"
              className="max-w-full h-auto rounded-md border"
            />
            <a
              href={capturedImage}
              download="captured_receipt.png"
              className="mt-2"
            >
              <Button variant="outline" size="sm">
                画像をダウンロード
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {capturedImage && !isProcessing && (
        <Button
          onClick={processOcr}
          disabled={isProcessing || !apiKey}
          className="w-full"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanText className="mr-2 h-4 w-4" />
          )}
          OCR実行
        </Button>
      )}

      {/* OCR実行ボタンはWebcamCaptureまたはpage.tsxのStep2セクションにあります */}
      {isProcessing && ( // OCR処理中の表示
        <div className="flex items-center justify-center p-4">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">OCR処理を実行中です...</p>
        </div>
      )}

      {error &&
        !isProcessing && ( // isProcessingがfalseの時だけエラーを表示
          <Alert variant="destructive" className="w-full mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>OCR処理エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

      {ocrResult && !isProcessing && !error && (
        <Card className="w-full mt-4">
          <CardHeader>
            <CardTitle className="text-lg">OCR結果プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              {JSON.stringify(ocrResult, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              詳細な編集は右側の「領収書データ編集」テーブルで行ってください。
            </p>
          </CardContent>
        </Card>
      )}
      {!capturedImage && !isProcessing && !ocrResult && !error && (
        <div className="flex items-center justify-center h-[100px] border border-dashed border-border rounded-md bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            「領収書を取り込む」ボタンを押してOCR処理を開始するか、画像をアップロードしてください。
          </p>
        </div>
      )}
    </div>
  );
};

export default OcrProcessor;
