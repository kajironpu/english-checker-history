// api/check-answer.js

export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const MODEL_NAME = "mistral-ai/mistral-medium-2505";

  const { userText, question, correctAnswer } = req.body;

  // 修正されたAIへのプロンプトを定義
  const prompt = `あなたは歴史の先生です。以下の一問一答クイズの答え合わせと解説をしてください。
回答は日本語で、以下の形式でお願いします。
正誤: <正解または不正解>
解説: <正解の場合、簡潔な褒め言葉と追加情報。不正解の場合、直後に「正解は「${correctAnswer}」です。」という文を入れ、その後で丁寧な解説を100文字程度で>

問題: ${question}
あなたの答え: ${userText}
正解: ${correctAnswer}
`;

  try {
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "中学生向けに分かりやすく、歴史の先生として答え合わせと解説をしてください。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    const correctnessMatch = result.match(/正誤: (.+)/);
    const explanationMatch = result.match(/解説: ([\s\S]+)/);
    
    const correctness = correctnessMatch ? correctnessMatch[1].trim() : "";
    const explanation = explanationMatch ? explanationMatch[1].trim() : "";

    res.status(200).json({ correctness, explanation });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
