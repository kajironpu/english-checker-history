// api/check-answer.js
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  
  // 環境変数チェック
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN is not set');
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  const endpoint = "https://models.inference.ai.azure.com";
  const modelName = "microsoft/Phi-4";
  
  const { userText, question, correctAnswer } = req.body;

  // リクエストボディのバリデーション
  if (!userText || !question || !correctAnswer) {
    return res.status(400).json({ 
      error: 'Missing required fields: userText, question, correctAnswer' 
    });
  }

  const prompt = `あなたは歴史の先生です。以下の一問一答クイズの答え合わせと解説をしてください。
回答は日本語で、以下の形式でお願いします。
正誤: <正解または不正解>
解説: <正解の場合、簡潔な褒め言葉と追加情報。不正解の場合、直後に「正解は「${correctAnswer}」です。」という文を入れ、その後で丁寧な解説を100文字程度で>

問題: ${question}
あなたの答え: ${userText}
正解: ${correctAnswer}
`;

  try {
    console.log('Creating client with endpoint:', endpoint);
    const client = ModelClient(endpoint, new AzureKeyCredential(GITHUB_TOKEN));
    
    console.log('Sending request to model:', modelName);
    const response = await client.path("/chat/completions").post({
      body: {
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "中学生向けに分かりやすく、歴史の先生として答え合わせと解説をしてください。" 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.5,
        max_tokens: 300,
        top_p: 0.9
      }
    });

    console.log('Response status:', response.status);
    
    if (isUnexpected(response)) {
      console.error('Unexpected response:', response.body);
      return res.status(500).json({ 
        error: 'API request failed', 
        details: response.body?.error || 'Unknown error' 
      });
    }

    if (!response.body) {
      console.error('No response body');
      return res.status(500).json({ error: 'No response from API' });
    }

    const result = response.body.choices?.[0]?.message?.content?.trim() || "";
    
    console.log('AI Response:', result);

    if (!result) {
      return res.status(500).json({ error: 'Empty response from AI model' });
    }

    // より柔軟な正規表現パターン
    const correctnessMatch = result.match(/正誤\s*[:：]\s*(.+)/);
    const explanationMatch = result.match(/解説\s*[:：]\s*([\s\S]+)/);
    
    const correctness = correctnessMatch ? correctnessMatch[1].trim() : "";
    const explanation = explanationMatch ? explanationMatch[1].trim() : result;

    res.status(200).json({ 
      correctness: correctness || "判定不明", 
      explanation: explanation || result,
      rawResponse: result // デバッグ用
    });

  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
