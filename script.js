import {

  db,
  storage,

  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,

  query,
  orderBy,
  limit,

  ref,
  uploadBytes,
  getDownloadURL

} from "./firebase.js";
// ==========================
// VARIÁVEIS
// ==========================
let questions = [];
let editingId = null;

let currentQuestionIndex = 0;
let score = 0;
let quizFinished = false;
let isLoading = false;

let memoryCards = [];

let firstCard = null;
let secondCard = null;

let lockBoard = false;

let moves = 0;
let matches = 0;

let memoryBuilderCards = [];

let currentMemoryGame = [];

// ==========================
// TROCAR TELAS
// ==========================
window.showScreen = async function(id){

  document
    .querySelectorAll('.screen')
    .forEach(screen=>{
      screen.classList.remove('active');
    });

  document
    .getElementById(id)
    .classList.add('active');

 switch(id){

  case "playQuiz":
    await startQuiz();
    break;

  case "ranking":
    await loadRanking();
    break;

  case "memoryGame":
    await loadMemoryGames();
    break;
}
};

// ==========================
// CARREGAR PERGUNTAS FIREBASE
// ==========================
async function loadQuestions(){

  if(isLoading) return;

  isLoading = true;

  try {

    const querySnapshot =
      await getDocs(
        collection(db, "questions")
      );

    questions = [];

    querySnapshot.forEach((docItem)=>{

      questions.push({
        id: docItem.id,
        ...docItem.data()
      });

    });

    renderQuestions();

  } catch(error){

    console.error(
      "ERRO AO CARREGAR:",
      error
    );

  } finally {

    isLoading = false;
  }
}

// ==========================
// SALVAR PERGUNTA
// ==========================
window.saveQuestion = async function () {

  try {

    // CAMPOS
    const questionText =
      document.getElementById('question').value.trim();

    const a =
      document.getElementById('a').value.trim();

    const b =
      document.getElementById('b').value.trim();

    const c =
      document.getElementById('c').value.trim();

    const d =
      document.getElementById('d').value.trim();

    const correct =
      document.getElementById('correct').value;

    // VALIDAÇÃO
    if(
      !questionText ||
      !a ||
      !b ||
      !c ||
      !d ||
      !correct
    ){
      alert("⚠ Preencha todos os campos");
      return;
    }

    // OBJETO
    let questionData = {

      question: questionText,
      a,
      b,
      c,
      d,
      correct,
      createdAt: new Date()

    };

    // EDITAR
    if(editingId){

      await updateDoc(
        doc(db, "questions", editingId),
        questionData
      );

      alert("✅ Pergunta atualizada!");

      editingId = null;

    } else {

      // NOVA
      await addDoc(
        collection(db, "questions"),
        questionData
      );

      alert("✅ Pergunta salva!");
    }

    clearForm();

    await loadQuestions();

  } catch(error){

    console.error(
      "ERRO AO SALVAR:",
      error
    );
  }
};


window.editQuestion = function(id){

  let q = questions.find(item => item.id === id);

  if(!q) return;

  editingId = id;

  document.getElementById('question').value = q.question;
  document.getElementById('a').value = q.a;
  document.getElementById('b').value = q.b;
  document.getElementById('c').value = q.c;
  document.getElementById('d').value = q.d;
  document.getElementById('correct').value = q.correct;

  alert("✏ Edite a pergunta e clique em salvar.");
};

// ==========================
// RENDER LISTA DE PERGUNTAS
// ==========================
function renderQuestions(){

  let html = "";

  questions.forEach((q)=>{

    html += `
      <div class="question-card">

        <h3>${q.question}</h3>

        <div class="option">A) ${q.a}</div>
        <div class="option">B) ${q.b}</div>
        <div class="option">C) ${q.c}</div>
        <div class="option">D) ${q.d}</div>

        <p style="margin-top:15px;">
          ✅ Correta: ${q.correct}
        </p>

        <div style="margin-top:15px; display:flex; gap:10px;">

  <button class="primary" onclick="editQuestion('${q.id}')">
    ✏ Editar
  </button>

  <button class="primary" onclick="deleteQuestion('${q.id}')">
    🗑 Excluir
  </button>

</div>

      </div>
    `;
  });

  document.getElementById('questions').innerHTML = html;
}

// ==========================
// DELETAR PERGUNTA
// ==========================
window.deleteQuestion = async function(id){

  try {

    await deleteDoc(doc(db, "questions", id));

    loadQuestions();

  } catch(error){

    console.error("ERRO AO DELETAR:", error);
  }
};

// ==========================
// LIMPAR FORMULÁRIO
// ==========================
function clearForm(){

  document.getElementById('question').value = "";
  document.getElementById('a').value = "";
  document.getElementById('b').value = "";
  document.getElementById('c').value = "";
  document.getElementById('d').value = "";
  document.getElementById('correct').value = "";
}

// ==========================
// IA FAKE
// ==========================
window.generateAIQuestion = function(){

  let theme = document.getElementById('theme').value;

  let question = `
    <div class="question-card">

      <h3>Pergunta sobre ${theme}</h3>

      <div class="option">Opção A</div>
      <div class="option">Opção B</div>
      <div class="option">Opção C</div>
      <div class="option">Opção D</div>

    </div>
  `;

  document.getElementById('aiResult').innerHTML = question;
};

// ==========================
// INICIAR QUIZ
// ==========================
window.startQuiz = async function(){

  const playerName = localStorage.getItem("playerName") || "Jogador";

  if(!playerName){

    alert("⚠ Digite seu nome");

    return;
  }

  // salvar localmente
  localStorage.setItem(
    "playerName",
    playerName
  );

  currentQuestionIndex = 0;

  score = 0;

  quizFinished = false;

  await loadQuestions();

  renderQuiz();
};

// ==========================
// RENDER QUIZ
// ==========================
function renderQuiz(){

  const container = document.getElementById('quizContainer');

  if(!container) return;

  // sem perguntas
  if(questions.length === 0){

    container.innerHTML = `
      <div class="question-card">
        <h2>⚠ Nenhuma pergunta cadastrada.</h2>
      </div>
    `;

    return;
  }

  // quiz finalizado
  if(currentQuestionIndex >= questions.length){
    quizFinished = true;

    saveResult();

    container.innerHTML = `
      <div class="question-card">

        <h2>🏆 Quiz Finalizado!</h2>

        <p>
          Sua pontuação:
          <strong>${score}/${questions.length}</strong>
        </p>

        <button class="primary" onclick="startQuiz()">
          Jogar Novamente
        </button>

      </div>
    `;

    return;
  }

  let q = questions[currentQuestionIndex];

const progress =
  ((currentQuestionIndex + 1)
  / questions.length) * 100;

  container.innerHTML = `

    <div class="question-card">

    <div class="progress-container">

  <div
    class="progress-bar"
    style="width:${progress}%"
  ></div>

</div>

      <h2>${q.question}</h2>

      <button class="option" onclick="answerQuestion('A')">
        A) ${q.a}
      </button>

      <button class="option" onclick="answerQuestion('B')">
        B) ${q.b}
      </button>

      <button class="option" onclick="answerQuestion('C')">
        C) ${q.c}
      </button>

      <button class="option" onclick="answerQuestion('D')">
        D) ${q.d}
      </button>

      <p style="margin-top:20px;">
        Pergunta ${currentQuestionIndex + 1}
        de ${questions.length}
      </p>

    </div>
  `;
}

// ==========================
// RESPONDER
// ==========================
window.answerQuestion = function(answer){

  if(quizFinished) return;

  const q = questions[currentQuestionIndex];

  const buttons =
    document.querySelectorAll(".option");

  buttons.forEach(btn=>{
    btn.disabled = true;
  });

  buttons.forEach(btn=>{

    const text = btn.innerText;

    if(text.startsWith(q.correct)){

      btn.classList.add("correct");
    }

    if(text.startsWith(answer)
      && answer !== q.correct){

      btn.classList.add("wrong");
    }
  });

  if(answer === q.correct){
    score++;
  }

  setTimeout(()=>{

    currentQuestionIndex++;

    renderQuiz();

  },1500);
};
async function saveResult(){

  try {

    const playerName =
      localStorage.getItem("playerName")
      || "Jogador";

    await addDoc(
      collection(db, "quiz_results"),
      {
        playerName,
        score,
        total: questions.length,
        createdAt: new Date()
      }
    );

  } catch(error){

    console.error(
      "ERRO AO SALVAR RESULTADO:",
      error
    );
  }
}

async function loadRanking(){

  const rankingDiv =
    document.getElementById("rankingList");

  if(!rankingDiv) return;

  try {

    const q = query(
      collection(db, "quiz_results"),
      orderBy("score", "desc"),
      limit(10)
    );

    const querySnapshot =
      await getDocs(q);

    let html = "";

    querySnapshot.forEach((docItem)=>{

      const player = docItem.data();

      html += `
        <div class="ranking-item">

          <h3>
            ${player.playerName}
          </h3>

          <span>
            ${player.score}/${player.total}
          </span>

        </div>
      `;
    });

    rankingDiv.innerHTML = html;

  } catch(error){

    console.error(
      "ERRO RANKING:",
      error
    );
  }
}

window.addEventListener("load", ()=>{

  const savedName =
    localStorage.getItem("playerName");

  if(savedName){

    document.getElementById(
      "playerName"
    ).value = savedName;
  }
});


function renderMemoryGame(){

  const grid =
    document.getElementById("memoryGrid");

  grid.innerHTML = "";

  moves = 0;
  matches = 0;

  document.getElementById(
    "memoryInfo"
  ).innerHTML = `
    <p>Movimentos: 0</p>
  `;

  memoryCards.forEach((emoji,index)=>{

    const card =
      document.createElement("div");

    card.className = "memory-card";

    card.dataset.index = index;

    card.dataset.emoji = emoji;

    card.innerHTML = "?";

    card.onclick =
      ()=> flipCard(card);

    grid.appendChild(card);
  });
}

function flipCard(card){

  if(lockBoard) return;

  if(card === firstCard) return;

  card.innerHTML =
    card.dataset.emoji;

  card.classList.add("flipped");

  if(!firstCard){

    firstCard = card;

    return;
  }

  secondCard = card;

  lockBoard = true;

  checkMatch();
}

function checkMatch(){

  const isMatch =
    firstCard.dataset.emoji ===
    secondCard.dataset.emoji;

  moves++;

  updateMemoryInfo();

  if(isMatch){

    matches++;

    resetBoard();

    checkVictory();

  } else {

    setTimeout(()=>{

      firstCard.innerHTML = "?";
      secondCard.innerHTML = "?";

      firstCard.classList.remove(
        "flipped"
      );

      secondCard.classList.remove(
        "flipped"
      );

      resetBoard();

    }, 1000);
  }
}

function resetBoard(){

  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function updateMemoryInfo(){

  document.getElementById(
    "memoryInfo"
  ).innerHTML = `
    <p>Movimentos: ${moves}</p>
  `;
}

function checkVictory(){

  if(matches === memoryCards.length / 2){

    setTimeout(()=>{

      alert(
        `🏆 Você venceu em ${moves} movimentos!`
      );

    }, 300);
  }
}

console.log("🚀 SCRIPT INICIADO");

console.log("ANTES ADD MEMORY");

window.addMemoryCard = async function(){

  console.log("🟢 CLICOU BOTÃO ADD MEMORY");

  if(window.location.protocol === "file:"){
    alert("⚠ Abra o projeto via servidor local (http://) para funcionar com Firebase.");
    return;
  }

  const inputFile =
    document.getElementById("memoryImage");

  console.log("📁 INPUT FILE:", inputFile);

  if(!inputFile){

    console.error("❌ INPUT #memoryImage NÃO EXISTE");

    alert("Campo de imagem não encontrado");

    return;
  }

  const file = inputFile.files?.[0];

  console.log("📷 ARQUIVO:", file);

  if(!file){

    console.warn("⚠ Nenhum arquivo selecionado");

    alert("Selecione uma imagem");

    return;
  }

  try {

    console.log("⬆ INICIANDO UPLOAD");

    const fileName =
      `memory/${Date.now()}_${file.name}`;

    console.log("📄 NOME ARQUIVO:", fileName);

    const storageRef =
      ref(storage, fileName);

    console.log("🗂 STORAGE REF:", storageRef);

    const uploadResult =
      await uploadBytes(
        storageRef,
        file
      );

    console.log(
      "✅ UPLOAD CONCLUÍDO:",
      uploadResult
    );

    const imageUrl =
      await getDownloadURL(
        uploadResult.ref || storageRef
      );

    console.log(
      "🌎 URL IMAGEM:",
      imageUrl
    );

    memoryBuilderCards.push(imageUrl, imageUrl);

    console.log(
      "🧠 CARDS ARRAY:",
      memoryBuilderCards
    );

    renderMemoryPreview();

    inputFile.value = "";

    console.log("✅ PREVIEW RENDERIZADO");

    alert("✅ Imagem adicionada!");

  } catch(error){

    console.error(
      "❌ ERRO UPLOAD:",
      error
    );

    alert(
      "Erro upload imagem: " +
      (error.code ? `${error.code} - ` : "") +
      (error.message || error.toString())
    );
  }
};

function renderMemoryPreview(){

  console.log(
    "🖼 RENDER MEMORY PREVIEW"
  );

  let html = "";

  memoryBuilderCards.forEach((card,index)=>{

    console.log(
      "CARD:",
      index,
      card
    );

    html += `

      <div class="memory-preview-card">

        <img
          src="${card}"
          class="memory-preview-image"
        >

        <button
          class="delete-card-btn"
          onclick="removeMemoryCard(${index})"
        >
          ✖
        </button>

      </div>
    `;
  });

  const preview =
    document.getElementById(
      "memoryPreview"
    );

  console.log(
    "DIV PREVIEW:",
    preview
  );

  if(!preview){

    console.error(
      "❌ #memoryPreview NÃO EXISTE"
    );

    return;
  }

  preview.innerHTML = html;

  console.log(
    "✅ HTML PREVIEW INSERIDO"
  );
}

window.saveMemoryGame = async function(){

  console.log("💾 SALVAR JOGO");

  const title =
    document
      .getElementById("memoryTitle")
      .value
      .trim();

  console.log("📌 TÍTULO:", title);

  console.log(
    "🧠 TOTAL CARDS:",
    memoryBuilderCards.length
  );

  if(!title){

    alert("Digite nome do jogo");

    return;
  }

  if(memoryBuilderCards.length < 2){

    alert("Adicione cartas");

    return;
  }

  try {

    console.log("🔥 ENVIANDO FIRESTORE");

    const result =
      await addDoc(
        collection(db, "memory_games"),
        {
          title,
          cards: memoryBuilderCards,
          createdAt: new Date()
        }
      );

    console.log(
      "✅ FIRESTORE OK:",
      result
    );

    alert("✅ Jogo salvo!");

    memoryBuilderCards = [];

    renderMemoryPreview();

    loadMemoryGames();

  } catch(error){

    console.error(
      "❌ ERRO SAVE GAME:",
      error
    );

    alert(
      "Erro ao salvar: " +
      error.message
    );
  }
};

async function loadMemoryGames(){

  console.log("📥 LOAD MEMORY GAMES");

  const container =
    document.getElementById(
      "memoryGamesList"
    );

  console.log(
    "CONTAINER:",
    container
  );

  if(!container){

    console.error(
      "❌ memoryGamesList NÃO EXISTE"
    );

    return;
  }

  try {

    const querySnapshot =
      await getDocs(
        collection(db, "memory_games")
      );

    console.log(
      "📦 TOTAL JOGOS:",
      querySnapshot.size
    );

    let html = "";

    querySnapshot.forEach((docItem)=>{

      console.log(
        "🎮 GAME:",
        docItem.id,
        docItem.data()
      );

      const game = docItem.data();

      html += `

        <div class="question-card">

          <h3>${game.title}</h3>

          <div
            style="
              display:flex;
              gap:10px;
              margin-top:15px;
            "
          >

            <button
              class="primary"
              onclick="playMemoryGame(
                '${docItem.id}'
              )"
            >
              ▶ Jogar
            </button>

            <button
              class="primary"
              onclick="deleteMemoryGame(
                '${docItem.id}'
              )"
            >
              🗑 Excluir
            </button>

          </div>

        </div>
      `;
    });

    container.innerHTML = html;

    console.log("✅ LISTA RENDERIZADA");

  } catch(error){

    console.error(
      "❌ ERRO LOAD GAMES:",
      error
    );
  }
}

function shuffleArray(array){

  console.log(
    "🔀 SHUFFLE ARRAY"
  );

  return [...array].sort(
    () => Math.random() - 0.5
  );
}

window.playMemoryGame = async function(id){

  console.log(
    "🎮 PLAY GAME:",
    id
  );

  const querySnapshot =
    await getDocs(
      collection(db, "memory_games")
    );

  querySnapshot.forEach((docItem)=>{

    if(docItem.id === id){

      console.log(
        "✅ GAME ENCONTRADO"
      );

      currentMemoryGame =
        shuffleArray(
          docItem.data().cards
        );

      console.log(
        "🧠 CARDS GAME:",
        currentMemoryGame
      );

      renderMemoryBoard();
    }
  });
};

function renderMemoryBoard(){

  console.log(
    "🧩 RENDER MEMORY BOARD"
  );

  const grid =
    document.getElementById(
      "memoryGrid"
    );

  console.log("GRID:", grid);

  if(!grid){

    console.error(
      "❌ memoryGrid NÃO EXISTE"
    );

    return;
  }

  grid.innerHTML = "";

  firstCard = null;
  secondCard = null;

  lockBoard = false;

  moves = 0;
  matches = 0;

  currentMemoryGame.forEach((imageUrl,index)=>{

    console.log(
      "🖼 CARD:",
      index,
      imageUrl
    );

    const card =
      document.createElement("div");

    card.className = "memory-card";

    card.dataset.image = imageUrl;

    card.dataset.index = index;

    card.innerHTML = `
      <div class="memory-inner">

        <div class="memory-front">
          ?
        </div>

        <div class="memory-back">
          <img
            src="${imageUrl}"
            class="memory-image"
          >
        </div>

      </div>
    `;

    card.onclick =
      ()=> flipMemoryCard(card);

    grid.appendChild(card);
  });

  console.log(
    "✅ BOARD RENDERIZADO"
  );
}

window.removeMemoryCard = function(index){

  console.log(
    "🗑 REMOVER CARD:",
    index
  );

  memoryBuilderCards =
    memoryBuilderCards.filter(
      (_, i) => i !== index
    );

  console.log(
    "🧠 ARRAY ATUAL:",
    memoryBuilderCards
  );

  renderMemoryPreview();
};

window.deleteMemoryGame =
async function(id){

  console.log(
    "🗑 DELETE GAME:",
    id
  );

  const confirmDelete =
    confirm(
      "Deseja excluir o jogo?"
    );

  if(!confirmDelete) return;

  try {

    await deleteDoc(
      doc(db, "memory_games", id)
    );

    console.log(
      "✅ GAME EXCLUÍDO"
    );

    alert("🗑 Jogo excluído");

    loadMemoryGames();

  } catch(error){

    console.error(
      "❌ ERRO DELETE:",
      error
    );
  }
};

function flipMemoryCard(card){

  console.log(
    "🃏 FLIP CARD"
  );

  if(lockBoard) return;

  if(card === firstCard) return;

  card.classList.add("flipped");

  if(!firstCard){

    firstCard = card;

    console.log(
      "1️⃣ PRIMEIRA CARTA"
    );

    return;
  }

  secondCard = card;

  lockBoard = true;

  const isMatch =

    firstCard.dataset.image ===
    secondCard.dataset.image;

  console.log(
    "🎯 MATCH:",
    isMatch
  );

  moves++;

  if(isMatch){

    matches++;

    console.log(
      "✅ MATCHES:",
      matches
    );

    resetMemoryBoard();

    if(
      matches ===
      currentMemoryGame.length / 2
    ){

      setTimeout(()=>{

        alert(
          `🏆 Você venceu em ${moves} movimentos!`
        );

      },300);
    }

  } else {

    setTimeout(()=>{

      firstCard.classList.remove(
        "flipped"
      );

      secondCard.classList.remove(
        "flipped"
      );

      resetMemoryBoard();

    },1000);
  }
}

function resetMemoryBoard(){

  console.log(
    "🔄 RESET BOARD"
  );

  firstCard = null;
  secondCard = null;

  lockBoard = false;
}

loadMemoryGames();

console.log("✅ SCRIPT FINALIZADO");

console.log(
  "FUNÇÃO ADD:",
  window.addMemoryCard
);

async function loadQuizzesList() {
  const container = document.getElementById("quizList");

  const snapshot = await getDocs(collection(db, "quizzes"));

  let html = "";

  snapshot.forEach(docItem => {
    const quiz = docItem.data();

    html += `
      <div class="question-card">
        <h3>${quiz.title}</h3>

        <button class="primary"
          onclick="selectQuiz('${docItem.id}')">
          ▶ Jogar
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.selectQuiz = async function(quizId) {

  const quizDoc = await getDocs(collection(db, "quizzes"));

  let selectedQuiz = null;

  quizDoc.forEach(docItem => {
    if (docItem.id === quizId) {
      selectedQuiz = docItem.data();
    }
  });

  if (!selectedQuiz) return;

  // salva quiz atual
  window.currentQuiz = selectedQuiz;

  await loadQuestionsByQuiz(selectedQuiz.questions);

  currentQuestionIndex = 0;
  score = 0;

  renderQuiz();
};

async function loadQuestionsByQuiz(questionIds) {

  const snapshot = await getDocs(collection(db, "questions"));

  questions = [];

  snapshot.forEach(docItem => {

    if (questionIds.includes(docItem.id)) {
      questions.push({
        id: docItem.id,
        ...docItem.data()
      });
    }

  });
}