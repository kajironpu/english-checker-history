import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { userText, currentProblem } = req.body;
  if (!userText || !currentProblem) return res.status(400).send("Missing input");

  const token = process.env.GITHUB_TOKEN; // ← Vercel の環境変数
  const MODEL_NAME = "mistral-ai/mistral-medium-2505";

  const prompt = `あなたは中学生向けの英語添削AIです。
必ず次の形式で答えてください：
添削後: <自然で文法的に正しい英文>
スコア: <0-100の整数>
アドバイス: <改善点を日本語で丁寧に、中学生向けに分かりやすく200文字程度で>
問題の日本語文: "${currentProblem}"
ユーザーの英文: "${userText}"`;

  try {
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
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
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ result: data.choices[0].message.content });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
