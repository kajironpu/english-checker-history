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
    if (!response.ok) throw new Error("CSVファイルを読み込めませんでした");
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
    }).filter(p => p);
    loadQuiz();
  } catch (err) {
    console.error("問題読み込みエラー:", err);
    document.getElementById("problem").textContent = "問題を読み込めませんでした。";
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
  if (resultEl) resultEl.textContent = "判定中...";
  if (explanationEl) explanationEl.textContent = "";

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
    if (resultEl) {
      resultEl.textContent = correctness;
      resultEl.style.color = correctness.includes('正解') ? 'green' : 'red';
    }
    if (explanationEl) {
      explanationEl.textContent = explanation;
    }

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
  loadProblems();
});
