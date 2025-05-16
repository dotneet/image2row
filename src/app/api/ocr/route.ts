import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

// 安全性設定
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// 領収書OCRのためのプロンプト
function receiptOcrPrompt(recentJournalData: string) {
  return `
あなたは領収書OCRの専門家です。提供された領収書の画像から、以下の情報を抽出してJSON形式で返してください。

1. 日付（date）: YYYY/MM/DD形式で。不明な場合は"unknown"
2. 支払先名（vendor）: 店舗名や会社名
3. 合計金額（totalAmount）: 数値のみ（通貨記号なし）
4. 通貨（currency）: "JPY"など
5. 税額（taxAmount）: 消費税や付加価値税の金額。不明な場合は"unknown"
6. 支払方法（paymentMethod）: "現金"、"クレジットカード"など。不明な場合は"unknown"
7. 品目リスト（items）: 配列形式で、各品目には以下を含む
   - 品名（description）
   - 単価（unitPrice）: 数値のみ
   - 勘定科目（accountCategory）: 勘定科目。この品目で最も使われる勘定科目を設定してください。
   - 借方勘定科目（debitAccountCategory）: 借方勘定科目。この品目で最も使われる借方勘定科目を設定してください。
   - 貸方勘定科目（creditAccountCategory）: 貸方勘定科目。この品目で最も使われる貸方勘定科目を設定してください。
   - 税区分（taxCategory）: 税区分。この品目で最も使われる税区分を設定してください。課税8%, 課税10% のいずれかです。分からない場合は 課税10% を設定してください。
   - 数量（quantity）: 数値のみ
   - 金額（amount）: 数値のみ

情報が読み取れない場合は、該当するフィールドに"unknown"を設定してください。
品目リストが読み取れない場合は、空の配列を返してください。

以下の形式で返してください：
{
  "date": "YYYY/MM/DD",
  "vendor": "店舗名",
  "totalAmount": 数値,
  "currency": "JPY",
  "taxAmount": 数値,
  "paymentMethod": "支払方法",
  "items": [
    {
      "description": "品名",
      "accountCategory": "勘定科目",
      "debitAccountCategory": "借方勘定科目",
      "creditAccountCategory": "貸方勘定科目",
      "unitPrice": 数値,
      "quantity": 数値,
      "amount": 数値,
      "taxCategory": "税区分"
    },
    ...
  ]
}

全く項目が読み取れない場合は、以下のJSONを返してください:
{
  "error": "画像から項目を読み取れませんでした。",
}

必ずJSON形式で返してください。説明文や追加コメントは不要です。
マークダウン記法（\`\`\`jsonなど）は使用せず、純粋なJSONオブジェクトのみを返してください。

勘定科目、借方勘定科目、貸方勘定科目が分からない場合や、OCRの読み取りがあまり自信がない場合は、最近追加した仕訳データを参考にしてください。

最近追加した仕訳データ:
"""
${recentJournalData}
"""
`;
}

// 指数バックオフを使用したリトライ関数
async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000,
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      if (retries > maxRetries) {
        throw error;
      }
      const delay = baseDelay * 2 ** (retries - 1);
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからbase64画像データを取得
    const body = await request.json();
    const { image, apiKey: clientApiKey, recentJournalData } = body; // clientApiKey を受け取る

    // APIキーの優先順位: クライアント提供 > 環境変数
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API key is not set.",
        },
        { status: 500 },
      );
    }
    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 },
      );
    }

    // Google Generative AIクライアントの初期化 (APIキーを渡す)
    const genAI = new GoogleGenerativeAI(apiKey);

    // base64データからMIMEタイプとデータ部分を分離
    const [mimeType, base64Data] = image.split(",");

    // Gemini Pro Visionモデルの初期化
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // モデル名を適切なものに修正 (例: gemini-pro-vision)
      safetySettings,
    });

    // 画像データの準備
    const imageData = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType.replace("data:", "").replace(";base64", ""),
      },
    };

    // Gemini APIにリクエスト送信（リトライロジック付き）
    const prompt = receiptOcrPrompt(recentJournalData);
    const result = await retryWithExponentialBackoff(async () => {
      return await model.generateContent([prompt, imageData]);
    });
    const response = await result.response;
    let text = response.text();

    console.log("prompt:", prompt);
    console.log("Raw Gemini response:", text);

    // マークダウンのコードブロック記法を削除（複数のパターンに対応）
    text = text
      .replace(/```json\s*/gi, "") // jsonコードブロック開始
      .replace(/```javascript\s*/gi, "") // javascriptコードブロック開始
      .replace(/```\s*$/g, "") // コードブロック終了
      .replace(/^```$/gm, "") // 単独行のコードブロック
      .trim();

    // レスポンスがJSON形式であることを確認
    try {
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error("Failed to parse Gemini response as JSON:", text);

      // より強力なJSON抽出（最も外側の中括弧で囲まれた部分を抽出）
      try {
        // 最初の{から最後の}までを抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log("Extracted JSON:", extractedJson);

          // 抽出したJSONの検証と修正
          const cleanedJson = extractedJson
            .replace(/,\s*}/g, "}") // 末尾のカンマを削除
            .replace(/,\s*]/g, "]"); // 配列末尾のカンマを削除

          const jsonResponse = JSON.parse(cleanedJson);
          return NextResponse.json(jsonResponse);
        }
      } catch (innerError) {
        console.error("Failed to parse extracted JSON:", innerError);
      }

      // 最後の手段：手動でJSONを構築
      try {
        // 日付の抽出
        const dateMatch = text.match(/"date"\s*:\s*"([^"]+)"/);
        const vendorMatch = text.match(/"vendor"\s*:\s*"([^"]+)"/);
        const totalMatch = text.match(/"totalAmount"\s*:\s*(\d+)/);
        const currencyMatch = text.match(/"currency"\s*:\s*"([^"]+)"/);

        if (dateMatch && vendorMatch && totalMatch) {
          const manualJson = {
            date: dateMatch[1],
            vendor: vendorMatch[1],
            totalAmount: Number.parseInt(totalMatch[1], 10),
            currency: currencyMatch ? currencyMatch[1] : "JPY",
            taxAmount: 0,
            paymentMethod: "unknown",
            items: [],
          };

          return NextResponse.json(manualJson);
        }
      } catch (manualError) {
        console.error("Failed to manually construct JSON:", manualError);
      }

      // JSONパースに失敗した場合は、テキストをそのまま返す
      return NextResponse.json(
        {
          error: "Failed to parse Gemini response as JSON",
          rawResponse: text,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error processing OCR request:", error);
    return NextResponse.json(
      { error: "Failed to process OCR request" },
      { status: 500 },
    );
  }
}
