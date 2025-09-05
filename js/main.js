// public/js/main.js

let currentQuiz = {
  question: "",
  answer: ""
};

// --- APIから問題を読み込む ---
async function loadQuiz() {
  const nextBtn = document.getElementById("nextBtn");
  const problemEl = document.getElementById("problem");
  nextBtn.disabled = true;
  problemEl.textContent = "問題を読み込み中...";

  try {
    const response = await fetch("/api/generate-quiz"); 
    if (!response.ok) {
      throw new Error("APIからクイズを取得できませんでした。");
    }
    const data = await response.json();
    currentQuiz = data;
    problemEl.textContent = currentQuiz.question;
    document.getElementById("userAnswer").value = "";
    clearResult();
  } catch (err) {
    console.error("クイズ読み込みエラー:", err);
    problemEl.textContent = "問題を読み込めませんでした。";
  } finally {
    nextBtn.disabled = false;
  }
}

// --- 結果クリア ---
function clearResult() {
  const resultEl = document.getElementById("result");
  const explanationEl = document.getElementById("explanation");
  if (resultEl) resultEl.textContent = "";
  if (explanationEl) explanationEl.textContent = "";
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

  checkBtn.disabled = true;
  checkBtn.textContent = "判定中...";
  resultEl.textContent = "判定中...";
  explanationEl.textContent = "";

  try {
    // 答え合わせAPIを呼び出し、ユーザーの回答と正解を送信
    const response = await fetch("/api/check-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userText: userText,
        question: currentQuiz.question,
        correctAnswer: currentQuiz.answer
      })
    });
    
    if (!response.ok) {
      throw new Error("答え合わせAPIでエラーが発生しました。");
    }

    const data = await response.json();
    const { correctness, explanation } = data;

    // 結果と解説を表示
    resultEl.textContent = correctness;
    resultEl.style.color = correctness.includes('正解') ? 'green' : 'red';
    explanationEl.textContent = explanation;

  } catch (e) {
    alert("答え合わせエラー: " + e.message);
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "答え合わせ";
  }
}

// --- ボタンイベント ---
document.getElementById("checkBtn").addEventListener("click", checkAnswer);
document.getElementById("nextBtn").addEventListener("click", loadQuiz);

// --- 初期化 ---
document.addEventListener("DOMContentLoaded", () => {
  loadQuiz();
});
