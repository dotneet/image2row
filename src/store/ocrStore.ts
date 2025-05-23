import {
  type GridRow,
  type OcrResult,
  mapOcrResultToGridRows,
} from "@/lib/mapJsonToGrid";
import { create } from "zustand";

// ローカルストレージのキー
const GRID_DATA_STORAGE_KEY = "i2row_grid_data";
const API_KEY_STORAGE_KEY = "i2row_api_key";
const OCR_MODEL_STORAGE_KEY = "i2row_ocr_model"; // OCRモデル保存用キー

// 利用可能なOCRモデルのリスト
export const AVAILABLE_OCR_MODELS = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-pro-preview-05-06",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export type OcrModel = (typeof AVAILABLE_OCR_MODELS)[number];

// デフォルトのOCRモデル
const DEFAULT_OCR_MODEL: OcrModel =
  (process.env.NEXT_PUBLIC_DEFAULT_OCR_MODEL as OcrModel) || "gemini-2.0-flash"; // デフォルトをリスト内のものに変更

// ローカルストレージからデータを読み込む関数
const loadFromLocalStorage = (): {
  gridRows: GridRow[];
  apiKey: string | null;
  selectedModel: OcrModel;
} => {
  let gridRows: GridRow[] = [];
  let apiKey: string | null = null;
  let selectedModel: OcrModel = DEFAULT_OCR_MODEL;

  if (typeof window === "undefined") return { gridRows, apiKey, selectedModel };

  try {
    const savedGridData = localStorage.getItem(GRID_DATA_STORAGE_KEY);
    if (savedGridData) {
      gridRows = JSON.parse(savedGridData).gridRows;
    }
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      apiKey = savedApiKey;
    }
    const savedOcrModel = localStorage.getItem(
      OCR_MODEL_STORAGE_KEY,
    ) as OcrModel | null;
    if (savedOcrModel && AVAILABLE_OCR_MODELS.includes(savedOcrModel)) {
      selectedModel = savedOcrModel;
    }
  } catch (error) {
    console.error("ローカルストレージからの読み込みに失敗しました:", error);
  }
  return { gridRows, apiKey, selectedModel };
};

// ローカルストレージにグリッドデータを保存する関数
const saveGridDataToLocalStorage = (gridRows: GridRow[]) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(GRID_DATA_STORAGE_KEY, JSON.stringify({ gridRows }));
  } catch (error) {
    console.error(
      "グリッドデータのローカルストレージへの保存に失敗しました:",
      error,
    );
  }
};

// ローカルストレージにAPIキーを保存する関数
const saveApiKeyToLocalStorage = (apiKey: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("APIキーのローカルストレージへの保存に失敗しました:", error);
  }
};

// ローカルストレージにOCRモデルを保存する関数
const saveOcrModelToLocalStorage = (model: OcrModel) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(OCR_MODEL_STORAGE_KEY, model);
  } catch (error) {
    console.error(
      "OCRモデルのローカルストレージへの保存に失敗しました:",
      error,
    );
  }
};

// OCRストアの状態の型定義
interface OcrState {
  // 画像関連
  capturedImage: string | null; // base64形式の画像データ
  isCapturing: boolean; // 撮影中かどうか

  // OCR処理関連
  ocrResult: OcrResult | null; // OCR結果のJSON
  isProcessing: boolean; // OCR処理中かどうか
  error: string | null; // エラーメッセージ
  apiKey: string | null; // OCR APIキー
  selectedModel: OcrModel; // 選択中のOCRモデル

  // グリッドデータ関連
  gridRows: GridRow[]; // 編集可能なグリッドの行データ

  // アクション
  setCapturedImage: (image: string | null) => void;
  setIsCapturing: (isCapturing: boolean) => void;
  setOcrResult: (result: OcrResult | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setApiKey: (apiKey: string | null) => void;
  setSelectedModel: (model: OcrModel) => void;
  setGridRows: (rows: GridRow[]) => void;
  updateGridRow: (rowId: string, updatedRow: Partial<GridRow>) => void;
  deleteGridRow: (rowId: string) => void; // 行削除機能
  resetState: () => void;
  clearAllData: () => void; // 全データ削除機能
}

// Zustandストアの作成
const initialState = loadFromLocalStorage();
export const useOcrStore = create<OcrState>((set, get) => ({
  // 初期状態 - ローカルストレージから復元を試みる
  capturedImage: null,
  isCapturing: false,
  ocrResult: null,
  isProcessing: false,
  error: null,
  apiKey: initialState.apiKey,
  selectedModel: initialState.selectedModel,
  gridRows: initialState.gridRows,

  // アクション
  setCapturedImage: (image) => set({ capturedImage: image }),
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  setOcrResult: (result) => {
    set({ ocrResult: result });

    // OCR結果が更新されたら、グリッドデータも自動的に更新
    if (result) {
      const newGridRows = mapOcrResultToGridRows(result);
      const currentRows = get().gridRows;
      const updatedRows = [...currentRows, ...newGridRows];
      set({ gridRows: updatedRows });
      // ローカルストレージに保存
      saveGridDataToLocalStorage(updatedRows);
    }
  },
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error }),
  setApiKey: (apiKey) => {
    set({ apiKey });
    saveApiKeyToLocalStorage(apiKey);
  },
  setSelectedModel: (model) => {
    set({ selectedModel: model });
    saveOcrModelToLocalStorage(model);
  },
  setGridRows: (rows) => {
    set({ gridRows: rows });
    // ローカルストレージに保存
    saveGridDataToLocalStorage(rows);
  },

  // 特定の行を更新するアクション
  updateGridRow: (rowId, updatedRow) => {
    const currentRows = get().gridRows;
    const updatedRows = currentRows.map((row) =>
      row.id === rowId ? { ...row, ...updatedRow } : row,
    );
    set({ gridRows: updatedRows });
    // ローカルストレージに保存
    saveGridDataToLocalStorage(updatedRows);
  },

  // 行を削除するアクション
  deleteGridRow: (rowId) => {
    const currentRows = get().gridRows;
    const updatedRows = currentRows.filter((row) => row.id !== rowId);
    set({ gridRows: updatedRows });
    // ローカルストレージに保存
    saveGridDataToLocalStorage(updatedRows);
  },

  resetState: () =>
    set({
      capturedImage: null,
      isCapturing: false,
      ocrResult: null,
      isProcessing: false,
      error: null,
      apiKey: null, // APIキーもリセット
      selectedModel: DEFAULT_OCR_MODEL, // OCRモデルもリセット
      gridRows: [],
    }),

  // 全データを削除するアクション
  clearAllData: () => {
    set({
      capturedImage: null,
      isCapturing: false,
      ocrResult: null,
      isProcessing: false,
      error: null,
      apiKey: null, // APIキーもクリア
      selectedModel: DEFAULT_OCR_MODEL, // OCRモデルもクリア
      gridRows: [],
    });
    // ローカルストレージからも削除
    if (typeof window !== "undefined") {
      localStorage.removeItem(GRID_DATA_STORAGE_KEY);
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      localStorage.removeItem(OCR_MODEL_STORAGE_KEY); // OCRモデルも削除
    }
  },
}));
