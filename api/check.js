export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const MODEL_NAME = "mistral-ai/mistral-medium-2505"; // 使用するAIモデル名

  // クイズ生成のためのプロンプトを定義
  const prompt = `あなたは歴史の先生です。江戸時代の重要な出来事に関する一問一答問題を1問だけ作成してください。
形式:
問題: <問題文>
答え: <答え>
`;

  try {
    // GitHub AI APIへのリクエスト
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "中学生向けに分かりやすく、歴史の先生としてクイズを作成してください。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7, // 創造性を高めるために温度を調整
        max_tokens: 200 // 応答が長くなりすぎないように調整
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();

    // AIの応答から問題と答えを抽出
    const result = data.choices?.[0]?.message?.content?.trim() || "";
    const lines = result.split('\n').filter(line => line.includes('問題:') || line.includes('答え:'));
    
    let question = "";
    let answer = "";

    lines.forEach(line => {
      if (line.startsWith("問題:")) {
        question = line.replace("問題: ", "").trim();
      } else if (line.startsWith("答え:")) {
        answer = line.replace("答え: ", "").trim();
      }
    });

    if (!question || !answer) {
      throw new Error("AIの応答から問題と答えを抽出できませんでした。");
    }

    // クライアントに問題と答えを返却
    res.status(200).json({ question, answer });

  } catch (err) {
    // エラーハンドリング
    res.status(500).json({ error: err.message });
  }
}
