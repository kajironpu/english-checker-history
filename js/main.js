// public/js/main.js
// --- 問題と答えを保持する変数 ---
let problems = [];
let currentQuiz = {
  question: "",
  answer: ""
};

// --- CSVを読み込み ---
async function loadProblems() {
  try {
    const response = await fetch("problems.csv");
    if (!response.ok) throw new Error(`CSVファイルを読み込めませんでした (${response.status})`);
    const text = await response.text();
    // CSVをパースして問題と答えのペアを配列に格納
    problems = text.split("\n").map(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        return {
          question: parts[0].trim(),
          answer: parts.slice(1).join(',').trim()
        };
      }
      return null;
    }).filter(p => p && p.question && p.answer);
    
    console.log(`${problems.length}個の問題を読み込みました`);
    loadQuiz();
  } catch (err) {
    console.error("問題読み込みエラー:", err);
    document.getElementById("problem").textContent = "問題を読み込めませんでした: " + err.message;
  }
}

// --- 問題表示 ---
function loadQuiz() {
  const nextBtn = document.getElementById("nextBtn");
  const problemEl = document.getElementById("problem");
  
  if (problems.length === 0) {
    problemEl.textContent = "問題がありません。";
    nextBtn.disabled = true;
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * problems.length);
  currentQuiz = problems[randomIndex];
  
  problemEl.textContent = currentQuiz.question;
  document.getElementById("userAnswer").value = "";
  clearResult();
  nextBtn.disabled = false;
}

// --- 結果クリア ---
function clearResult() {
  const resultEl = document.getElementById("result");
  const explanationEl = document.getElementById("explanation");
  if (resultEl) resultEl.textContent = "";
  if (explanationEl) explanationEl.textContent = "";
}

// --- エラー表示用関数 ---
function showError(message, details = null) {
  const resultEl = document.getElementById("result");
  const explanationEl = document.getElementById("explanation");
  
  if (resultEl) {
    resultEl.textContent = "エラー";
    resultEl.style.color = "red";
  }
  
  if (explanationEl) {
    let errorText = message;
    if (details) {
      errorText += `\n詳細: ${JSON.stringify(details, null, 2)}`;
    }
    explanationEl.textContent = errorText;
    explanationEl.style.whiteSpace = "pre-wrap"; // 改行を保持
  }
  
  console.error("API Error:", message, details);
}

// --- 回答チェック処理 ---
async function checkAnswer() {
  const userText = document.getElementById("userAnswer").value.trim();
  if (!userText) {
    alert("答えを入力してください。");
    return;
  }
  
  const checkBtn = document.getElementById("checkBtn");
  const resultEl = document.getElementById("result");
  const explanationEl = document.getElementById("explanation");
  
  // UI状態をリセット
  checkBtn.disabled = true;
  checkBtn.textContent = "判定中...";
  if (resultEl) {
    resultEl.textContent = "判定中...";
    resultEl.style.color = "black";
  }
  if (explanationEl) {
    explanationEl.textContent = "";
    explanationEl.style.whiteSpace = "normal";
  }
  
  try {
    console.log("API呼び出し開始:", {
      userText,
      question: currentQuiz.question,
      correctAnswer: currentQuiz.answer
    });
    
    // 答え合わせAPIを呼び出し
    const response = await fetch("/api/check-answer", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        userText: userText,
        question: currentQuiz.question,
        correctAnswer: currentQuiz.answer
      })
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    // レスポンステキストを取得
    const responseText = await response.text();
    console.log("Response text:", responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText || "不明なエラー" };
      }
      
      showError(
        `答え合わせAPIでエラーが発生しました (${response.status})`,
        errorData
      );
      return;
    }
    
    // レスポンスをJSONとして解析
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      showError("APIレスポンスの解析に失敗しました", {
        parseError: parseError.message,
        responseText
      });
      return;
    }
    
    console.log("Parsed data:", data);
    
    const { correctness, explanation } = data;
    
    // データの検証
    if (!correctness && !explanation) {
      showError("APIから有効なデータが返されませんでした", data);
      return;
    }
    
    // 結果と解説を表示
    if (resultEl && correctness) {
      resultEl.textContent = correctness;
      resultEl.style.color = correctness.includes('正解') ? 'green' : 'red';
    }
    
    if (explanationEl && explanation) {
      explanationEl.textContent = explanation;
    }
    
    console.log("結果表示完了:", { correctness, explanation });
    
  } catch (error) {
    console.error("Network or unexpected error:", error);
    
    // ネットワークエラーかその他のエラーかを判別
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError("ネットワークエラーが発生しました。インターネット接続を確認してください。", {
        errorType: "NetworkError",
        message: error.message
      });
    } else {
      showError("予期しないエラーが発生しました", {
        errorType: error.constructor.name,
        message: error.message,
        stack: error.stack
      });
    }
  } finally {
    // UI状態を復元
    checkBtn.disabled = false;
    checkBtn.textContent = "答え合わせ";
  }
}

// --- ボタンイベント ---
document.getElementById("checkBtn").addEventListener("click", checkAnswer);
document.getElementById("nextBtn").addEventListener("click", loadQuiz);

// --- 初期化 ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("ページ読み込み完了");
  loadProblems();
});

// --- デバッグ用: グローバル関数 ---
window.debugQuiz = {
  getCurrentQuiz: () => currentQuiz,
  getProblems: () => problems,
  testAPI: async () => {
    const testData = {
      userText: "テスト回答",
      question: "テスト問題",
      correctAnswer: "テスト正解"
    };
    
    try {
      const response = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData)
      });
      
      const text = await response.text();
      console.log("Test API Response:", { status: response.status, text });
      
      if (response.ok) {
        return JSON.parse(text);
      } else {
        throw new Error(`API Error: ${response.status} - ${text}`);
      }
    } catch (error) {
      console.error("Test API Error:", error);
      throw error;
    }
  }
};
