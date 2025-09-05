// --- 問題例 ---
const problems = [
  "昨日、友達と映画を見に行きました。",
  "私は毎朝7時に起きます。",
  "来週の土曜日にピクニックに行く予定です。",
  "昨日のテストはとても難しかったです。",
  "夏休みに海で泳ぎました。"
];

let currentProblem = "";

// --- 問題表示 ---
function showProblem(){
  const idx = Math.floor(Math.random()*problems.length);
  currentProblem = problems[idx];
  document.getElementById('problem').textContent = currentProblem;
  document.getElementById('userAnswer').value = "";
  clearResult();
}

function clearResult(){
  document.getElementById('corrected').textContent = "";
  document.getElementById('score').textContent = "";
  document.getElementById('advice').textContent = "";
}

// --- 音声入力 ---
document.getElementById('voiceInputBtn').addEventListener('click', ()=>{
  if(!('webkitSpeechRecognition' in window)){
    alert('音声入力はこのブラウザでサポートされていません');
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = function(event){
    document.getElementById('userAnswer').value = event.results[0][0].transcript;
  }
  recognition.onerror = function(event){
    alert('音声入力エラー: ' + event.error);
  }

  recognition.start();
});

// --- 添削処理 ---
async function checkAnswer(){
  const userText = document.getElementById('userAnswer').value.trim();
  if(!userText){ alert('英文を入力してください'); return; }

  try{
    const checkBtn = document.getElementById('checkBtn');
    checkBtn.disabled = true;
    checkBtn.textContent = '添削中...';

    // --- サーバー関数経由で呼び出す ---
    const response = await fetch('/api/check', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userText, currentProblem })
    });

    if(!response.ok){
      const errData = await response.json();
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.result;

    // --- 正規表現で抽出 ---
    const correctedMatch = resultText.match(/添削後[:：]\s*(.*)/i);
    const scoreMatch = resultText.match(/スコア[:：]\s*(\d+)/i);
    const adviceMatch = resultText.match(/アドバイス[:：]\s*([\s\S]*)/i);

    document.getElementById('corrected').textContent = correctedMatch ? correctedMatch[1].trim() : "";
    document.getElementById('score').textContent = scoreMatch ? scoreMatch[1].trim() + " / 100" : "";
    document.getElementById('advice').textContent = adviceMatch ? adviceMatch[1].trim() : "";

  } catch(e){
    alert('添削エラー: '+e.message);
  } finally{
    document.getElementById('checkBtn').disabled = false;
    document.getElementById('checkBtn').textContent = '添削する';
  }
}

// --- 音声読み上げ ---
document.getElementById('readBtn').addEventListener('click', ()=>{
  const text = document.getElementById('corrected').innerText;
  if(!text){ alert('読み上げるテキストがありません'); return; }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  speechSynthesis.speak(utter);
});

// --- ボタンイベント ---
document.getElementById('checkBtn').addEventListener('click', checkAnswer);
document.getElementById('nextBtn').addEventListener('click', showProblem);

// --- 初期表示 ---
document.addEventListener('DOMContentLoaded', showProblem);
