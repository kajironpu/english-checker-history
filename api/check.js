export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const MODEL_NAME = "mistral-ai/mistral-medium-2505";

  const { userText, currentProblem } = req.body;

  const prompt = `あなたは中学生向けの英語添削AIです。
添削後: <自然で文法的に正しい英文>
スコア: <0-100>
アドバイス: <改善点を日本語で丁寧に、中学生向けに分かりやすく200文字程度で>
問題の日本語文: "${currentProblem}"
ユーザーの英文: "${userText}"`;

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
          { role: "system", content: "中学生向けにわかりやすく添削してください。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();

    // --- ここで result を抽出 ---
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    res.status(200).json({ result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}