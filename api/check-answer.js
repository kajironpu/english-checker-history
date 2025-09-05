// api/check-answer.js
const { OpenAI } = require('openai');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const baseURL = "https://models.inference.ai.azure.com";
  const modelName = "Phi-3-medium";

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: "GITHUB_TOKEN が設定されていません" });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "無効なJSON", details: e.message });
  }

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
    const openai = new OpenAI({
      baseURL,
      apiKey: GITHUB_TOKEN,
    });

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "中学生向けに分かりやすく、歴史の先生として答え合わせと解説をしてください。" 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    const result = response.choices[0].message.content;

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
    console.error("AIエラー:", err);
    
    if (err.status === 401) {
      return res.status(401).json({ error: "認証エラー", message: "トークンが無効です" });
    }
    
    return res.status(500).json({ 
      error: "AI呼び出し失敗", 
      message: err.message 
    });
  }
};
