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
import { useOcrStore } from "@/store/ocrStore"; // Zustandストアをインポート
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function ApiKeySettingsDialog() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // ZustandストアからAPIキーとセッターを取得
  const apiKey = useOcrStore((state) => state.apiKey);
  const setApiKey = useOcrStore((state) => state.setApiKey);
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || "");

  useEffect(() => {
    // ストアのAPIキーが変更されたら、ローカルのステートも更新
    setCurrentApiKey(apiKey || "");
  }, [apiKey]);

  const handleSaveSettings = () => {
    setApiKey(currentApiKey); // ZustandストアにAPIキーを保存
    setIsSettingsOpen(false);
  };

  const handleOpenDialog = () => {
    // ダイアログを開くときにストアから最新のAPIキーを読み込む
    setCurrentApiKey(apiKey || "");
    setIsSettingsOpen(true);
  };

  return (
    <AlertDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <AlertDialogTrigger asChild>
        <Button onClick={handleOpenDialog}>設定</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>APIキー設定</AlertDialogTitle>
          <AlertDialogDescription>
            OCR機能を使用するためのAPIキーを設定してください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
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
