"use client";

import { Button } from "@/components/ui/button"; // shadcnのButtonをインポート
import { useOcrStore } from "@/store/ocrStore";
import { Download, RotateCcw, UploadCloud } from "lucide-react"; // アイコンをインポート
import { useCallback, useState } from "react";

interface ImageUploaderProps {
  processOcr: (imageSrc: string | null | undefined) => Promise<void>;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ processOcr }) => {
  const { setCapturedImage, setIsProcessing } = useOcrStore(); // isProcessing を追加
  const [isDragging, setIsDragging] = useState(false);

  const processFileAndTriggerOcr = useCallback(
    async (file: File) => {
      if (!file.type.match("image.*")) {
        alert("画像ファイルを選択してください");
        return;
      }
      setIsProcessing(true); // OCR処理開始前にisProcessingをtrueに
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          setCapturedImage(result);
          await processOcr(result); // OCR処理を実行
        }
        // setIsProcessing(false); // processOcr内でfinallyでfalseになるのでここでは不要
      };
      reader.readAsDataURL(file);
    },
    [setCapturedImage, processOcr, setIsProcessing],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFileAndTriggerOcr(files[0]);
      }
    },
    [processFileAndTriggerOcr],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFileAndTriggerOcr(files[0]);
      }
    },
    [processFileAndTriggerOcr],
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      {/* 画像選択後はStep 2のOcrProcessorでプレビューするため、ここでは常にアップロードUIを表示 */}
      <Button
        type="button"
        variant="outline"
        className={`w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer p-4 text-left transition-colors ${
          isDragging
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:border-primary/50 hover:bg-accent"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input-uploader")?.click()}
      >
        <UploadCloud
          className={`w-12 h-12 mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
        />
        <p
          className={`text-sm font-medium ${isDragging ? "text-primary" : "text-muted-foreground"}`}
        >
          クリックまたはドラッグ＆ドロップしてアップロード
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          画像ファイル (JPEG, PNG, GIFなど)
        </p>
      </Button>
      <input
        id="file-input-uploader"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default ImageUploader;
