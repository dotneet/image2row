"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Selectコンポーネントをインポート
import {
  AVAILABLE_OCR_MODELS,
  type OcrModel,
  useOcrStore,
} from "@/store/ocrStore"; // Zustandストアとモデル関連をインポート
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function ApiKeySettingsDialog() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // ZustandストアからAPIキー、選択中のモデル、およびセッターを取得
  const apiKey = useOcrStore((state) => state.apiKey);
  const setApiKey = useOcrStore((state) => state.setApiKey);
  const selectedModel = useOcrStore((state) => state.selectedModel);
  const setSelectedModel = useOcrStore((state) => state.setSelectedModel);

  const [currentApiKey, setCurrentApiKey] = useState(apiKey || "");
  const [currentSelectedModel, setCurrentSelectedModel] =
    useState<OcrModel>(selectedModel);

  useEffect(() => {
    // ストアのAPIキーまたはモデルが変更されたら、ローカルのステートも更新
    setCurrentApiKey(apiKey || "");
    setCurrentSelectedModel(selectedModel);
  }, [apiKey, selectedModel]);

  const handleSaveSettings = () => {
    setApiKey(currentApiKey); // ZustandストアにAPIキーを保存
    setSelectedModel(currentSelectedModel); // Zustandストアに選択モデルを保存
    setIsSettingsOpen(false);
  };

  const handleOpenDialog = () => {
    // ダイアログを開くときにストアから最新のAPIキーとモデルを読み込む
    setCurrentApiKey(apiKey || "");
    setCurrentSelectedModel(selectedModel);
    setIsSettingsOpen(true);
  };

  return (
    <AlertDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <AlertDialogTrigger asChild>
        <Button onClick={handleOpenDialog}>設定</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>設定</AlertDialogTitle>
          <AlertDialogDescription>
            OCR機能のAPIキーと使用するモデルを設定します。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right col-span-1">
              API Key
            </Label>
            <Input
              id="api-key"
              value={currentApiKey}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              className="col-span-3"
              placeholder="Your API Key"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ocr-model" className="text-right col-span-1">
              OCRモデル
            </Label>
            <Select
              value={currentSelectedModel}
              onValueChange={(value) =>
                setCurrentSelectedModel(value as OcrModel)
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="モデルを選択" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_OCR_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsSettingsOpen(false)}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSaveSettings}>
            保存
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
