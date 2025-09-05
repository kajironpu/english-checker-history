

// api/check-answer.js

const { ModelClient, isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

module.exports = async function (req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const endpoint = "https://models.github.ai/inference";
  const modelName = "microsoft/Phi-4";

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: "GITHUB_TOKEN が設定されていません" });
  }

  let body;
  try {
    body = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: "無効なJSON" });
  }

  const { userText, question, correctAnswer } = body;

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
    const client = new ModelClient(endpoint, new AzureKeyCredential(GITHUB_TOKEN));

    const response = await client.path("/chat/completions").post({
      body: {
        model: modelName,
        messages: [
          { role: "system", content: "中学生向けに分かりやすく、歴史の先生として答え合わせと解説をしてください。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      }
    });

    if (isUnexpected(response)) {
      return res.status(500).json({ 
        error: "モデル呼び出しエラー",
        details: response.body?.error?.message 
      });
    }

    const result = response.body.choices?.[0]?.message?.content || "";
    const correctness = result.match(/正誤: (.+)/)?.[1]?.trim() || "判定不能";
    const explanation = result.match(/解説: ([\\s\\S]+)/)?.[1]?.trim() || "解説がありません";

    return res.status(200).json({ correctness, explanation });

  } catch (err) {
    console.error("サーバーエラー:", err);
    return res.status(500).json({ error: "内部エラー", details: err.message });
  }
};
