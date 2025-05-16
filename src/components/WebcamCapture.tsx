"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Download, RotateCcw, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useOcrStore } from "../store/ocrStore";
import ImageUploader from "./ImageUploader";

interface WebcamCaptureProps {
  onCapture?: (imageSrc: string) => void;
  processOcr: (imageSrc: string | null | undefined) => Promise<void>; // OCR処理関数を props として受け取る
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onCapture,
  processOcr,
}) => {
  const {
    capturedImage,
    isCapturing,
    setCapturedImage,
    setIsCapturing,
    isProcessing, // OCR処理中かどうか
  } = useOcrStore();
  const [inputMethod, setInputMethod] = useState<"camera" | "upload">("camera");
  const webcamRef = useRef<Webcam>(null);

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: "environment",
  };

  const handleCaptureAndProcess = useCallback(async () => {
    setIsCapturing(true);
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc); // ストアの画像も更新
      if (onCapture) {
        onCapture(imageSrc);
      }
      // 画像をキャプチャした直後にOCR処理を実行
      await processOcr(imageSrc); // キャプチャした画像を渡す
    } else {
      console.error("Failed to capture image");
    }
    setIsCapturing(false);
  }, [setCapturedImage, setIsCapturing, onCapture, processOcr]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <Tabs
        value={inputMethod}
        onValueChange={(value) => setInputMethod(value as "camera" | "upload")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera">
            <Camera className="mr-2 h-4 w-4" />
            カメラで撮影
          </TabsTrigger>
          <TabsTrigger value="upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            画像ファイル
          </TabsTrigger>
        </TabsList>
        <TabsContent value="camera" className="mt-4">
          <div className="relative w-full aspect-[4/3] bg-muted border border-border rounded-lg overflow-hidden flex items-center justify-center">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          </div>
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <div className="relative w-full aspect-[4/3] bg-muted border border-border rounded-lg overflow-hidden flex items-center justify-center">
            <ImageUploader processOcr={processOcr} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center mt-2">
        {inputMethod === "camera" && (
          <Button
            onClick={handleCaptureAndProcess}
            disabled={isCapturing || isProcessing} // OCR処理中も無効化
            className="w-full sm:w-auto"
          >
            <Camera className="mr-2 h-4 w-4" />
            {isCapturing
              ? "取り込み中..."
              : isProcessing
                ? "OCR処理中..."
                : "領収書を取り込む"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
