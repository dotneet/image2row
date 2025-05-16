// OCR結果のJSONからグリッドデータへのマッピングロジック

// グリッド行の型定義
export interface GridRow {
  id: string;
  date: string;
  vendor: string;
  debitAccountCategory: string; // 借方勘定科目（ユーザー入力）
  creditAccountCategory: string; // 貸方勘定科目（ユーザー入力）
  description: string; // 摘要
  amount: number;
  taxCategory: string; // 税区分（ユーザー入力）
  unitPrice?: number; // 単価（明細行の場合）
  quantity?: number; // 数量（明細行の場合）
  isHeader?: boolean; // ヘッダー行かどうか
}

// OCR結果の型定義（Gemini APIからのレスポンス）
export interface OcrResult {
  date: string;
  vendor: string;
  totalAmount: number;
  currency: string;
  taxAmount: number | string;
  paymentMethod: string;
  items: {
    description: string;
    accountCategory: string;
    taxCategory: string;
    debitAccountCategory: string;
    creditAccountCategory: string;
    unitPrice: number;
    quantity: number;
    amount: number;
  }[];
}

/**
 * OCR結果のJSONをグリッド行データに変換する関数
 *
 * @param ocrResult Gemini APIからのOCR結果
 * @returns グリッド表示用の行データ配列
 */
export function mapOcrResultToGridRows(ocrResult: OcrResult): GridRow[] {
  const rows: GridRow[] = [];

  // 不明な値を処理する関数
  const formatUnknown = (value: string | number | undefined | null): string => {
    return value === "unknown" || value === undefined || value === null
      ? ""
      : String(value);
  };

  // 数値を処理する関数
  const formatNumber = (value: string | number | undefined | null): number => {
    if (value === "unknown" || value === undefined || value === null) {
      return 0;
    }
    return typeof value === "number"
      ? value
      : Number.parseFloat(String(value)) || 0;
  };

  // 明細行がある場合は追加
  if (ocrResult.items && ocrResult.items.length > 0) {
    ocrResult.items.forEach((item, index) => {
      rows.push({
        id: crypto.randomUUID(),
        date: formatUnknown(ocrResult.date),
        vendor: formatUnknown(ocrResult.vendor),
        debitAccountCategory: formatUnknown(item.debitAccountCategory),
        creditAccountCategory: formatUnknown(item.creditAccountCategory),
        description: `${formatUnknown(item.description)}`,
        amount: formatNumber(item.amount),
        taxCategory: formatUnknown(item.taxCategory),
        unitPrice: formatNumber(item.unitPrice),
        quantity: formatNumber(item.quantity),
        isHeader: false,
      });
    });
  }

  return rows;
}

/**
 * グリッド行データをCSVエクスポート用のデータに変換する関数
 *
 * @param gridRows グリッド行データ
 * @returns CSVエクスポート用のデータ
 */
export interface CsvData {
  [key: string]: string | number | null | undefined;
  取引日: string;
  借方勘定科目: string;
  貸方勘定科目: string;
  摘要: string;
  "借方金額(円)": number;
  "貸方金額(円)": number;
  税区分: string;
}

export function mapGridRowsToCsvData(gridRows: GridRow[]): CsvData[] {
  return gridRows.map((row) => ({
    取引日: row.date,
    借方勘定科目: row.debitAccountCategory,
    貸方勘定科目: row.creditAccountCategory,
    摘要: row.description,
    "借方金額(円)": row.amount,
    "貸方金額(円)": row.amount,
    税区分: row.taxCategory,
  }));
}
