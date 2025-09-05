// --- 問題リスト ---
let problems = [];
let currentProblem = "";

// --- CSVを読み込み ---
async function loadProblems() {
  try {
    const response = await fetch("problems.csv");
    if (!response.ok) throw new Error("CSVファイルを読み込めませんでした");
    const text = await response.text();
    problems = text.split("\n").map(line => line.trim()).filter(line => line);
    showProblem();
  } catch (err) {
    console.error("問題読み込みエラー:", err);
    document.getElementById("problem").textContent = "問題を読み込めませんでした。";
  }
}

// --- 問題表示 ---
function showProblem() {
  if (problems.length === 0) {
    document.getElementById("problem").textContent = "問題がありません。";
    return;
  }
  const idx = Math.floor(Math.random() * problems.length);
  currentProblem = problems[idx];
  document.getElementById("problem").textContent = currentProblem;
  document.getElementById("userAnswer").value = "";
  clearResult();
}

// --- 結果クリア ---
function clearResult() {
  document.getElementById("corrected").textContent = "";
  document.getElementById("score").textContent = "";
  document.getElementById("advice").textContent = "";
}

// --- 音声入力 ---
function setupVoiceInput() {
  const voiceBtn = document.getElementById("voiceInputBtn");
  if (!voiceBtn) return;
  
  voiceBtn.addEventListener("click", () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("音声入力はこのブラウザでサポートされていません (Chrome推奨)");
      return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onresult = (event) => {
      let transcript = event.results[0][0].transcript.trim();
      if (transcript.length > 0) {
        // 先頭文字を自動で大文字化
        transcript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
      }
      document.getElementById("userAnswer").value = transcript;
    };
    
    recognition.onerror = (event) => {
      alert("音声入力エラー: " + event.error);
    };
    
    recognition.start();
  });
}

// --- 添削処理 ---
async function checkAnswer() {
  const userText = document.getElementById("userAnswer").value.trim();
  if (!userText) {
    alert("英文を入力してください");
    return;
  }
  
  const checkBtn = document.getElementById("checkBtn");
  checkBtn.disabled = true;
  checkBtn.textContent = "添削中...";
  
  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userText, currentProblem })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }
    
    const data = await response.json();
    // 修正: APIレスポンス構造に合わせる
    const resultText = data.result || "";
    
    // --- 正規表現で抽出 ---
    const correctedMatch = resultText.match(/添削後[:：]\s*(.*)/i);
    const scoreMatch = resultText.match(/スコア[:：]\s*(\d+)/i);
    const adviceMatch = resultText.match(/アドバイス[:：]\s*([\s\S]*)/i);
    
    const corrected = correctedMatch ? correctedMatch[1].trim() : "";
    const score = scoreMatch ? scoreMatch[1].trim() : "";
    const advice = adviceMatch ? adviceMatch[1].trim() : "";
    
    document.getElementById("corrected").textContent = corrected;
    document.getElementById("score").textContent = score ? score + " / 100" : "";
    document.getElementById("advice").textContent = advice;
    
    // --- 自動読み上げ ---
    if (corrected) {
      const utter = new SpeechSynthesisUtterance(corrected);
      utter.lang = "en-US";
      speechSynthesis.speak(utter);
    }
    
  } catch (e) {
    alert("添削エラー: " + e.message);
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "添削する";
  }
}

// --- ボタンイベント ---
document.getElementById("checkBtn").addEventListener("click", checkAnswer);
document.getElementById("nextBtn").addEventListener("click", showProblem);

// --- 初期化 ---
document.addEventListener("DOMContentLoaded", () => {
  loadProblems();
  setupVoiceInput();
});