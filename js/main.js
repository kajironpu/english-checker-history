// public/js/main.js

// --- 問題と答えを保持する変数 ---
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
    // APIを呼び出して、AIにクイズを生成させる
    const response = await fetch("/api/generate-quiz"); 
    if (!response.ok) {
      throw new Error("APIからクイズを取得できませんでした。");
    }
    const data = await response.json();
    currentQuiz = data; // 問題と答えを保存

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
  if (resultEl) {
    resultEl.textContent = "";
  }
}

// --- 回答チェック処理 ---
function checkAnswer() {
  const userText = document.getElementById("userAnswer").value.trim();
  const resultEl = document.getElementById("result");
  
  if (!userText) {
    alert("答えを入力してください。");
    return;
  }

  // ユーザーの答えと正解を比較
  if (userText.toLowerCase() === currentQuiz.answer.toLowerCase()) {
    resultEl.textContent = "⭕️ 正解です！";
    resultEl.style.color = "green";
  } else {
    resultEl.textContent = `❌ 不正解です。正解は「${currentQuiz.answer}」でした。`;
    resultEl.style.color = "red";
  }
}

// --- ボタンイベント ---
document.getElementById("checkBtn").addEventListener("click", checkAnswer);
document.getElementById("nextBtn").addEventListener("click", loadQuiz);

// --- 初期化 ---
document.addEventListener("DOMContentLoaded", () => {
  loadQuiz();
});
