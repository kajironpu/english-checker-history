// api/check-answer.js
const { AzureAIInferenceClient } = require("@azure/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

module.exports = async function (req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const endpoint = "https://models.inference.ai.azure.com"; // 正しいエンドポイント
  const modelName = "Phi-3-medium";

  // 環境変数チェック
  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN が設定されていません");
    return res.status(500).json({ error: "GITHUB_TOKEN が設定されていません" });
  }

  // リクエストボディの解析
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
  } catch (e) {
    console.error("JSON解析エラー:", e.message);
    return res.status(400).json({ error: "無効なJSON", details: e.message });
  }

  // 必要なフィールドの検証
  const { userText, question, correctAnswer } = body;
  if (!userText || !question || !correctAnswer) {
    return res.status(400).json({ 
      error: "必須フィールドが不足しています",
      required: ["userText", "question", "correctAnswer"]
    });
  }

  const prompt = `
あなたは歴史の先生です。以下の一問一答クイズの答え合わせと解説をしてください。
回答は日本語で、以下の形式でお願いします。
正誤: <正解または不正解>
解説: <正解の場合、簡潔な褒め言葉と追加情報。不正解の場合、直後に「正解は「${correctAnswer}」です。」という文を入れ、その後で丁寧な解説を100文字程度で>

問題: ${question}
あなたの答え: ${userText}
正解: ${correctAnswer}
`;

  try {
    // 新しい SDK でのクライアント作成
    const client = new AzureAIInferenceClient(
      endpoint,
      new AzureKeyCredential(GITHUB_TOKEN)
    );

    console.log("API呼び出し開始:", new Date().toISOString());

    const response = await client.getCompletions({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "中学生向けに分かりやすく、歴史の先生として答え合わせと解説をしてください。" 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      maxTokens: 300
    });

    console.log("API呼び出し完了");

    if (!response.choices || response.choices.length === 0) {
      console.error("空のレスポンス:", response);
      return res.status(500).json({ error: "AIモデルからの応答が空です" });
    }

    const result = response.choices[0].message.content;
    console.log("AI応答:", result);

    // 正誤と解説の抽出
    const correctnessMatch = result.match(/正誤[:：]\s*(.+)/);
    const explanationMatch = result.match(/解説[:：]\s*([\s\S]+)/);
    
    const correctness = correctnessMatch?.[1]?.trim() || "判定不能";
    const explanation = explanationMatch?.[1]?.trim() || "解説がありません";

    return res.status(200).json({ 
      correctness, 
      explanation,
      debug: process.env.NODE_ENV === 'development' ? { rawResponse: result } : undefined
    });

  } catch (err) {
    console.error("サーバーエラー:", err);
    
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
      return res.status(503).json({ 
        error: "ネットワークエラー", 
        message: "APIサーバーに接続できません。" 
      });
    }
    
    if (err.statusCode === 401 || err.status === 401) {
      return res.status(401).json({ 
        error: "認証エラー", 
        message: "GITHUB_TOKENが無効です" 
      });
    }

    return res.status(500).json({ 
      error: "内部エラー", 
      message: err.message,
      code: err.code
    });
  }
};
