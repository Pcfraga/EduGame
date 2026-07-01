import {

  db,
  storage,

  collection,
  addDoc,
  getDocs,
  getDoc,
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

let editingBuilderId = null;
let editingBuilderGame = null;
let builderImageQuizFile = null;
let builderGameState = null;

const screenFiles = [
  'screens/dashboard.html',
  'screens/quizBuilder.html',
  'screens/playQuiz.html',
  'screens/gamesHub.html',
  'screens/memoryGame.html',
  'screens/gameBuilder.html',
  'screens/ranking.html',
  'screens/ai.html',
  'screens/associationBuilder.html',
  'screens/associationGame.html'
];

async function loadScreens(){
  const main = document.getElementById('main');
  if(!main) return;

  const fragments = await Promise.all(
    screenFiles.map(async (file) => {
      const response = await fetch(file);
      if(!response.ok) {
        throw new Error(`Falha ao carregar ${file}: ${response.statusText}`);
      }
      return response.text();
    })
  );

  main.innerHTML = fragments.join('\n');
}

// ==========================
// TROCAR TELAS
// ==========================
window.showScreen = async function(id){

  const targetScreen = document.getElementById(id);
  if(!targetScreen){
    console.warn(`Tela não encontrada: ${id}`);
    return;
  }

  document
    .querySelectorAll('.screen')
    .forEach(screen=>{
      screen.classList.remove('active');
    });

  targetScreen.classList.add('active');

 switch(id){

  case "playQuiz":
    loadQuizzesList().catch(error => console.error("ERRO AO CARREGAR QUIZES:", error));
    const playerNameInput = document.getElementById("playerName");
    const savedName = localStorage.getItem("playerName");
    if(playerNameInput && savedName){
      playerNameInput.value = savedName;
    }
    break;

  case "quizBuilder":
    loadSavedQuizzes().catch(error => console.error("ERRO AO CARREGAR QUIZES SALVOS:", error));
    loadQuestions().catch(error => console.error("ERRO AO CARREGAR PERGUNTAS:", error));
    break;

  case "ranking":
    loadRanking().catch(error => console.error("ERRO AO CARREGAR RANKING:", error));
    break;

  case "memoryGame":
    loadMemoryGames().catch(error => console.error("ERRO AO CARREGAR JOGOS DE MEMÓRIA:", error));
    break;

  case "gamesHub":
    loadGameHub().catch(error => console.error("ERRO AO CARREGAR HUB:", error));
    break;

  case "gameBuilder":
    renderBuilderForm();
    loadBuilderGames().catch(error => console.error("ERRO AO CARREGAR JOGOS DO BUILDER:", error));
    break;

  case "associationBuilder":
    loadAssociationList().catch(error => console.error("ERRO AO CARREGAR ASSOCIAÇÕES:", error));
    const pairsContainer = document.getElementById("pairsContainer");
    if(pairsContainer){
      pairsContainer.innerHTML = "";
      addPair();
    }
    break;
}
};

window.renderBuilderForm = function(){
  const type = document.getElementById("builderGameType")?.value;
  const area = document.getElementById("builderFormArea");
  if(!area) return;

  const buttonLabel = editingBuilderId ? "🔄 Atualizar Jogo" : "💾 Salvar Jogo";

  let html = `
    <div class="builder-field-group">
      <label class="builder-field-label" for="builderGameTitle">Nome do jogo</label>
      <input type="text" id="builderGameTitle" placeholder="Nome do jogo" class="builder-input">
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label" for="builderSetupTip">Dica de montagem</label>
      <textarea id="builderSetupTip" class="builder-input builder-textarea" rows="3" placeholder="Exemplo: Use palavras relacionadas ao tema ou deixe uma orientação para o jogador."></textarea>
    </div>
  `;

  switch(type){
    case "dragDrop":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderDragDropInstruction">Instrução do jogo</label>
          <textarea id="builderDragDropInstruction" class="builder-input builder-textarea" rows="4" placeholder="Exemplo: Arraste os tipos de rochas para seus respectivos grupos."></textarea>
        </div>
        <div id="builderDragDropPairs"></div>
        <button type="button" class="primary" onclick="builderAddPair()">➕ Adicionar Par</button>
      `;
      break;

    case "imageQuiz":
      html += `
        <div class="builder-card-section">
          <div class="builder-field-group">
            <label class="builder-field-label" for="builderImageQuizImage">Imagem do quiz</label>
            <input type="text" id="builderImageQuizImage" placeholder="URL da imagem" class="builder-input">
          </div>
          <div class="builder-field-group">
            <label class="builder-field-label" for="builderImageQuizFile">Ou envie uma imagem</label>
            <input type="file" id="builderImageQuizFile" accept="image/*" class="builder-input">
          </div>
        </div>
        <div id="builderImageQuizQuestions"></div>
        <button type="button" class="primary" onclick="builderAddImageQuizQuestion()">➕ Adicionar Pergunta</button>
      `;
      break;

    case "memory":
      html += `
        <div class="builder-card-section">
          <div class="builder-field-group">
            <label class="builder-field-label" for="builderMemoryImage">Imagem da carta</label>
            <input type="file" id="builderMemoryImage" accept="image/*" class="builder-input">
          </div>
          <button type="button" class="primary" onclick="addMemoryCard()">➕ Adicionar Carta</button>
        </div>
        <div id="memoryPreview" class="memory-grid"></div>
      `;
      break;

    case "association":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderAssociationMode">Estilo da associação</label>
          <select id="builderAssociationMode" class="builder-input">
            <option value="lines">Linhas</option>
            <option value="numbers">Números de colunas</option>
          </select>
        </div>
        <div class="builder-field-group">
          <label class="builder-field-label">Pares de associação</label>
          <div id="pairsContainer"></div>
        </div>
        <button type="button" class="primary" onclick="addPair()">➕ Adicionar Par</button>
      `;
      break;

    case "crossword":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderCrosswordSize">Tamanho da grade</label>
          <input type="number" id="builderCrosswordSize" min="8" max="20" value="12" class="builder-input">
        </div>
        <div class="builder-field-group">
          <label class="builder-field-label">Perguntas da cruzada</label>
          <div id="builderCrosswordQuestions"></div>
          <button type="button" class="primary" onclick="builderAddCrosswordEntry()">➕ Adicionar pergunta</button>
        </div>
      `;
      break;

    case "quiz":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label">Perguntas do quiz</label>
          <div id="builderQuizQuestions"></div>
        </div>
        <button type="button" class="primary" onclick="builderAddQuizQuestion()">➕ Adicionar Pergunta</button>
      `;
      break;

    case "completeWord":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderCompleteSentence">Frase com lacuna</label>
          <textarea id="builderCompleteSentence" placeholder="Frase com lacuna usando ___" class="builder-input builder-textarea"></textarea>
        </div>
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderCompleteAnswer">Palavra correta</label>
          <input type="text" id="builderCompleteAnswer" placeholder="Palavra correta" class="builder-input">
        </div>
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderCompleteHint">Dica</label>
          <textarea id="builderCompleteHint" placeholder="Dica" class="builder-input builder-textarea"></textarea>
        </div>
      `;
      break;

    case "sequenceLogic":
      html += `
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderSequence">Sequência</label>
          <textarea id="builderSequence" placeholder="Sequência (vírgula separada)" class="builder-input builder-textarea"></textarea>
        </div>
        <div class="builder-field-group">
          <label class="builder-field-label" for="builderSequenceHint">Dica</label>
          <textarea id="builderSequenceHint" placeholder="Dica" class="builder-input builder-textarea"></textarea>
        </div>
      `;
      break;

    default:
      html += `<p>Selecione um tipo de jogo.</p>`;
  }

  html += `
    <button type="button" class="primary" onclick="saveBuilderGame()">${buttonLabel}</button>
  `;

  area.innerHTML = html;
  if(type === "dragDrop"){
    const container = document.getElementById("builderDragDropPairs");
    if(!editingBuilderId || !container || container.children.length === 0){
      builderAddPair();
    }
  }

  if(type === "association"){
    const container = document.getElementById("pairsContainer");
    if(!editingBuilderId || !container || container.children.length === 0){
      addPair();
    }
  }

  if(type === "quiz"){
    const container = document.getElementById("builderQuizQuestions");
    if(!editingBuilderId || !container || container.children.length === 0){
      builderAddQuizQuestion();
    }
  }

  if(type === "crossword"){
    const container = document.getElementById("builderCrosswordQuestions");
    if(!editingBuilderId || !container || container.children.length === 0){
      builderAddCrosswordEntry();
    }
  }

  if(type === "imageQuiz"){
    const container = document.getElementById("builderImageQuizQuestions");
    if(!editingBuilderId || !container || container.children.length === 0){
      builderAddImageQuizQuestion();
    }
  }
};

window.builderAddPair = function(){
  const container = document.getElementById("builderDragDropPairs");
  if(!container) return;

  const pair = document.createElement("div");
  pair.className = "dragdrop-row";
  pair.innerHTML = `
    <textarea class="drag-left builder-input builder-textarea" rows="2" placeholder="Item esquerdo"></textarea>
    <textarea class="drag-right builder-input builder-textarea" rows="2" placeholder="Item direito"></textarea>
  `;

  container.appendChild(pair);
};

window.builderAddImageQuizQuestion = function(questionData = {}){
  const container = document.getElementById("builderImageQuizQuestions");
  if(!container) return;

  const questionIndex = container.children.length + 1;
  const question = questionData.question || "";
  const a = questionData.a || "";
  const b = questionData.b || "";
  const c = questionData.c || "";
  const d = questionData.d || "";
  const correct = questionData.correct || "";

  const item = document.createElement("div");
  item.className = "builder-card-section image-quiz-question-card";
  item.innerHTML = `
    <h4>Pergunta ${questionIndex}</h4>
    <div class="builder-field-group">
      <label class="builder-field-label">Enunciado</label>
      <textarea class="builder-input image-quiz-question-text builder-textarea" rows="3" placeholder="Pergunta">${escapeHtml(question)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa A</label>
      <textarea class="builder-input image-quiz-option builder-textarea" rows="2" placeholder="Alternativa A">${escapeHtml(a)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa B</label>
      <textarea class="builder-input image-quiz-option builder-textarea" rows="2" placeholder="Alternativa B">${escapeHtml(b)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa C</label>
      <textarea class="builder-input image-quiz-option builder-textarea" rows="2" placeholder="Alternativa C">${escapeHtml(c)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa D</label>
      <textarea class="builder-input image-quiz-option builder-textarea" rows="2" placeholder="Alternativa D">${escapeHtml(d)}</textarea>
    </div>
    <select class="builder-input image-quiz-correct">
      <option value="">Resposta correta</option>
      <option value="A" ${correct === "A" ? "selected" : ""}>A</option>
      <option value="B" ${correct === "B" ? "selected" : ""}>B</option>
      <option value="C" ${correct === "C" ? "selected" : ""}>C</option>
      <option value="D" ${correct === "D" ? "selected" : ""}>D</option>
    </select>
    <button type="button" class="secondary" onclick="this.closest('.image-quiz-question-card').remove(); updateImageQuizQuestionTitles();">Remover pergunta</button>
  `;

  container.appendChild(item);
  updateImageQuizQuestionTitles();
};

window.builderAddQuizQuestion = function(questionData = {}){
  const container = document.getElementById("builderQuizQuestions");
  if(!container) return;

  const questionIndex = container.children.length + 1;
  const question = questionData.question || "";
  const a = questionData.a || "";
  const b = questionData.b || "";
  const c = questionData.c || "";
  const d = questionData.d || "";
  const correct = questionData.correct || "";

  const item = document.createElement("div");
  item.className = "builder-card-section quiz-question-card";
  item.innerHTML = `
    <h4>Pergunta ${questionIndex}</h4>
    <div class="builder-field-group">
      <label class="builder-field-label">Enunciado</label>
      <textarea class="builder-input quiz-question-text builder-textarea" rows="3" placeholder="Pergunta">${escapeHtml(question)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa A</label>
      <textarea class="builder-input quiz-option-a builder-textarea" rows="2" placeholder="Alternativa A">${escapeHtml(a)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa B</label>
      <textarea class="builder-input quiz-option-b builder-textarea" rows="2" placeholder="Alternativa B">${escapeHtml(b)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa C</label>
      <textarea class="builder-input quiz-option-c builder-textarea" rows="2" placeholder="Alternativa C">${escapeHtml(c)}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Alternativa D</label>
      <textarea class="builder-input quiz-option-d builder-textarea" rows="2" placeholder="Alternativa D">${escapeHtml(d)}</textarea>
    </div>
    <select class="builder-input quiz-question-correct">
      <option value="">Resposta correta</option>
      <option value="A" ${correct === "A" ? "selected" : ""}>A</option>
      <option value="B" ${correct === "B" ? "selected" : ""}>B</option>
      <option value="C" ${correct === "C" ? "selected" : ""}>C</option>
      <option value="D" ${correct === "D" ? "selected" : ""}>D</option>
    </select>
    <button type="button" class="secondary" onclick="this.closest('.quiz-question-card').remove(); updateQuizQuestionTitles();">Remover pergunta</button>
  `;

  container.appendChild(item);
  updateQuizQuestionTitles();
};

function updateImageQuizQuestionTitles(){
  document.querySelectorAll(".image-quiz-question-card").forEach((card, index) => {
    const title = card.querySelector("h4");
    if(title) title.textContent = `Pergunta ${index + 1}`;
  });
}

function updateQuizQuestionTitles(){
  document.querySelectorAll(".quiz-question-card").forEach((card, index) => {
    const title = card.querySelector("h4");
    if(title) title.textContent = `Pergunta ${index + 1}`;
  });
}

window.saveBuilderGame = async function(){
  const type = document.getElementById("builderGameType")?.value;
  const title = document.getElementById("builderGameTitle")?.value.trim();
  const setupTip = document.getElementById("builderSetupTip")?.value.trim() || "";

  if(!title){
    alert("Digite um título para o jogo");
    return;
  }

  let data = {};

  switch(type){
    case "dragDrop":
      const rows = document.querySelectorAll("#builderFormArea .dragdrop-row");
      const pairs = [];
      rows.forEach(row => {
        const left = row.querySelector(".drag-left")?.value.trim();
        const right = row.querySelector(".drag-right")?.value.trim();
        if(left && right){
          pairs.push({ left, right });
        }
      });
      if(pairs.length === 0){
        alert("Adicione pelo menos um par");
        return;
      }
      const instruction = document.getElementById("builderDragDropInstruction")?.value.trim() || "";
      data = { instruction, pairs };
      break;

    case "quiz":
      const quizCards = Array.from(document.querySelectorAll(".quiz-question-card"));
      const quizQuestions = quizCards.map((card, index) => ({
        index: index + 1,
        question: card.querySelector(".quiz-question-text")?.value.trim(),
        a: card.querySelector(".quiz-option-a")?.value.trim(),
        b: card.querySelector(".quiz-option-b")?.value.trim(),
        c: card.querySelector(".quiz-option-c")?.value.trim(),
        d: card.querySelector(".quiz-option-d")?.value.trim(),
        correct: card.querySelector(".quiz-question-correct")?.value,
      }));
      const validQuizQuestions = quizQuestions.filter(q => q.question && q.a && q.b && q.c && q.d && q.correct);
      if(!validQuizQuestions.length){
        const firstInvalid = quizQuestions[0];
        const invalidIndex = firstInvalid ? firstInvalid.index : 1;
        alert(`Questão ${invalidIndex} está incompleta. Preencha a pergunta, as 4 alternativas e selecione a resposta correta.`);
        return;
      }
      data = { questions: validQuizQuestions };
      break;

    case "imageQuiz":
      const image = document.getElementById("builderImageQuizImage")?.value.trim();
      const fileInput = document.getElementById("builderImageQuizFile");
      const file = fileInput?.files?.[0];
      const questionCards = Array.from(document.querySelectorAll(".image-quiz-question-card"));
      const questions = questionCards.map((card, index) => ({
        index: index + 1,
        question: card.querySelector(".image-quiz-question-text")?.value.trim(),
        a: card.querySelectorAll(".image-quiz-option")[0]?.value.trim(),
        b: card.querySelectorAll(".image-quiz-option")[1]?.value.trim(),
        c: card.querySelectorAll(".image-quiz-option")[2]?.value.trim(),
        d: card.querySelectorAll(".image-quiz-option")[3]?.value.trim(),
        correct: card.querySelector(".image-quiz-correct")?.value,
      }));
      const validImageQuestions = questions.filter(q => q.question && q.a && q.b && q.c && q.d && q.correct);
      if(!validImageQuestions.length){
        const firstInvalid = questions[0];
        const invalidIndex = firstInvalid ? firstInvalid.index : 1;
        alert(`Questão ${invalidIndex} está incompleta. Preencha a pergunta, as 4 alternativas e selecione a resposta correta.`);
        return;
      }
      let imageUrl = image;
      if(file){
        const fileName = `builder/imageQuiz/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        const uploadResult = await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(uploadResult.ref || storageRef);
      }
      if(!imageUrl){
        alert("Informe uma imagem via URL ou upload.");
        return;
      }
      data = { image: imageUrl, questions };
      break;

    case "completeWord":
      const sentence = document.getElementById("builderCompleteSentence")?.value.trim();
      const answer = document.getElementById("builderCompleteAnswer")?.value.trim();
      const hint = document.getElementById("builderCompleteHint")?.value.trim();
      if(!sentence || !answer || !hint){
        alert("Preencha a frase, a palavra correta e a dica");
        return;
      }
      if(!sentence.includes('___')){
        alert("Use ___ para indicar a lacuna na frase.");
        return;
      }
      data = { sentence, answer, hint };
      break;

    case "memory":
      if(memoryBuilderCards.length < 2){
        alert("Adicione pelo menos duas cartas de memória com imagens.");
        return;
      }
      data = { cards: [...memoryBuilderCards] };
      break;

    case "association":
      const associationRows = document.querySelectorAll("#builderFormArea .pair-row");
      const associationPairs = [];
      associationRows.forEach(row => {
        const left = row.querySelector(".left-item")?.value.trim();
        const right = row.querySelector(".right-item")?.value.trim();
        if(left && right){
          associationPairs.push({ left, right });
        }
      });
      if(associationPairs.length === 0){
        alert("Adicione pelo menos um par de associação.");
        return;
      }
      const associationMode = document.getElementById("builderAssociationMode")?.value || "lines";
      data = { pairs: associationPairs, mode: associationMode };
      break;

    case "sequenceLogic":
      const sequence = document.getElementById("builderSequence")?.value.trim();
      const sequenceHint = document.getElementById("builderSequenceHint")?.value.trim();
      if(!sequence || !sequenceHint){
        alert("Preencha a sequência e a dica");
        return;
      }
      data = { sequence: sequence.split(',').map(item => item.trim()).filter(Boolean), hint: sequenceHint };
      break;

    case "crossword":
      const crosswordCards = Array.from(document.querySelectorAll(".crossword-entry-card"));
      const crosswordEntries = crosswordCards.map(card => ({
        clue: card.querySelector(".crossword-question")?.value.trim(),
        word: card.querySelector(".crossword-answer")?.value.trim().toUpperCase()
      })).filter(entry => entry.clue && entry.word);
      const crosswordSize = Number(document.getElementById("builderCrosswordSize")?.value || 12);
      if(crosswordEntries.length === 0){
        alert("Adicione pelo menos uma pergunta e resposta para a cruzada.");
        return;
      }
      data = { size: crosswordSize, words: crosswordEntries.map(entry => ({ clue: entry.clue, word: entry.word })) };
      break;

    default:
      alert("Tipo de jogo inválido");
      return;
  }

  data.setupTip = setupTip;

  try {
    if(editingBuilderId){
      await updateDoc(doc(db, "builder_games", editingBuilderId), {
        title,
        type,
        data
      });
      alert("✅ Jogo atualizado com sucesso!");
      editingBuilderId = null;
      editingBuilderGame = null;
    } else {
      await addDoc(collection(db, "builder_games"), {
        title,
        type,
        data,
        createdAt: new Date()
      });
      alert("✅ Jogo criado com sucesso!");
    }
    document.getElementById("builderGameTitle").value = "";
    const setupTipInput = document.getElementById("builderSetupTip");
    if(setupTipInput) setupTipInput.value = "";
    const imageUrlInput = document.getElementById("builderImageQuizImage");
    if(imageUrlInput) imageUrlInput.value = "";
    const fileInput = document.getElementById("builderImageQuizFile");
    if(fileInput) fileInput.value = "";
    builderImageQuizFile = null;
    renderBuilderForm();
    await loadBuilderGames();
  } catch(error){
    console.error("ERRO AO SALVAR BUILDER GAME:", error);
    alert("Erro ao salvar jogo: " + error.message);
  }
};

window.generateAndSaveBuilderGame = async function(){
  const type = document.getElementById("builderGameType")?.value;
  const titleField = document.getElementById("builderGameTitle");
  const titleText = titleField?.value.trim();
  const hints = document.getElementById("builderAutoHints")?.value.trim();
  const resultArea = document.getElementById("builderAutoResult");

  if(!hints){
    alert("Digite algumas dicas para gerar um jogo.");
    return;
  }

  let data = null;
  let generatedTitle = titleText || "Jogo Automático";
  const parsedPairs = parseBuilderAutoHints(hints);

  if(type === "quiz"){
    const questions = generateQuizQuestionsFromHints(parsedPairs);
    if(questions.length === 0){
      alert("Forneça pelo menos uma linha no formato termo - resposta para gerar um quiz.");
      return;
    }
    data = { questions };
    generatedTitle = titleText || `Quiz gerado: ${parsedPairs[0]?.left || 'Novo Quiz'}`;
  } else if(type === "association" || type === "dragDrop"){
    if(parsedPairs.length === 0){
      alert("Forneça pelo menos um par no formato termo - resposta para gerar um jogo.");
      return;
    }
    data = { pairs: parsedPairs };
    generatedTitle = titleText || (type === "association" ? "Jogo de Associação Gerado" : "Jogo de Arrastar e Soltar Gerado");
  } else if(type === "completeWord"){
    if(parsedPairs.length === 0){
      alert("Forneça pelo menos uma linha no formato termo - resposta para gerar um jogo Complete a Palavra.");
      return;
    }
    const first = parsedPairs[0];
    const sentence = first.left.includes('___') ? first.left : `${first.left} ___`;
    data = { sentence, answer: first.right, hint: `Complete a palavra com ${first.right}.` };
    generatedTitle = titleText || `Complete a Palavra: ${first.right}`;
  } else {
    alert("Selecione um tipo de jogo suportado para geração automática (Quiz, Associação, Arrastar e Soltar ou Complete a Palavra).");
    return;
  }

  try {
    await addDoc(collection(db, "builder_games"), {
      title: generatedTitle,
      type,
      data,
      createdAt: new Date()
    });

    if(resultArea){
      resultArea.innerHTML = `<p>✅ Jogo salvo como <strong>${generatedTitle}</strong>.</p>`;
    }
    if(titleField && !titleText){
      titleField.value = generatedTitle;
    }

    await loadBuilderGames();
  } catch(error){
    console.error("ERRO AO GERAR E SALVAR BUILDER GAME:", error);
    alert("Erro ao gerar jogo: " + error.message);
  }
};

function parseBuilderAutoHints(text){
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('-');
      if(parts.length < 2) return null;
      const left = parts[0].trim();
      const right = parts.slice(1).join('-').trim();
      return left && right ? { left, right } : null;
    })
    .filter(Boolean);
}

function generateQuizQuestionsFromHints(pairs){
  const answers = pairs.map(pair => pair.right);
  return pairs.map(pair => {
    const questionText = pair.left.includes('?') ? pair.left : `Qual é a resposta para "${pair.left}"?`;
    const wrongAnswers = shuffleArray(answers.filter(answer => answer !== pair.right));
    const options = [pair.right, ...wrongAnswers].slice(0, 4);
    while(options.length < 4){
      const filler = `Outra opção ${options.length + 1}`;
      if(!options.includes(filler)){
        options.push(filler);
      }
    }
    const shuffled = shuffleArray(options);
    const correctLetter = ["A", "B", "C", "D"][shuffled.indexOf(pair.right)];
    return {
      question: questionText,
      a: shuffled[0] || "",
      b: shuffled[1] || "",
      c: shuffled[2] || "",
      d: shuffled[3] || "",
      correct: correctLetter || "A"
    };
  });
}

function shuffleArray(array){
  return array.slice().sort(() => Math.random() - 0.5);
}

async function loadBuilderGames(){
  const container = document.getElementById("savedBuilderGamesList");
  if(!container) return;

  try {
    const snapshot = await getDocs(collection(db, "builder_games"));
    const groups = {};

    snapshot.forEach(docItem => {
      const game = docItem.data();
      const type = game.type || "outros";
      if(!groups[type]) groups[type] = [];
      groups[type].push({ id: docItem.id, game });
    });

    const typeLabels = {
      dragDrop: "Arrastar e Soltar",
      quiz: "Quiz sem Imagem",
      imageQuiz: "Quiz com Imagem",
      memory: "Memória",
      association: "Associação",
      crossword: "Palavras Cruzadas",
      completeWord: "Complete a Palavra",
      sequenceLogic: "Sequência Lógica",
      outros: "Outros"
    };

    let html = "";
    Object.keys(typeLabels).forEach(typeKey => {
      const items = groups[typeKey];
      if(!items || items.length === 0) return;
      html += `
        <div class="builder-category-header">
          <h2>${typeLabels[typeKey]}</h2>
        </div>
      `;
      items.forEach(item => {
        html += `
          <div class="question-card" id="builderGameCard-${item.id}">
            <h3>${item.game.title}</h3>
            <p>${typeLabels[typeKey]}</p>
            <div class="button-row">
              <button class="primary" onclick="playBuilderGame('${item.id}')">▶ Jogar</button>
              <button class="primary" onclick="editBuilderGame('${item.id}')">✏ Editar</button>
              <button class="primary" onclick="deleteBuilderGame('${item.id}')">🗑 Excluir</button>
            </div>
          </div>
          <div id="builderPlayArea-${item.id}" class="builder-play-area"></div>
        `;
      });
    });

    container.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum jogo criado ainda</h3>
        <p>Use o formulário acima para criar seu primeiro jogo personalizado.</p>
      </div>
    `;
  } catch(error){
    console.error("ERRO AO CARREGAR BUILDERS:", error);
  }
}

window.deleteBuilderGame = async function(id){
  try {
    await deleteDoc(doc(db, "builder_games", id));
    await loadBuilderGames();
  } catch(error){
    console.error("ERRO AO DELETAR BUILDER GAME:", error);
  }
};

window.editBuilderGame = async function(id){
  try {
    await showScreen('gameBuilder');

    const docSnap = await getDoc(doc(db, "builder_games", id));
    if(!docSnap.exists()){
      alert("Jogo não encontrado.");
      return;
    }

    const game = docSnap.data();
    editingBuilderId = id;
    editingBuilderGame = game;
    document.getElementById("builderGameType").value = game.type;
    renderBuilderForm();
    document.getElementById("builderGameTitle").value = game.title;
    const setupTipInput = document.getElementById("builderSetupTip");
    if(setupTipInput){
      setupTipInput.value = game.data?.setupTip || game.data?.tip || "";
    }

    if(game.type === "dragDrop"){
      const instructionInput = document.getElementById("builderDragDropInstruction");
      if(instructionInput){
        instructionInput.value = game.data.instruction || "";
      }
      const container = document.getElementById("builderDragDropPairs");
      if(container){
        container.innerHTML = "";
        game.data.pairs.forEach(pair => {
          const row = document.createElement("div");
          row.className = "dragdrop-row";
          row.innerHTML = `
            <textarea class="drag-left builder-input builder-textarea" rows="2" placeholder="Item esquerdo">${escapeHtml(pair.left || "")}</textarea>
            <textarea class="drag-right builder-input builder-textarea" rows="2" placeholder="Item direito">${escapeHtml(pair.right || "")}</textarea>
          `;
          container.appendChild(row);
        });
      }
    }

    if(game.type === "imageQuiz"){
      document.getElementById("builderImageQuizImage").value = game.data.image || "";
      const questions = game.data.questions || [];
      const questionsContainer = document.getElementById("builderImageQuizQuestions");
      if(questionsContainer){
        questionsContainer.innerHTML = "";
        questions.forEach(question => builderAddImageQuizQuestion(question));
      }
    }

    if(game.type === "quiz"){
      const questions = game.data.questions || [];
      const questionsContainer = document.getElementById("builderQuizQuestions");
      if(questionsContainer){
        questionsContainer.innerHTML = "";
        questions.forEach(question => builderAddQuizQuestion(question));
      }
    }

    if(game.type === "memory"){
      memoryBuilderCards = game.data.cards || [];
      renderMemoryPreview();
    }

    if(game.type === "association"){
      const modeSelect = document.getElementById("builderAssociationMode");
      if(modeSelect){
        modeSelect.value = game.data.mode || "lines";
      }
      const container = document.getElementById("pairsContainer");
      if(container){
        container.innerHTML = "";
        game.data.pairs.forEach(pair => {
          const row = document.createElement("div");
          row.className = "pair-row";
          row.innerHTML = `
            <textarea class="left-item builder-input builder-textarea" rows="2" placeholder="Item esquerdo">${escapeHtml(pair.left || "")}</textarea>
            <textarea class="right-item builder-input builder-textarea" rows="2" placeholder="Item direito">${escapeHtml(pair.right || "")}</textarea>
          `;
          container.appendChild(row);
        });
      }
    }

    if(game.type === "crossword"){
      document.getElementById("builderCrosswordSize").value = game.data.size || 12;
      const questionsContainer = document.getElementById("builderCrosswordQuestions");
      if(questionsContainer){
        questionsContainer.innerHTML = "";
        (game.data.words || []).forEach(entry => builderAddCrosswordEntry(entry));
      }
    }

    if(game.type === "completeWord"){
      document.getElementById("builderCompleteSentence").value = game.data.sentence || "";
      document.getElementById("builderCompleteAnswer").value = game.data.answer || "";
      document.getElementById("builderCompleteHint").value = game.data.hint || "";
    }

    if(game.type === "sequenceLogic"){
      document.getElementById("builderSequence").value = game.data.sequence.join(", ");
      document.getElementById("builderSequenceHint").value = game.data.hint;
    }
  } catch(error){
    console.error("ERRO AO EDITAR BUILDER GAME:", error);
  }
};

window.playBuilderGame = async function(id){
  try {
    const docSnap = await getDoc(doc(db, "builder_games", id));
    if(!docSnap.exists()){
      alert("Jogo não encontrado.");
      return;
    }

    const selectedGame = { id: docSnap.id, ...docSnap.data() };
    await showScreen('gameBuilder');

    setTimeout(() => {
      renderBuilderPlayArea(selectedGame, id);
    }, 120);
  } catch(error){
    console.error("ERRO AO CARREGAR BUILDER GAME PARA JOGAR:", error);
  }
};

window.renderBuilderPlayArea = function(game, cardId){
  builderGameState = {
    game,
    selectedLeftId: null,
    matchedIds: [],
    status: "Comece o jogo.",
    attempts: 0,
    cardId: cardId || game.id
  };
  window.builderGameState = builderGameState;

  let playArea = document.getElementById(`builderPlayArea-${builderGameState.cardId}`);
  if(!playArea){
    playArea = document.getElementById('savedBuilderGamesList');
  }
  if(!playArea) return;

  if(playArea.id === 'savedBuilderGamesList'){
    playArea.insertAdjacentHTML('beforeend', `<div id="builderPlayArea-${builderGameState.cardId}" class="builder-play-area"></div>`);
    playArea = document.getElementById(`builderPlayArea-${builderGameState.cardId}`);
  }

  document.querySelectorAll('.builder-play-area').forEach(area => {
    if(area.id !== `builderPlayArea-${builderGameState.cardId}`) {
      area.innerHTML = '';
    }
  });

  const setupTip = (game.data?.setupTip || game.data?.tip || "").trim();

  playArea.innerHTML = `
    <div class="question-card">
      <h3>Jogar: ${game.title}</h3>
      ${setupTip ? `<div class="builder-instruction">💡 ${escapeHtml(setupTip)}</div>` : ""}
      <div id="builderPlayContent"></div>
    </div>
  `;

  requestAnimationFrame(() => {
    playArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  switch(game.type){
    case "dragDrop":
      renderBuilderDragDropGame(game);
      break;

    case "association":
      renderBuilderAssociationGame(game);
      break;

    case "crossword":
      renderBuilderCrosswordGame(game);
      break;

    case "quiz":
      renderBuilderQuiz(game);
      break;

    case "imageQuiz":
      renderBuilderImageQuizGame(game);
      break;

    case "completeWord":
      renderBuilderCompleteWordGame(game);
      break;

    case "sequenceLogic":
      renderBuilderSequenceGame(game);
      break;

    default:
      document.getElementById("builderPlayContent").innerHTML = `<p>Tipo de jogo não suportado.</p>`;
  }
}

function renderBuilderAssociationGame(game){
  const pairs = game.data.pairs.map((pair, index)=>({ id: index, left: pair.left, right: pair.right }));
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const mode = game.data?.mode || 'lines';
  if(mode === 'numbers'){
    renderAssociationNumberGame(content, game.title, pairs, 'builderAssociation');
  } else {
    renderAssociationLineGame(content, game.title, pairs, 'builderAssociation');
  }
}

window.builderAddCrosswordEntry = function(entry = {}){
  const container = document.getElementById("builderCrosswordQuestions");
  if(!container) return;

  const item = document.createElement("div");
  item.className = "crossword-entry-card builder-card-section";
  item.innerHTML = `
    <div class="builder-field-group">
      <label class="builder-field-label">Pergunta</label>
      <textarea class="builder-input builder-textarea crossword-question" rows="2" placeholder="Exemplo: Qual é a capital do Brasil?">${escapeHtml(entry.clue || "")}</textarea>
    </div>
    <div class="builder-field-group">
      <label class="builder-field-label">Resposta</label>
      <input type="text" class="builder-input crossword-answer" value="${escapeHtml(entry.word || "")}" placeholder="Exemplo: BRASILIA">
    </div>
    <button type="button" class="secondary" onclick="this.closest('.crossword-entry-card').remove();">Remover</button>
  `;

  container.appendChild(item);
}

function buildCrosswordPuzzle(words, size = 12){
  const normalizedWords = (words || []).filter(item => item?.word && item?.word.length >= 2).map(item => ({
    word: item.word.toUpperCase(),
    clue: item.clue || ""
  }));

  if(normalizedWords.length === 0){
    return { size, grid: [], entries: [] };
  }

  const boardSize = Math.max(size, 10);
  const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  const placements = [];
  const firstWord = normalizedWords[0];
  const clueNumbers = [];
  const startRow = Math.floor(boardSize / 2);
  const startCol = Math.floor((boardSize - firstWord.word.length) / 2);

  function canPlace(word, row, col, direction){
    let intersections = 0;
    for(let index = 0; index < word.length; index += 1){
      const currentRow = row + (direction === 1 ? 0 : index);
      const currentCol = col + (direction === 0 ? 0 : index);
      const currentCell = grid[currentRow]?.[currentCol];
      if(currentCell && currentCell.letter !== word[index]){
        return { valid: false, intersections: 0 };
      }
      if(currentCell && currentCell.letter === word[index]){
        intersections += 1;
      }
    }
    return { valid: true, intersections };
  }

  function placeWord(word, row, col, direction){
    if(!word || !Number.isInteger(row) || !Number.isInteger(col)) return;
    const safeRow = Math.max(0, Math.min(boardSize - 1, row));
    const safeCol = Math.max(0, Math.min(boardSize - 1, col));

    for(let index = 0; index < word.length; index += 1){
      const currentRow = safeRow + (direction === 1 ? 0 : index);
      const currentCol = safeCol + (direction === 0 ? 0 : index);
      if(currentRow >= boardSize || currentCol >= boardSize) return;
      if(!grid[currentRow][currentCol]){
        grid[currentRow][currentCol] = { letter: word[index], active: true };
      }
    }
    placements.push({ word, row: safeRow, col: safeCol, direction });
    clueNumbers.push({ word, row: safeRow, col: safeCol, direction });
  }

  placeWord(firstWord.word, startRow, startCol, 0);

  for(const entry of normalizedWords.slice(1)){
    let placed = false;
    for(let row = 0; row < boardSize; row += 1){
      for(let col = 0; col < boardSize; col += 1){
        for(const direction of [0, 1]){
          const result = canPlace(entry.word, row, col, direction);
          if(result.valid && result.intersections > 0){
            placeWord(entry.word, row, col, direction);
            placed = true;
            break;
          }
        }
        if(placed) break;
      }
      if(placed) break;
    }

    if(!placed){
      const fallbackRow = Math.min(boardSize - 1, 2 + placements.length);
      const fallbackCol = Math.min(boardSize - entry.word.length, 2 + placements.length);
      placeWord(entry.word, fallbackRow, fallbackCol, placements.length % 2);
    }
  }

  return {
    size: boardSize,
    grid,
    entries: placements.map((placement, index) => ({
      ...placement,
      clue: normalizedWords[index]?.clue || "",
      number: index + 1
    }))
  };
}

function renderBuilderCrosswordGame(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const puzzle = buildCrosswordPuzzle(game.data?.words || [], game.data?.size || 12);
  const answers = Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(""));

  builderGameState.crossword = {
    puzzle,
    answers,
    size: puzzle.size,
    showAnswers: false
  };

  content.innerHTML = `
    <div class="question-card association-game-card">
      <h3>${escapeHtml(game.title)}</h3>
      <p>${(game.data?.words || []).length} palavras</p>
      <div id="builderCrosswordStatus" class="association-status">Preencha as letras da grade.</div>
      <div class="crossword-clues">
        <h4>Pistas</h4>
        <ol id="builderCrosswordClues"></ol>
      </div>
      <div id="builderCrosswordBoard" class="crossword-board"></div>
      <div class="button-row">
        <button type="button" class="secondary" onclick="toggleCrosswordAnswers()">Consultar respostas</button>
        <button type="button" class="primary" onclick="renderBuilderPlayArea(builderGameState.game, builderGameState.cardId)">Reiniciar</button>
      </div>
    </div>
  `;

  const board = document.getElementById("builderCrosswordBoard");
  const status = document.getElementById("builderCrosswordStatus");
  const clues = document.getElementById("builderCrosswordClues");
  if(!board || !status || !clues) return;

  clues.innerHTML = (game.data?.words || []).map((item, index) => `
    <li><strong>${index + 1}.</strong> ${escapeHtml(item.clue)}</li>
  `).join('');

  const renderBoard = () => {
    board.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for(let row = 0; row < puzzle.size; row += 1){
      for(let col = 0; col < puzzle.size; col += 1){
        const cell = puzzle.grid[row]?.[col];
        const wrapper = document.createElement("div");
        wrapper.className = cell?.active ? "crossword-cell" : "crossword-cell crossword-cell-black";

        if(cell?.active){
          const input = document.createElement("input");
          const clueNumber = puzzle.entries.find(entry => entry.row === row && entry.col === col)?.number;
          const hasHintLetter = builderGameState.crossword.answers[row][col] || (cell.letter && clueNumber);
          const hintLabel = clueNumber ? `<span class="crossword-number">${clueNumber}</span>` : "";
          const hintLetter = cell.letter && clueNumber ? `<span class="crossword-hint-letter">${cell.letter}</span>` : "";
          input.maxLength = 1;
          input.value = builderGameState.crossword.answers[row][col] || "";
          input.dataset.row = row;
          input.dataset.col = col;
          input.className = "crossword-input";
          input.addEventListener("input", (event) => {
            const target = event.target;
            const currentRow = Number(target.dataset.row);
            const currentCol = Number(target.dataset.col);
            const value = target.value.toUpperCase().replace(/[^A-ZÀ-Ú]/gi, "").slice(-1);
            target.value = value;
            builderGameState.crossword.answers[currentRow][currentCol] = value;
            const isComplete = builderGameState.crossword.answers.every((answerRow, answerRowIndex) =>
              answerRow.every((answerCell, answerColIndex) => {
                const solutionCell = puzzle.grid[answerRowIndex]?.[answerColIndex];
                return !solutionCell?.active || (answerCell || "") === solutionCell.letter;
              })
            );
            status.textContent = isComplete ? "🎉 Palavra cruzada completa!" : "Preencha as letras da grade.";
          });
          const overlay = document.createElement("div");
          overlay.className = "crossword-cell-overlay";
          overlay.innerHTML = `${hintLabel}${hintLetter}`;
          wrapper.appendChild(overlay);
          wrapper.appendChild(input);
        }

        fragment.appendChild(wrapper);
      }
    }

    board.appendChild(fragment);
  };

  renderBoard();
}

window.toggleCrosswordAnswers = function(){
  if(!builderGameState?.crossword) return;

  builderGameState.crossword.showAnswers = !builderGameState.crossword.showAnswers;
  const board = document.getElementById("builderCrosswordBoard");
  if(!board) return;

  const cells = board.querySelectorAll(".crossword-cell");
  cells.forEach((cell, index) => {
    const row = Math.floor(index / builderGameState.crossword.size);
    const col = index % builderGameState.crossword.size;
    const solutionCell = builderGameState.crossword.puzzle.grid[row]?.[col];
    if(solutionCell?.active){
      const input = cell.querySelector(".crossword-input");
      if(input){
        input.value = builderGameState.crossword.showAnswers ? solutionCell.letter : (builderGameState.crossword.answers[row]?.[col] || "");
      }
    }
  });
};

function renderBuilderDragDropGame(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const pairs = game.data.pairs.map((pair, index)=>({ id: index, left: pair.left, right: pair.right }));
  const instruction = (game.data?.instruction || "").trim() || "Arraste cada item à esquerda para o item correspondente à direita.";

  builderGameState.pairs = pairs;
  builderGameState.leftItems = shuffleArray(pairs.map(item => ({ id: item.id, text: item.left })));
  builderGameState.rightItems = shuffleArray(pairs.map(item => ({ id: item.id, text: item.right })));
  builderGameState.matchedIds = [];
  builderGameState.selectedLeftId = null;
  builderGameState.attempts = 0;
  builderGameState.status = "Clique em um item à esquerda e depois no correspondente à direita.";

  content.innerHTML = `
    <div class="question-card association-game-card">
      <h3>${game.title}</h3>
      <p>${pairs.length} pares</p>
      <div id="builderPlayStatus" class="association-status">${builderGameState.status}</div>
      <p class="builder-instruction">${escapeHtml(instruction)}</p>
      <div class="association-game-board">
        <svg id="builderDragLines" class="association-lines"></svg>
        <div class="association-board">
          <div class="association-column">
            <h4>Esquerda</h4>
            <div id="builderDragLeftList" class="association-list"></div>
          </div>
          <div class="association-column">
            <h4>Direita</h4>
            <div id="builderDragRightList" class="association-list"></div>
          </div>
        </div>
      </div>
      <button type="button" class="primary" onclick="resetBuilderDragDropGame()">Reiniciar</button>
    </div>
  `;

  updateBuilderDragDropLists();
}

function renderAssociationLineGame(container, title, pairs, prefix){
  const leftItems = shuffleArray(pairs.map(pair => ({ id: pair.id, text: pair.left })));
  const rightItems = shuffleArray(pairs.map(pair => ({ id: pair.id, text: pair.right })));
  const connections = [];
  let selectedLeftId = null;
  let matchedPairs = 0;

  container.innerHTML = `
    <div class="question-card association-game-card">
      <h3>${title}</h3>
      <p>${pairs.length} pares</p>
      <div id="${prefix}GameStatus" class="association-status">Clique em um item à esquerda e depois no correspondente à direita.</div>
      <div class="association-game-board">
        <svg id="${prefix}GameLines" class="association-lines"></svg>
        <div class="association-board">
          <div class="association-column">
            <h4>Esquerda</h4>
            <div id="${prefix}LeftList" class="association-list"></div>
          </div>
          <div class="association-column">
            <h4>Direita</h4>
            <div id="${prefix}RightList" class="association-list"></div>
          </div>
        </div>
      </div>
      <button id="${prefix}Reset" type="button" class="primary">Reiniciar</button>
    </div>
  `;

  const status = document.getElementById(`${prefix}GameStatus`);
  const leftList = document.getElementById(`${prefix}LeftList`);
  const rightList = document.getElementById(`${prefix}RightList`);
  const resetButton = document.getElementById(`${prefix}Reset`);
  const board = container.querySelector('.association-game-board');
  const svg = document.getElementById(`${prefix}GameLines`);

  function updateStatus(message) {
    if (status) status.textContent = message;
  }

  function isMatched(id){
    return connections.some(conn => conn.id === id);
  }

  function getElementAnchor(el){
    const rect = el.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    return {
      x: rect.left - boardRect.left + 16,
      y: rect.top - boardRect.top + 20
    };
  }

  function drawConnections(){
    if (!svg) return;
    svg.innerHTML = '';
    svg.setAttribute('width', board.clientWidth);
    svg.setAttribute('height', board.clientHeight);

    connections.forEach(conn => {
      const leftEl = leftList.querySelector(`[data-left-id='${conn.id}']`);
      const rightEl = rightList.querySelector(`[data-right-id='${conn.id}']`);
      if (!leftEl || !rightEl) return;
      const start = getElementAnchor(leftEl);
      const end = getElementAnchor(rightEl);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', start.x);
      line.setAttribute('y1', start.y);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
      line.setAttribute('stroke', 'rgba(122, 51, 249, 0.35)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    });
  }

  function renderLists(){
    leftList.innerHTML = "";
    rightList.innerHTML = "";

    leftItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option';
      button.textContent = item.text;
      button.dataset.leftId = item.id;
      if (selectedLeftId === item.id) button.classList.add('selected');
      if (isMatched(item.id)) {
        button.classList.add('matched');
        button.disabled = true;
      }
      button.onclick = () => {
        if (isMatched(item.id)) return;
        selectedLeftId = item.id;
        updateStatus('Agora escolha o item correspondente à direita.');
        renderLists();
      };
      leftList.appendChild(button);
    });

    rightItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option';
      button.textContent = item.text;
      button.dataset.rightId = item.id;
      if (isMatched(item.id)) {
        button.classList.add('matched');
        button.disabled = true;
      }
      button.onclick = () => {
        if (selectedLeftId === null) {
          updateStatus('Selecione um item à esquerda primeiro.');
          return;
        }
        if (selectedLeftId === item.id) {
          connections.push({ id: item.id });
          matchedPairs += 1;
          updateStatus(matchedPairs === pairs.length ? '🎉 Parabéns! Todos os pares foram conectados.' : '✅ Correto! Continue conectando.');
        } else {
          updateStatus('❌ Errado. Tente novamente.');
        }
        selectedLeftId = null;
        renderLists();
        drawConnections();
      };
      rightList.appendChild(button);
    });

    if (matchedPairs === pairs.length) {
      updateStatus('🎉 Jogo concluído!');
    }

    drawConnections();
  }

  resetButton.onclick = () => {
    leftItems.splice(0, leftItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, text: pair.left }))));
    rightItems.splice(0, rightItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, text: pair.right }))));
    connections.length = 0;
    selectedLeftId = null;
    matchedPairs = 0;
    updateStatus('Clique em um item à esquerda e depois no correspondente à direita.');
    renderLists();
  };

  renderLists();
}

function renderAssociationNumberGame(container, title, pairs, prefix){
  const leftItems = shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.left })));
  const rightItems = shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.right })));
  let selectedLeftId = null;
  let matchedPairs = 0;

  container.innerHTML = `
    <div class="question-card association-game-card">
      <h3>${title}</h3>
      <p>${pairs.length} pares</p>
      <div id="${prefix}GameStatus" class="association-status">Escolha um item à esquerda e depois o item correspondente à direita.</div>
      <div class="association-game-board">
        <div class="association-column">
          <h4>Coluna 1</h4>
          <div id="${prefix}LeftList" class="association-list"></div>
        </div>
        <div class="association-column">
          <h4>Coluna 2</h4>
          <div id="${prefix}RightList" class="association-list"></div>
        </div>
      </div>
      <button id="${prefix}Reset" type="button" class="primary">Reiniciar</button>
    </div>
  `;

  const status = document.getElementById(`${prefix}GameStatus`);
  const leftList = document.getElementById(`${prefix}LeftList`);
  const rightList = document.getElementById(`${prefix}RightList`);
  const resetButton = document.getElementById(`${prefix}Reset`);

  function updateStatus(message) {
    if (status) status.textContent = message;
  }

  function isMatched(id){
    return matchedPairs > 0 && leftItems.every(item => item.id !== id);
  }

  function renderLists(){
    leftList.innerHTML = "";
    rightList.innerHTML = "";

    leftItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option association-option-number';
      button.innerHTML = `<span class="association-number">${item.number}</span><span>${escapeHtml(item.text)}</span>`;
      button.dataset.leftId = item.id;
      if (selectedLeftId === item.id) button.classList.add('selected');
      button.onclick = () => {
        selectedLeftId = item.id;
        updateStatus('Agora escolha o item correspondente da direita.');
        renderLists();
      };
      leftList.appendChild(button);
    });

    rightItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option association-option-number';
      button.innerHTML = `<span class="association-number">${item.number}</span><span>${escapeHtml(item.text)}</span>`;
      button.dataset.rightId = item.id;
      button.onclick = () => {
        if (selectedLeftId === null) {
          updateStatus('Selecione um item à esquerda primeiro.');
          return;
        }
        if (selectedLeftId === item.id) {
          matchedPairs += 1;
          leftItems.splice(leftItems.findIndex(i => i.id === selectedLeftId), 1);
          rightItems.splice(rightItems.findIndex(i => i.id === item.id), 1);
          updateStatus(matchedPairs === pairs.length ? '🎉 Parabéns! Todos os pares foram conectados.' : '✅ Correto! Continue conectando.');
        } else {
          updateStatus('❌ Errado. Tente novamente.');
        }
        selectedLeftId = null;
        renderLists();
      };
      rightList.appendChild(button);
    });

    if (matchedPairs === pairs.length) {
      updateStatus('🎉 Jogo concluído!');
    }
  }

  resetButton.onclick = () => {
    leftItems.splice(0, leftItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.left }))));
    rightItems.splice(0, rightItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.right }))));
    selectedLeftId = null;
    matchedPairs = 0;
    updateStatus('Escolha um item à esquerda e depois o item correspondente à direita.');
    renderLists();
  };

  renderLists();
}

function updateBuilderDragDropLists(){
  const leftList = document.getElementById("builderDragLeftList");
  const rightList = document.getElementById("builderDragRightList");
  const status = document.getElementById("builderPlayStatus");
  if(!leftList || !rightList || !status) return;

  leftList.innerHTML = "";
  rightList.innerHTML = "";

  builderGameState.leftItems.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "association-option";
    button.textContent = item.text;
    button.draggable = !builderGameState.matchedIds.includes(item.id);
    button.disabled = builderGameState.matchedIds.includes(item.id);
    button.ondragstart = (event) => {
      builderGameState.draggedId = item.id;
      event.dataTransfer.setData("text/plain", item.id);
      builderGameState.status = "Arraste para o item correspondente à direita.";
      status.textContent = builderGameState.status;
    };
    button.ondragend = () => {
      builderGameState.draggedId = null;
    };
    leftList.appendChild(button);
  });

  builderGameState.rightItems.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "association-option";
    button.textContent = item.text;
    button.disabled = builderGameState.matchedIds.includes(item.id);
    button.ondragover = (event) => {
      event.preventDefault();
      button.classList.add("drag-over");
    };
    button.ondragleave = () => {
      button.classList.remove("drag-over");
    };
    button.ondrop = (event) => {
      event.preventDefault();
      button.classList.remove("drag-over");
      const draggedId = parseInt(event.dataTransfer.getData("text/plain"), 10);
      if(draggedId === item.id) {
        builderGameState.matchedIds.push(item.id);
        builderGameState.attempts += 1;
        builderGameState.status = "✅ Par correto! Continue. ";
      } else {
        builderGameState.attempts += 1;
        builderGameState.status = "❌ Par errado. Tente novamente.";
      }
      if(builderGameState.matchedIds.length === builderGameState.pairs.length){
        builderGameState.status = `🎉 Parabéns! Concluído em ${builderGameState.attempts} tentativas.`;
      }
      updateBuilderDragDropLists();
    };
    rightList.appendChild(button);
  });

  status.textContent = builderGameState.status;
}

window.resetBuilderDragDropGame = function(){
  if(!builderGameState) return;
  renderBuilderPlayArea(builderGameState.game, builderGameState.cardId);
};

function renderBuilderImageQuizGame(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const questions = Array.isArray(game.data?.questions) ? game.data.questions : [];
  builderGameState.answered = false;
  builderGameState.status = "Escolha a resposta correta.";
  builderGameState.currentQuestionIndex = 0;
  builderGameState.questions = questions;

  content.innerHTML = `
    <img src="${game.data.image}" alt="Imagem do quiz" style="width:100%; max-width:400px; border-radius:18px; margin:16px auto; display:block;">
    <div id="builderImageQuizQuestionArea"></div>
    <div id="builderPlayStatus" class="association-status">${builderGameState.status}</div>
    <button type="button" class="primary" onclick="renderBuilderPlayArea(builderGameState.game, builderGameState.cardId)">Reiniciar</button>
  `;

  if(questions.length === 0){
    const area = document.getElementById("builderImageQuizQuestionArea");
    if(area){
      area.innerHTML = `<p class="quiz-warning">Nenhuma pergunta disponível para este quiz com imagem.</p>`;
    }
    return;
  }

  renderCurrentImageQuizQuestion();
}

function renderBuilderQuiz(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const questions = Array.isArray(game.data?.questions) ? game.data.questions : [];
  builderGameState.answered = false;
  builderGameState.status = "Escolha a resposta correta.";
  builderGameState.currentQuestionIndex = 0;
  builderGameState.questions = questions;

  content.innerHTML = `
    <div id="builderImageQuizQuestionArea"></div>
    <div id="builderPlayStatus" class="association-status">${builderGameState.status}</div>
    <button type="button" class="primary" onclick="renderBuilderPlayArea(builderGameState.game, builderGameState.cardId)">Reiniciar</button>
  `;

  if(questions.length === 0){
    const area = document.getElementById("builderImageQuizQuestionArea");
    if(area){
      area.innerHTML = `<p class="quiz-warning">Nenhuma pergunta disponível para este quiz.</p>`;
    }
    return;
  }

  renderCurrentImageQuizQuestion();
}

function renderCurrentImageQuizQuestion(){
  const area = document.getElementById("builderImageQuizQuestionArea");
  const questions = Array.isArray(builderGameState?.questions)
    ? builderGameState.questions
    : Array.isArray(builderGameState?.game?.data?.questions)
      ? builderGameState.game.data.questions
      : [];

  if(!area || questions.length === 0) return;

  const index = builderGameState.currentQuestionIndex || 0;
  const current = questions[index];
  if(!current) return;

  area.innerHTML = `
    <p>${current.question}</p>
    <div class="options">
      <button class="option" onclick="answerBuilderImageQuiz('A')">A) ${current.a}</button>
      <button class="option" onclick="answerBuilderImageQuiz('B')">B) ${current.b}</button>
      <button class="option" onclick="answerBuilderImageQuiz('C')">C) ${current.c}</button>
      <button class="option" onclick="answerBuilderImageQuiz('D')">D) ${current.d}</button>
    </div>
  `;
}

window.answerBuilderImageQuiz = function(answer){
  if(!builderGameState || builderGameState.answered) return;
  builderGameState.answered = true;
  const current = builderGameState.game.data.questions[builderGameState.currentQuestionIndex || 0];
  const correct = current.correct;
  const status = document.getElementById("builderPlayStatus");
  if(!status) return;

  if(answer === correct){
    setFeedbackStatus(status, "✅ Resposta correta!", true);
  } else {
    setFeedbackStatus(status, `❌ Errado. A resposta correta é ${correct}.`, false);
  }

  setTimeout(() => {
    builderGameState.currentQuestionIndex += 1;
    builderGameState.answered = false;
    const questions = builderGameState.game.data.questions;
    if(builderGameState.currentQuestionIndex >= questions.length){
      status.textContent = `🎉 Quiz finalizado! ${questions.length}/${questions.length} corretas.`;
      const area = document.getElementById("builderImageQuizQuestionArea");
      if(area) area.innerHTML = "";
      return;
    }
    renderCurrentImageQuizQuestion();
  }, 1200);
};

function renderBuilderCompleteWordGame(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;
  builderGameState.status = "Digite a palavra que completa a lacuna.";

  const sentence = game.data.sentence || "";
  const displaySentence = sentence.includes('___') ? sentence : sentence.replace(game.data.answer, '___');

  content.innerHTML = `
    <p>Dica: ${game.data.hint}</p>
    <p class="complete-phrase">${displaySentence}</p>
    <input type="text" id="builderCompleteWordAnswer" placeholder="Digite a palavra que falta" class="builder-input">
    <button type="button" class="primary" onclick="submitBuilderCompleteWord()">Enviar</button>
    <div id="builderPlayStatus" class="association-status">${builderGameState.status}</div>
    <button type="button" class="primary" onclick="renderBuilderPlayArea(builderGameState.game, builderGameState.cardId)">Reiniciar</button>
  `;
}

window.submitBuilderCompleteWord = function(){
  if(!builderGameState) return;
  const answerInput = document.getElementById("builderCompleteWordAnswer");
  const status = document.getElementById("builderPlayStatus");
  if(!answerInput || !status) return;

  const answer = answerInput.value.trim().toLowerCase();
  const correct = builderGameState.game.data.answer.trim().toLowerCase();
  if(!answer){
    status.textContent = "Digite uma palavra para responder.";
    return;
  }

  if(answer === correct){
    setFeedbackStatus(status, "✅ Correto! Parabéns.", true);
  } else {
    setFeedbackStatus(status, `❌ Errado. A palavra correta é ${builderGameState.game.data.answer}.`, false);
  }
};

function renderBuilderSequenceGame(game){
  const content = document.getElementById("builderPlayContent");
  if(!content) return;

  const scrambled = shuffleArray(game.data.sequence);
  builderGameState.scrambled = scrambled;
  builderGameState.status = "Organize a sequência correta usando vírgulas.";

  content.innerHTML = `
    <p>Dica: ${game.data.hint}</p>
    <p>Sequência embaralhada: ${scrambled.join(", ")}</p>
    <input type="text" id="builderSequenceAnswer" placeholder="Escreva a sequência correta" class="builder-input">
    <button type="button" class="primary" onclick="submitBuilderSequence()">Enviar</button>
    <div id="builderPlayStatus" class="association-status">${builderGameState.status}</div>
    <button type="button" class="primary" onclick="renderBuilderPlayArea(builderGameState.game, builderGameState.cardId)">Reiniciar</button>
  `;
}

window.submitBuilderSequence = function(){
  if(!builderGameState) return;
  const answerInput = document.getElementById("builderSequenceAnswer");
  const status = document.getElementById("builderPlayStatus");
  if(!answerInput || !status) return;

  const answer = answerInput.value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const correct = builderGameState.game.data.sequence.map(item => item.trim());

  if(answer.length === 0){
    status.textContent = "Digite a sequência correta.";
    return;
  }

  const isCorrect = answer.length === correct.length && answer.every((item, index) => item === correct[index]);
  if(isCorrect){
    setFeedbackStatus(status, "✅ Sequência correta!", true);
  } else {
    setFeedbackStatus(status, `❌ Sequência incorreta. A correta é ${correct.join(', ')}.`, false);
  }
};

async function loadSavedQuizzes(){
  const container = document.getElementById("savedQuizList");
  if(!container) return;

  try {
    const snapshot = await getDocs(collection(db, "quizzes"));
    let html = "";
    snapshot.forEach(docItem => {
      const quiz = docItem.data();
      html += `
        <div class="question-card">
          <h3>${quiz.title}</h3>
          <p>${(quiz.questions || []).length} pergunta(s)</p>
          <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">
            <button class="primary" onclick="selectQuiz('${docItem.id}')">▶ Jogar</button>
            <button class="primary" onclick="deleteQuiz('${docItem.id}')">🗑 Excluir</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum quiz salvo</h3>
        <p>Crie um quiz usando perguntas existentes para jogá-lo.</p>
      </div>
    `;
  } catch(error){
    console.error("ERRO AO CARREGAR QUIZZES SALVOS:", error);
  }
}

window.deleteQuiz = async function(id){
  try {
    await deleteDoc(doc(db, "quizzes", id));
    await loadSavedQuizzes();
  } catch(error){
    console.error("ERRO AO DELETAR QUIZ:", error);
  }
};

window.loadQuestionsToSelect = async function(){
  await loadQuestions();

  const container = document.getElementById("questionsSelect");
  if(!container) return;

  let html = "";
  questions.forEach(q => {
    html += `
      <label class="builder-checkbox">
        <input type="checkbox" value="${q.id}">
        ${q.question}
      </label>
    `;
  });

  container.innerHTML = html;
};

window.saveQuiz = async function(){
  const title = document.getElementById("quizTitle")?.value.trim();
  if(!title){
    alert("Digite o nome do quiz");
    return;
  }

  const selected = Array.from(document.querySelectorAll("#questionsSelect input[type=checkbox]:checked")).map(input => input.value);
  if(selected.length === 0){
    alert("Selecione pelo menos uma pergunta");
    return;
  }

  try {
    await addDoc(collection(db, "quizzes"), {
      title,
      questions: selected,
      createdAt: new Date()
    });

    alert("✅ Quiz salvo com sucesso!");
    document.getElementById("quizTitle").value = "";
    document.getElementById("questionsSelect").innerHTML = "";
    await loadSavedQuizzes();
  } catch(error){
    console.error("ERRO AO SALVAR QUIZ:", error);
    alert("Erro ao salvar quiz: " + error.message);
  }
};

async function loadGameHub(){
  const summary = document.getElementById("gameHubSummary");
  const grid = document.getElementById("gamesGrid");
  const container = document.getElementById("gameContainer");
  if(!summary || !grid || !container) return;

  try {
    const [memorySnapshot, associationSnapshot, quizSnapshot, builderSnapshot] = await Promise.all([
      getDocs(collection(db, "memory_games")),
      getDocs(collection(db, "association_games")),
      getDocs(collection(db, "quizzes")),
      getDocs(collection(db, "builder_games"))
    ]);

    summary.innerHTML = `
      <div class="question-card">
        <h3>Resumo</h3>
        <p>Memória: ${memorySnapshot.size} jogo(s)</p>
        <p>Associação: ${associationSnapshot.size} jogo(s)</p>
        <p>Quizzes: ${quizSnapshot.size} jogo(s)</p>
        <p>Jogos personalizados: ${builderSnapshot.size} jogo(s)</p>
      </div>
    `;

    grid.innerHTML = `
      <div class="question-card">
        <h3>Criar ou Editar Jogos</h3>
        <p>Use o criador universal de jogos para criar todos os tipos em um só lugar.</p>
        <button class="primary" onclick="showScreen('gameBuilder')">Ir para Criador de Jogos</button>
      </div>
      <div class="question-card">
        <h3>Meus Jogos</h3>
        <p>Veja todos os jogos criados no criador de jogos.</p>
        <button class="primary" onclick="showScreen('gameBuilder')">Abrir jogos criados</button>
      </div>
    `;

    container.innerHTML = `
      <div class="question-card">
        <h3>Bem-vindo ao Centro de Jogos</h3>
        <p>Crie, gerencie e jogue todos os seus jogos a partir do Criador de Jogos.</p>
      </div>
      <div id="gameHubBuilderGames"></div>
    `;

    const hubBuilderContainer = document.getElementById("gameHubBuilderGames");
    if(hubBuilderContainer){
      const groups = {};
      builderSnapshot.forEach(docItem => {
        const game = docItem.data();
        const type = game.type || "outros";
        if(!groups[type]) groups[type] = [];
        groups[type].push({ id: docItem.id, game });
      });

      const typeLabels = {
        dragDrop: "Arrastar e Soltar",
        quiz: "Quiz sem Imagem",
        imageQuiz: "Quiz com Imagem",
        memory: "Memória",
        association: "Associação",
        crossword: "Palavras Cruzadas",
        completeWord: "Complete a Palavra",
        sequenceLogic: "Sequência Lógica",
        outros: "Outros"
      };

      let hubHtml = "";
      Object.keys(typeLabels).forEach(typeKey => {
        const items = groups[typeKey];
        if(!items || items.length === 0) return;
        hubHtml += `
          <div class="builder-category-header">
            <h2>${typeLabels[typeKey]}</h2>
          </div>
        `;
        items.forEach(item => {
          hubHtml += `
            <div class="question-card">
              <h3>${item.game.title}</h3>
              <p>${typeLabels[typeKey]}</p>
              <div class="button-row">
                <button class="primary" onclick="playBuilderGame('${item.id}')">▶ Jogar</button>
                <button class="primary" onclick="showScreen('gameBuilder'); editBuilderGame('${item.id}')">✏ Editar</button>
              </div>
            </div>
          `;
        });
      });

      hubBuilderContainer.innerHTML = hubHtml || `
        <div class="question-card">
          <h3>Nenhum jogo criado ainda</h3>
          <p>Vá para o Criador de Jogos e crie seu primeiro jogo.</p>
        </div>
      `;
    }
  } catch(error){
    console.error("ERRO AO CARREGAR GAMES HUB:", error);
  }
}

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

  const themeInput = document.getElementById('theme');
  const difficultyInput = document.getElementById('aiDifficulty');
  const theme = (themeInput?.value || '').trim();
  const difficulty = (difficultyInput?.value || 'medium');

  if(!theme){
    alert('Digite um tema para gerar a pergunta.');
    return;
  }

  // Geração simples e determinística de alternativas
  const safeTheme = theme.replace(/\s+/g, ' ').trim();

  let qText = '';
  if(difficulty === 'easy'){
    qText = `O que é ${safeTheme}?`;
  } else if(difficulty === 'hard'){
    qText = `Qual afirmação abaixo é correta sobre ${safeTheme}?`;
  } else {
    qText = `Qual é a definição mais adequada de ${safeTheme}?`;
  }

  const a = `${safeTheme} é a definição correta e mais comum relacionada ao termo.`;
  const b = `${safeTheme} refere-se a um aspecto relacionado, mas não é a definição correta.`;
  const c = `Um conceito frequentemente confundido com ${safeTheme}, porém diferente.`;
  const d = `Uma alternativa incorreta ou não relacionada a ${safeTheme}.`;

  const generated = {
    question: qText,
    a, b, c, d,
    correct: 'A',
    metadata: { theme: safeTheme, difficulty }
  };

  // Salva em variável global temporária para o botão "Salvar"
  window.lastGeneratedAIQuestion = generated;

  const html = `
    <div class="question-card">
      <h3>${generated.question}</h3>
      <button class="option">A) ${generated.a}</button>
      <button class="option">B) ${generated.b}</button>
      <button class="option">C) ${generated.c}</button>
      <button class="option">D) ${generated.d}</button>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <button class="primary" onclick="saveGeneratedQuestion()">💾 Salvar pergunta</button>
        <button class="secondary" onclick="document.getElementById('aiResult').innerHTML = ''">✖ Limpar</button>
      </div>
    </div>
  `;

  const result = document.getElementById('aiResult');
  if(result) result.innerHTML = html;
};

window.saveGeneratedQuestion = async function(){
  const gen = window.lastGeneratedAIQuestion;
  if(!gen){
    alert('Nenhuma pergunta gerada para salvar.');
    return;
  }

  try {
    await addDoc(collection(db, 'questions'), {
      question: gen.question,
      a: gen.a,
      b: gen.b,
      c: gen.c,
      d: gen.d,
      correct: gen.correct,
      createdAt: new Date(),
      aiGenerated: true,
      aiMetadata: gen.metadata
    });

    alert('✅ Pergunta gerada salva com sucesso!');
    // Atualiza lista local
    await loadQuestions();
    document.getElementById('aiResult').innerHTML = '';
    window.lastGeneratedAIQuestion = null;
  } catch(error){
    console.error('ERRO AO SALVAR PERGUNTA GERADA:', error);
    alert('Erro ao salvar pergunta: ' + (error.message || error.toString()));
  }
};

// ==========================
// GERAR JOGO A PARTIR DE DICAS
// ==========================
window.generateAIGameFromHints = async function(){

  const raw = document.getElementById('aiGameHints')?.value || '';
  const type = document.getElementById('aiGameType')?.value || 'association';
  const title = (document.getElementById('aiGameTitle')?.value || '').trim() || `Jogo criado: ${new Date().toLocaleString()}`;

  if(!raw.trim()){
    alert('Insira pelo menos uma dica para gerar o jogo.');
    return;
  }

  // Parse hints: accept lines in form "left - right" or single words
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const pairs = [];

  lines.forEach(line => {
    const sep = line.split('-');
    if(sep.length >= 2){
      const left = sep[0].trim();
      const right = sep.slice(1).join('-').trim();
      if(left && right) pairs.push({ left, right });
    } else {
      // fallback: duplicate term as pair
      const term = line.trim();
      pairs.push({ left: term, right: term });
    }
  });

  if(pairs.length === 0){
    alert('Nenhum par válido nas dicas. Use o formato "esquerda - direita" em cada linha.');
    return;
  }

  // Build game object depending on type
  let gameData = {};

  if(type === 'association' || type === 'dragDrop'){
    gameData = { pairs };
  } else if(type === 'completeWord'){
    // use first pair: left = sentence with ___, right = answer
    const p = pairs[0];
    gameData = { sentence: p.left.includes('___') ? p.left : (p.left + ' ___'), answer: p.right, hint: 'Complete a palavra' };
  } else if(type === 'sequenceLogic'){
    gameData = { sequence: pairs.map(p => p.left), hint: 'Ordene corretamente' };
  } else if(type === 'quiz'){
    const questions = pairs.map((p, i) => ({ question: `Sobre ${p.left}: escolha a resposta correta.`, a: p.right, b: 'Opção B', c: 'Opção C', d: 'Opção D', correct: 'A' }));
    gameData = { questions };
  } else if(type === 'imageQuiz'){
    // create a simple image quiz with questions from hints (no images generated)
    const questions = pairs.map((p, i) => ({ question: `Sobre ${p.left}: escolha a resposta correta.`, a: p.right, b: 'Opção B', c: 'Opção C', d: 'Opção D', correct: 'A' }));
    gameData = { image: '', questions };
  }

  // Preview and save (render safe HTML and attach listener)
  const resultDiv = document.getElementById('aiGameResult');
  if(resultDiv){
    const btnId = 'saveAIGameBtn_' + Date.now();
    resultDiv.innerHTML = `<div class="question-card"><h3>Preview: ${escapeHtml(title)}</h3><pre style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(gameData, null, 2))}</pre><div style="margin-top:8px;"><button id="${btnId}" class='primary' data-game-type="${escapeHtml(type)}" data-game-title="${encodeURIComponent(title)}">💾 Salvar jogo</button></div></div>`;
    const btn = document.getElementById(btnId);
    if(btn){
      btn.addEventListener('click', ()=>{
        const gType = btn.dataset.gameType;
        const gTitle = decodeURIComponent(btn.dataset.gameTitle || '');
        saveAIGame(gType, gTitle);
      });
    }
  }
};

// GERA JOGO A PARTIR DO TEMA (heurística simples)
window.generateAIGameFromTheme = async function(){
  const theme = (document.getElementById('theme')?.value || '').trim();
  const type = document.getElementById('aiGameType')?.value || 'association';
  const title = (document.getElementById('aiGameTitle')?.value || '').trim() || `Jogo: ${theme}`;

  if(!theme){
    alert('Digite um tema para criar o jogo.');
    return;
  }

  // Heurística: extrair palavras-chave do tema (split por vírgula/espaco)
  const tokens = theme.split(/[,;\-\/]+|\s+/).map(t=>t.trim()).filter(Boolean).slice(0,10);

  if(tokens.length === 0){
    alert('Tema insuficiente para gerar conteúdo.');
    return;
  }

  // Construir pares simples: token => descrição genérica
  const pairs = tokens.map(t => ({ left: t, right: `Definição de ${t}` }));

  // Se tipo for completeWord, usar o primeiro token como lacuna
  let gameData = {};
  if(type === 'association' || type === 'dragDrop') gameData = { pairs };
  else if(type === 'completeWord') gameData = { sentence: `Complete: ${tokens[0]} ___`, answer: tokens[1] || tokens[0], hint: `Dica sobre ${tokens[0]}` };
  else if(type === 'sequenceLogic') gameData = { sequence: tokens, hint: `Ordene os termos relacionados a ${theme}` };
  else if(type === 'imageQuiz') gameData = { image: '', questions: tokens.map(t => ({ question: `O que melhor descreve ${t}?`, a: `Definição de ${t}`, b: 'Opção B', c: 'Opção C', d: 'Opção D', correct: 'A' })) };

  // Mostrar preview e permitir salvar
  const resultDiv = document.getElementById('aiGameResult');
  if(resultDiv){
    const btnId = 'saveAIGameBtn_' + Date.now();
    resultDiv.innerHTML = `<div class="question-card"><h3>Preview: ${escapeHtml(title)}</h3><pre style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(gameData, null, 2))}</pre><div style="margin-top:8px;"><button id="${btnId}" class='primary'>💾 Salvar jogo</button></div></div>`;
    const btn = document.getElementById(btnId);
    if(btn) btn.addEventListener('click', ()=> saveAIGame(type, title));
  }
};

function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"']/g, function(s){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
  });
}

window.saveAIGame = async function(type, title){
  try {
    const raw = document.getElementById('aiGameHints')?.value || '';
    const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
    const pairs = lines.map(line => {
      const sep = line.split('-');
      if(sep.length >= 2) return { left: sep[0].trim(), right: sep.slice(1).join('-').trim() };
      return { left: line.trim(), right: line.trim() };
    });

    let data = {};
    if(type === 'association' || type === 'dragDrop') data = { pairs };
    else if(type === 'completeWord') data = { sentence: pairs[0].left.includes('___') ? pairs[0].left : (pairs[0].left + ' ___'), answer: pairs[0].right, hint: 'Complete a palavra' };
    else if(type === 'sequenceLogic') data = { sequence: pairs.map(p => p.left), hint: 'Ordene corretamente' };
  else if(type === 'quiz') data = { questions: pairs.map(p => ({ question: `Sobre ${p.left}: escolha a resposta correta.`, a: p.right, b: 'Opção B', c: 'Opção C', d: 'Opção D', correct: 'A' })) };

    await addDoc(collection(db, 'builder_games'), { title, type, data, createdAt: new Date() });
    alert('✅ Jogo salvo com sucesso!');
    document.getElementById('aiGameResult').innerHTML = '';
    document.getElementById('aiGameHints').value = '';
    await loadBuilderGames();
  } catch(error){
    console.error('ERRO AO SALVAR JOGO IA:', error);
    alert('Erro ao salvar jogo: ' + (error.message || error.toString()));
  }
};

// ==========================
// INICIAR QUIZ
// ==========================
window.startQuiz = async function(){

  const playerNameInput = document.getElementById('playerName');
  const playerName = playerNameInput?.value.trim();

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
    flashQuestionCard(true);
    playFeedbackSound(true);
  } else {
    flashQuestionCard(false);
    playFeedbackSound(false);
  }

  setTimeout(()=>{

    currentQuestionIndex++;

    renderQuiz();

  },1500);
};

function flashQuestionCard(isCorrect){
  const card = document.querySelector('.question-card');
  if(!card) return;
  card.classList.remove('feedback-card-correct', 'feedback-card-wrong');
  card.classList.add(isCorrect ? 'feedback-card-correct' : 'feedback-card-wrong');
  setTimeout(()=>{
    card.classList.remove('feedback-card-correct', 'feedback-card-wrong');
  }, 400);
}

function playFeedbackSound(isCorrect){
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = isCorrect ? 'sine' : 'square';
    osc.frequency.setValueAtTime(isCorrect ? 880 : 220, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch(error){
    console.warn('Áudio de feedback não está disponível', error);
  }
}

function setFeedbackStatus(status, message, isCorrect){
  if(!status) return;
  status.textContent = message;
  status.classList.remove('feedback-correct', 'feedback-wrong');
  status.classList.add(isCorrect ? 'feedback-correct' : 'feedback-wrong');
  playFeedbackSound(isCorrect);
}

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

          <div>
            <h3>${player.playerName}</h3>
            <p>${player.score}/${player.total}</p>
          </div>

          <button class="primary small" onclick="deleteRankingEntry('${docItem.id}')">🗑</button>

        </div>
      `;
    });

    rankingDiv.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum resultado no ranking</h3>
        <p>Jogue um quiz para gerar resultados.</p>
      </div>
    `;

  } catch(error){

    console.error(
      "ERRO RANKING:",
      error
    );
  }
}

window.deleteRankingEntry = async function(id){
  try {
    await deleteDoc(doc(db, "quiz_results", id));
    await loadRanking();
  } catch(error){
    console.error("ERRO AO DELETAR RANKING:", error);
    alert("Erro ao excluir resultado: " + error.message);
  }
};

window.addEventListener("DOMContentLoaded", async ()=>{
  await loadScreens();

  const savedName =
    localStorage.getItem("playerName");

  if(savedName){
    const playerInput = document.getElementById("playerName");
    if(playerInput) playerInput.value = savedName;
  }

  await loadMemoryGames();
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
    document.querySelector(".screen.active #memoryImage, .screen.active #builderMemoryImage, #memoryImage, #builderMemoryImage");

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
    document.getElementById("memoryTitle").value = "";

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

    container.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum jogo de memória salvo</h3>
        <p>Envie imagens e salve um jogo para começar.</p>
      </div>
    `;

    console.log("✅ LISTA RENDERIZADA");

  } catch(error){

    console.error(
      "❌ ERRO LOAD GAMES:",
      error
    );
  }
}

window.playMemoryGame = async function(id){

  showScreen('memoryGame');

  console.log(
    "🎮 PLAY GAME:",
    id
  );

  const querySnapshot =
    await getDocs(
      collection(db, "memory_games")
    );

  let found = false;

  querySnapshot.forEach((docItem)=>{

    if(docItem.id === id){

      found = true;

      console.log(
        "✅ GAME ENCONTRADO"
      );

      currentMemoryGame =
        shuffleArray(
          docItem.data().cards || []
        );

      console.log(
        "🧠 CARDS GAME:",
        currentMemoryGame
      );

      renderMemoryBoard();
    }
  });

  if(!found){
    alert("Jogo de memória não encontrado.");
  }
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

  updateMemoryInfo();

  const info = document.getElementById("memoryInfo");
  if(info){
    info.innerHTML = `
      <div class="memory-info-row">
        <div><strong>Movimentos:</strong> ${moves}</div>
        <div><strong>Matches:</strong> ${matches}/${currentMemoryGame.length / 2}</strong></div>
        <button type="button" class="primary" onclick="renderMemoryBoard()">Reiniciar</button>
      </div>
    `;
  }

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

    updateMemoryInfo();
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
      updateMemoryInfo();

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

console.log("✅ SCRIPT FINALIZADO");

console.log(
  "FUNÇÃO ADD:",
  window.addMemoryCard
);

window.playAssociationGame = async function(id) {
  const snapshot = await getDocs(
    collection(db, "association_games")
  );

  let selectedGame = null;

  snapshot.forEach(docItem => {
    if (docItem.id === id) {
      selectedGame = { id: docItem.id, ...docItem.data() };
    }
  });

  if (!selectedGame) {
    alert("Jogo de associação não encontrado.");
    return;
  }

  showScreen('associationGame');

  const container = document.getElementById("associationGameContainer");
  if (!container) return;

  const pairs = selectedGame.pairs.map((pair, index) => ({
    id: index,
    left: pair.left,
    right: pair.right
  }));

  const mode = selectedGame.mode || 'lines';
  const leftItems = shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.left })));
  const rightItems = shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.right })));
  let matchedPairs = 0;

  container.innerHTML = `
    <div class="question-card association-game-card">
      <h3>${selectedGame.title}</h3>
      <p>${pairs.length} pares</p>
      <div id="associationGameStatus" class="association-status">${mode === 'numbers' ? 'Escolha um item à esquerda e depois o item correspondente à direita.' : 'Arraste o item da esquerda para o par correto à direita.'}</div>
      <div class="association-board">
        <div class="association-column">
          <h4>${mode === 'numbers' ? 'Coluna 1' : 'Arraste estes itens'}</h4>
          <div id="associationLeftList" class="association-list"></div>
        </div>
        <div class="association-column">
          <h4>${mode === 'numbers' ? 'Coluna 2' : 'Solte no par correto'}</h4>
          <div id="associationRightList" class="association-list"></div>
        </div>
      </div>
      <button id="associationReset" type="button" class="primary">Reiniciar</button>
    </div>
  `;

  const status = document.getElementById("associationGameStatus");
  const leftList = document.getElementById("associationLeftList");
  const rightList = document.getElementById("associationRightList");
  const resetButton = document.getElementById("associationReset");
  let selectedLeftId = null;

  function updateStatus(message) {
    if (status) status.textContent = message;
  }

  function renderLists() {
    leftList.innerHTML = "";
    rightList.innerHTML = "";

    if (mode === 'numbers') {
      leftItems.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'association-option association-option-number';
        button.innerHTML = `<span class="association-number">${item.number}</span><span>${escapeHtml(item.text)}</span>`;
        button.onclick = () => {
          selectedLeftId = item.id;
          updateStatus('Agora escolha o item correspondente da direita.');
          renderLists();
        };
        leftList.appendChild(button);
      });

      rightItems.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'association-option association-option-number';
        button.innerHTML = `<span class="association-number">${item.number}</span><span>${escapeHtml(item.text)}</span>`;
        button.onclick = () => {
          if (selectedLeftId === null) {
            updateStatus('Selecione um item à esquerda primeiro.');
            return;
          }
          if (selectedLeftId === item.id) {
            matchedPairs += 1;
            leftItems.splice(leftItems.findIndex(i => i.id === selectedLeftId), 1);
            rightItems.splice(rightItems.findIndex(i => i.id === item.id), 1);
            updateStatus(matchedPairs === pairs.length ? '🎉 Parabéns! Jogo completo.' : '✅ Correto! Continue com o próximo par.');
          } else {
            updateStatus('❌ Errado. Tente novamente.');
          }
          renderLists();
        };
        rightList.appendChild(button);
      });
      return;
    }

    leftItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option';
      button.textContent = item.text;
      button.draggable = true;
      button.dataset.id = item.id;
      button.ondragstart = event => {
        event.dataTransfer.setData('text/plain', item.id);
        updateStatus('Solte no item correspondente à direita.');
      };
      leftList.appendChild(button);
    });

    rightItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'association-option';
      button.textContent = item.text;
      button.dataset.id = item.id;
      button.ondragover = event => {
        event.preventDefault();
        button.classList.add('drag-over');
      };
      button.ondragleave = () => {
        button.classList.remove('drag-over');
      };
      button.ondrop = event => {
        event.preventDefault();
        button.classList.remove('drag-over');
        const draggedId = parseInt(event.dataTransfer.getData('text/plain'), 10);
        if (draggedId === item.id) {
          leftItems.splice(leftItems.findIndex(i => i.id === draggedId), 1);
          rightItems.splice(rightItems.findIndex(i => i.id === item.id), 1);
          matchedPairs += 1;
          if (matchedPairs === pairs.length) {
            updateStatus('🎉 Parabéns! Jogo completo.');
          } else {
            updateStatus('✅ Correto! Continue com o próximo par.');
          }
        } else {
          updateStatus('❌ Errado. Tente novamente.');
        }
        renderLists();
      };
      rightList.appendChild(button);
    });

    if (leftItems.length === 0 && rightItems.length === 0) {
      updateStatus('Jogo concluído!');
    }
  }

  resetButton.onclick = () => {
    matchedPairs = 0;
    leftItems.splice(0, leftItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.left }))));
    rightItems.splice(0, rightItems.length, ...shuffleArray(pairs.map(pair => ({ id: pair.id, number: pair.id + 1, text: pair.right }))));
    updateStatus(mode === 'numbers' ? 'Escolha um item à esquerda e depois o item correspondente à direita.' : 'Arraste o item da esquerda para o par correto à direita.');
    renderLists();
  };

  renderLists();
};

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

  container.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum quiz salvo</h3>
        <p>Crie um quiz na aba de criação para começar a jogar.</p>
      </div>
    `;
}

window.selectQuiz = async function(quizId) {

  const playerNameInput = document.getElementById('playerName');
  const playerName = playerNameInput?.value.trim();

  if(!playerName){
    alert("⚠ Digite seu nome antes de jogar.");
    return;
  }

  localStorage.setItem("playerName", playerName);

  const quizDoc = await getDocs(collection(db, "quizzes"));

  let selectedQuiz = null;

  quizDoc.forEach(docItem => {
    if (docItem.id === quizId) {
      selectedQuiz = docItem.data();
    }
  });

  if (!selectedQuiz) {
    alert("Quiz não encontrado.");
    return;
  }

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


window.addPair = function () {

  const container =
    document.getElementById("pairsContainer");

  const pair =
    document.createElement("div");

  pair.className = "pair-row";

  pair.innerHTML = `
    <textarea
      placeholder="Item esquerdo"
      class="left-item builder-input builder-textarea"
      rows="2"
    ></textarea>

    <textarea
      placeholder="Item direito"
      class="right-item builder-input builder-textarea"
      rows="2"
    ></textarea>
  `;

  container.appendChild(pair);
};

let associationPairs = [];

window.saveGame = async function () {

  const title =
    document.getElementById("gameTitle").value.trim();

  if (!title) {
    alert("Digite um título");
    return;
  }

  const rows =
    document.querySelectorAll(".pair-row");

  const pairs = [];

  rows.forEach(row => {

    const left =
      row.querySelector(".left-item").value.trim();

    const right =
      row.querySelector(".right-item").value.trim();

    if (left && right) {
      pairs.push({ left, right });
    }

  });

  if (pairs.length === 0) {
    alert("Adicione pelo menos um par");
    return;
  }

  await addDoc(
    collection(db, "association_games"),
    {
      title,
      pairs,
      mode: document.getElementById("associationMode").value,
      createdAt: new Date()
    }
  );

  alert("✅ Jogo salvo!");
  document.getElementById("gameTitle").value = "";
  document.getElementById("pairsContainer").innerHTML = "";

  await loadAssociationList();
};

window.loadAssociationList = async function () {

  const container =
    document.getElementById("associationList");

  if (!container) return;

  const snapshot =
    await getDocs(
      collection(db, "association_games")
    );

  let html = "";

  snapshot.forEach(docItem => {

    const game = docItem.data();

    html += `
      <div class="question-card">

        <h3>${game.title}</h3>

        <p>
          ${game.pairs.length} pares
        </p>

        <button
          class="primary"
          onclick="playAssociationGame('${docItem.id}')"
        >
          ▶ Jogar
        </button>

      </div>
    `;
  });

  container.innerHTML = html || `
      <div class="question-card">
        <h3>Nenhum jogo de associação salvo</h3>
        <p>Crie pares e salve um jogo para começar.</p>
      </div>
    `;
};

