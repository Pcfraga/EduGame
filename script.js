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
let memoryGames = [];
let editingMemoryGameId = null;

let currentMemoryGame = [];

let quizzes = [];
let editingQuizId = null;

let associationGames = [];
let currentAssociationGame = null;
let editingAssociationGameId = null;
let associationScore = 0;
let associationAttempts = 0;
let associationMatchedPairs = 0;
let associationDrag = null;
let dragDropGames = [];
let imageQuizGames = [];
let completeWordGames = [];
let sequenceLogicGames = [];
let editingBuilderGameType = null;
let editingBuilderGameId = null;
let currentCustomGame = null;

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

  case "quizBuilder":
    await loadSavedQuizzes();
    break;

  case "playQuiz":
    await loadQuizzesList();
    await startQuiz();
    break;

  case "gamesHub":
    await loadBuilderGames();
    renderGamesHub();
    break;

  case "gameBuilder":
    await loadBuilderGames();
    renderBuilderForm();
    break;

  case "ranking":
    await loadRanking();
    break;

  case "memoryGame":
    await loadMemoryGames();
    break;

  case "associationBuilder":
    await loadAssociationGames();
    ensureAssociationRows();
    break;

  case "associationGame":
    renderAssociationGame();
    break;
}
};

let gameProfile = null;
let currentMiniGame = null;
let associationMatchState = null;
let associationMatchRightState = null;
let selectedAssociationLeft = null;
let selectedAssociationRight = null;
let dragDropCurrent = null;
let memoryCardsMini = [];
let firstMemoryCardMini = null;
let secondMemoryCardMini = null;
let memoryLockMini = false;
let imageQuizState = null;
let sequenceState = null;

const gameHubDefinitions = [
  { id:'association', title:'Associação', description:'Combine itens com categorias', icon:'🔗' },
  { id:'dragDrop', title:'Arrastar e Soltar', description:'Leve o objeto para o lugar certo', icon:'🧲' },
  { id:'miniMemory', title:'Memória Educativa', description:'Encontre pares de imagem e palavra', icon:'🧠' },
  { id:'imageQuiz', title:'Quiz com imagens', description:'Responda com figuras', icon:'📷' },
  { id:'completeWord', title:'Complete a palavra', description:'Escolha a letra correta', icon:'✏️' },
  { id:'sequenceLogic', title:'Sequência lógica', description:'Descubra o próximo número', icon:'🔢' },
  { id:'missions', title:'Missões', description:'Veja suas tarefas e recompensas', icon:'🏅' }
];

const gameHubMissions = [
  { id:'association', label:'Completar 1 associação' },
  { id:'dragDrop', label:'Fazer 1 arrastar e soltar' },
  { id:'miniMemory', label:'Fazer 1 memória' },
  { id:'imageQuiz', label:'Fazer 1 quiz com imagens' },
  { id:'completeWord', label:'Completar 1 palavra' },
  { id:'sequenceLogic', label:'Resolver 1 sequência lógica' }
];

function loadGameProfile(){
  const saved = localStorage.getItem('edugameProfile');
  if(saved){
    try {
      gameProfile = JSON.parse(saved);
    } catch {
      gameProfile = null;
    }
  }

  if(!gameProfile || typeof gameProfile !== 'object'){
    gameProfile = {
      playerName: 'Jogador',
      xp: 0,
      missions: {},
      completed: {}
    };
  }

  gameHubMissions.forEach(m => {
    if(typeof gameProfile.missions[m.id] !== 'boolean'){
      gameProfile.missions[m.id] = false;
    }
  });

  if(!gameProfile.completed){
    gameProfile.completed = {};
  }

  saveGameProfile();
}

function saveGameProfile(){
  localStorage.setItem(
    'edugameProfile',
    JSON.stringify(gameProfile)
  );
}

function getGameLevel(){
  return Math.floor(gameProfile.xp / 50) + 1;
}

function getXpToNext(){
  return 50 - (gameProfile.xp % 50);
}

function updateGamesHubSummary(){
  const summary = document.getElementById('gameHubSummary');
  if(!summary) return;

  summary.innerHTML = `
    <div class="card">
      <h3>Nome</h3>
      <p>${gameProfile.playerName}</p>
    </div>
    <div class="card">
      <h3>Nível</h3>
      <p>${getGameLevel()}</p>
    </div>
    <div class="card">
      <h3>XP</h3>
      <p>${gameProfile.xp} (+${getXpToNext()} para o próximo nível)</p>
    </div>
    <div class="card">
      <h3>Missões</h3>
      <p>${Object.values(gameProfile.missions).filter(Boolean).length}/${gameHubMissions.length}</p>
    </div>
  `;
}

function addGameXp(amount){
  gameProfile.xp += amount;
  if(gameProfile.xp < 0) gameProfile.xp = 0;
  saveGameProfile();
  updateGamesHubSummary();
}

function completeGameMission(id){
  if(!gameProfile.missions[id]){
    gameProfile.missions[id] = true;
    saveGameProfile();
    updateGamesHubSummary();
  }
}

function updatePlayerName(name){
  if(!name || !name.trim()) return;
  gameProfile.playerName = name.trim();
  saveGameProfile();
}

function renderGamesHub(){
  loadGameProfile();

  const summary = document.getElementById('gameHubSummary');
  const grid = document.getElementById('gamesGrid');
  const container = document.getElementById('gameContainer');
  const hubNameInput = document.getElementById('hubPlayerName');

  if(hubNameInput){
    hubNameInput.value = gameProfile.playerName;
    hubNameInput.onchange = () => updatePlayerName(hubNameInput.value);
    hubNameInput.onblur = () => updatePlayerName(hubNameInput.value);
  }

  if(summary){
    const savedCount =
      dragDropGames.length +
      imageQuizGames.length +
      completeWordGames.length +
      sequenceLogicGames.length;

    summary.innerHTML = `
      <div class="card">
        <h3>Nome</h3>
        <p>${gameProfile.playerName}</p>
      </div>
      <div class="card">
        <h3>Nível</h3>
        <p>${getGameLevel()}</p>
      </div>
      <div class="card">
        <h3>XP</h3>
        <p>${gameProfile.xp} (+${getXpToNext()} para o próximo nível)</p>
      </div>
      <div class="card">
        <h3>Missões</h3>
        <p>${Object.values(gameProfile.missions).filter(Boolean).length}/${gameHubMissions.length}</p>
      </div>
      <div class="card">
        <h3>Jogos salvos</h3>
        <p>${savedCount} personalizados</p>
      </div>
    `;
  }

  if(grid){
    let html = '';
    gameHubDefinitions.forEach(game => {
      html += `
        <div class="game-card">
          <h3>${game.icon} ${game.title}</h3>
          <p>${game.description}</p>
          <button class="primary" onclick="showMiniGame('${game.id}')">
            ▶ Jogar
          </button>
        </div>
      `;
    });

    const customCount = dragDropGames.length + imageQuizGames.length + completeWordGames.length + sequenceLogicGames.length;
    if(customCount > 0){
      html += `
        <div class="game-card" style="grid-column:span 2;">
          <h3>🧩 Meus Jogos</h3>
          <p>${customCount} jogo(s) personalizado(s) salvo(s).</p>
          <button class="primary" onclick="showScreen('gameBuilder')">
            Criar / Jogar Meus Jogos
          </button>
        </div>
      `;
    }

    grid.innerHTML = html;
  }

  if(container){
    container.className = 'game-container';
    container.innerHTML = `
      <div class="question-card">
        <h3>Escolha um jogo</h3>
        <p>Toque em um dos minijogos acima para começar.</p>
      </div>
    `;
  }
}

window.showMiniGame = function(id){
  currentMiniGame = id;
  const container = document.getElementById('gameContainer');
  if(!container) return;

  switch(id){
    case 'association':
      renderAssociationMatchGame();
      break;
    case 'dragDrop':
      renderDragDropGame();
      break;
    case 'miniMemory':
      renderMiniMemoryGame();
      break;
    case 'imageQuiz':
      renderImageQuizGame();
      break;
    case 'completeWord':
      renderCompleteWordGame();
      break;
    case 'sequenceLogic':
      renderSequenceLogicGame();
      break;
    case 'missions':
      renderMissions();
      break;
  }
};

function renderAssociationMatchGame(){
  const container = document.getElementById('gameContainer');
  const pairs = [
    { left:'Trator', right:'Rural' },
    { left:'Prédio', right:'Urbana' },
    { left:'Vaca', right:'Rural' },
    { left:'Semáforo', right:'Urbana' }
  ];

  associationMatchState = pairs.map(pair => ({
    left: pair.left,
    right: pair.right,
    matched: false
  }));
  selectedAssociationLeft = null;
  selectedAssociationRight = null;

  const leftHtml = associationMatchState.map((item,index) => `
    <button class="primary" data-index="${index}" onclick="selectAssociationLeft(${index})">
      ${item.left}
    </button>
  `).join('');

  associationMatchRightState = [...associationMatchState]
    .map((item,index) => ({ right:item.right, left:item.left, index }))
    .sort(() => Math.random()-0.5);

  const rightHtml = associationMatchRightState.map((item,index) => `
    <button class="primary" data-right="${index}" onclick="selectAssociationRight(${index})">
      ${item.right}
    </button>
  `).join('');

  container.innerHTML = `
    <div class="question-card">
      <h2>Associação</h2>
      <p>Selecione um item à esquerda e depois a categoria correta à direita.</p>
      <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:16px;">
        <div style="flex:1; min-width:180px;">
          <h4>Objetos</h4>
          ${leftHtml}
        </div>
        <div style="flex:1; min-width:180px;">
          <h4>Categoria</h4>
          ${rightHtml}
        </div>
      </div>
      <div id="associationResult" class="association-result"></div>
    </div>
  `;
}

window.selectAssociationLeft = function(index){
  selectedAssociationLeft = index;
  updateAssociationSelection();
};

window.selectAssociationRight = function(rightIndex){
  if(selectedAssociationLeft === null) return;

  const leftItem = associationMatchState[selectedAssociationLeft];
  const selectedRight = associationMatchRightState[rightIndex];

  const resultEl = document.getElementById('associationResult');

  if(leftItem.right === selectedRight.right){
    leftItem.matched = true;
    const target = associationMatchState.find(item => item.left === selectedRight.left && item.right === selectedRight.right);
    if(target) target.matched = true;
    if(resultEl) resultEl.innerText = '✅ Corretíssimo!';
    addGameXp(10);

    const leftBtn = document.querySelector(`#gameContainer button[data-index='${selectedAssociationLeft}']`);
    const rightBtn = document.querySelector(`#gameContainer button[data-right='${rightIndex}']`);
    if(leftBtn){
      leftBtn.disabled = true;
      leftBtn.classList.add('option-correct');
    }
    if(rightBtn){
      rightBtn.disabled = true;
      rightBtn.classList.add('option-correct');
    }
  } else {
    if(resultEl) resultEl.innerText = '❌ Tente novamente.';
    const rightBtn = document.querySelector(`#gameContainer button[data-right='${rightIndex}']`);
    if(rightBtn){
      rightBtn.classList.add('option-wrong');
      setTimeout(() => rightBtn.classList.remove('option-wrong'), 700);
    }
  }

  selectedAssociationLeft = null;
  selectedAssociationRight = null;
  updateAssociationSelection();
  checkAssociationCompletion();
};

function updateAssociationSelection(){
  const buttons = document.querySelectorAll('#gameContainer button[data-index], #gameContainer button[data-right]');
  buttons.forEach(btn => btn.classList.remove('option-correct','option-wrong'));

  if(selectedAssociationLeft !== null){
    const btn = document.querySelector(`#gameContainer button[data-index='${selectedAssociationLeft}']`);
    if(btn) btn.classList.add('option-correct');
  }
}

function checkAssociationCompletion(){
  if(!associationMatchState) return;
  if(associationMatchState.every(item => item.matched)){
    completeGameMission('association');
    const result = document.getElementById('associationResult');
    if(result) result.innerText = '🏆 Atividade concluída!';
  }
}

function renderDragDropGame(gameId){
  const container = document.getElementById('gameContainer');
  const customGame = gameId ? dragDropGames.find(item => item.id === gameId) : null;

  dragDropCurrent = customGame?.pairs?.length ? customGame.pairs : [
    { label:'Trator', category:'Rural' },
    { label:'Prédio', category:'Urbana' },
    { label:'Vaca', category:'Rural' },
    { label:'Semáforo', category:'Urbana' }
  ];

  const gameTitle = customGame?.title || 'Arrastar e Soltar';
  const categories = customGame?.pairs?.length ? Array.from(new Set(dragDropCurrent.map(item => item.category))) : ['Rural','Urbana'];

  container.innerHTML = `
    <div class="question-card">
      <h2>${gameTitle}</h2>
      <p>Arraste cada item para a categoria correta.</p>
      <div class="drag-drop-board">
        <div>
          <h4>Itens</h4>
          <div id="dragItems"></div>
        </div>
        <div>
          <h4>Categorias</h4>
          <div id="dropZones"></div>
        </div>
      </div>
      <div id="dragDropResult" class="association-result"></div>
    </div>
  `;

  const dragItems = document.getElementById('dragItems');
  const dropZones = document.getElementById('dropZones');

  dragItems.innerHTML = dragDropCurrent.map((item,index) => `
    <div class="draggable-item" draggable="true" data-index="${index}" id="drag-${index}">
      ${item.label}
    </div>
  `).join('');

  dropZones.innerHTML = categories.map(cat => `
    <div class="drop-zone" data-category="${cat}">
      <strong>${cat}</strong>
      <div class="drop-area" data-category="${cat}" style="min-height:80px; margin-top:12px;"></div>
    </div>
  `).join('');

  document.querySelectorAll('.draggable-item').forEach(item => {
    item.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', item.dataset.index);
    });
  });

  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', event => {
      event.preventDefault();
      zone.classList.add('active');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('active');
    });
    zone.addEventListener('drop', event => {
      event.preventDefault();
      zone.classList.remove('active');
      const index = Number(event.dataTransfer.getData('text/plain'));
      const itemData = dragDropCurrent[index];
      const category = zone.dataset.category;
      if(itemData.category === category){
        const dropArea = zone.querySelector('.drop-area');
        const dragged = document.getElementById(`drag-${index}`);
        if(dragged){
          dragged.classList.add('option-correct');
          dragged.draggable = false;
          dropArea.appendChild(dragged);
        }
        zone.classList.add('correct');
        addGameXp(8);
        checkDragDropCompletion();
      } else {
        zone.classList.add('wrong');
        setTimeout(()=> zone.classList.remove('wrong'), 800);
        const result = document.getElementById('dragDropResult');
        if(result) result.innerText = '❌ Não é aqui.';
      }
    });
  });
}

function checkDragDropCompletion(){
  const allDropped = Array.from(document.querySelectorAll('.draggable-item')).every(item => item.draggable === false);
  if(allDropped){
    completeGameMission('dragDrop');
    const result = document.getElementById('dragDropResult');
    if(result) result.innerText = '🏆 Parabéns! Você completou o jogo.';
  }
}

function renderMiniMemoryGame(){
  const container = document.getElementById('gameContainer');
  const cards = [
    { id:1, label:'🐶', type:'emoji' },
    { id:1, label:'Cachorro', type:'word' },
    { id:2, label:'🐱', type:'emoji' },
    { id:2, label:'Gato', type:'word' },
    { id:3, label:'🐄', type:'emoji' },
    { id:3, label:'Vaca', type:'word' }
  ];

  memoryCardsMini = cards.sort(() => Math.random() - 0.5);
  firstMemoryCardMini = null;
  secondMemoryCardMini = null;
  memoryLockMini = false;

  container.innerHTML = `
    <div class="question-card">
      <h2>Memória Educativa</h2>
      <p>Encontre os pares entre imagem e palavra.</p>
      <div class="memory-grid-mini" id="memoryGridMini"></div>
      <div id="memoryMiniResult" class="association-result"></div>
    </div>
  `;

  const grid = document.getElementById('memoryGridMini');
  if(!grid) return;

  grid.innerHTML = memoryCardsMini.map((card,index) => `
    <div class="memory-card-mini" data-index="${index}" onclick="flipMemoryCardMini(${index})">
      <span>?</span>
    </div>
  `).join('');
}

window.flipMemoryCardMini = function(index){
  if(memoryLockMini) return;
  const card = document.querySelector(`.memory-card-mini[data-index='${index}']`);
  if(!card || card.classList.contains('matched') || card === firstMemoryCardMini) return;

  card.classList.add('revealed');
  card.innerText = memoryCardsMini[index].label;

  if(!firstMemoryCardMini){
    firstMemoryCardMini = card;
    firstMemoryCardMini.dataset.cardId = memoryCardsMini[index].id;
    return;
  }

  secondMemoryCardMini = card;
  secondMemoryCardMini.dataset.cardId = memoryCardsMini[index].id;
  memoryLockMini = true;

  if(firstMemoryCardMini.dataset.cardId === secondMemoryCardMini.dataset.cardId){
    firstMemoryCardMini.classList.add('matched');
    secondMemoryCardMini.classList.add('matched');
    addGameXp(10);
    memoryLockMini = false;
    firstMemoryCardMini = null;
    secondMemoryCardMini = null;
    checkMemoryMiniCompletion();
  } else {
    setTimeout(() => {
      firstMemoryCardMini.classList.remove('revealed');
      secondMemoryCardMini.classList.remove('revealed');
      firstMemoryCardMini.innerText = '?';
      secondMemoryCardMini.innerText = '?';
      firstMemoryCardMini = null;
      secondMemoryCardMini = null;
      memoryLockMini = false;
    }, 1000);
  }
};

function checkMemoryMiniCompletion(){
  const matched = document.querySelectorAll('.memory-card-mini.matched').length;
  if(matched === memoryCardsMini.length){
    completeGameMission('miniMemory');
    const result = document.getElementById('memoryMiniResult');
    if(result) result.innerText = '🏆 Você completou o jogo da memória!';
  }
}

function renderImageQuizGame(gameId){
  const container = document.getElementById('gameContainer');
  const customGame = gameId ? imageQuizGames.find(item => item.id === gameId) : null;
  const defaultQuestions = [
    { image:'🐄', text:'Qual é este animal?', options:['Cavalo','Vaca','Ovelha'], answer:'Vaca' },
    { image:'🐶', text:'Qual é este animal?', options:['Gato','Cachorro','Porco'], answer:'Cachorro' },
    { image:'🐱', text:'Qual é este animal?', options:['Coelho','Gato','Cavalo'], answer:'Gato' }
  ];

  imageQuizState = {
    questions: customGame?.question ? [customGame.question] : defaultQuestions,
    current:0,
    score:0,
    title: customGame?.title || 'Quiz com imagens'
  };

  renderImageQuizQuestion();
}

function renderImageQuizQuestion(){
  const container = document.getElementById('gameContainer');
  if(!container || !imageQuizState) return;

  const question = imageQuizState.questions[imageQuizState.current];
  container.innerHTML = `
    <div class="question-card">
      <h2>${imageQuizState.title}</h2>
      <div style="font-size:80px; text-align:center; margin:20px 0;">${question.image}</div>
      <p>${question.text}</p>
      <div class="option-grid">
        ${question.options.map(option => `
          <button onclick="answerImageQuiz('${option}')">${option}</button>
        `).join('')}
      </div>
      <div id="imageQuizFeedback" class="association-result"></div>
    </div>
  `;
}

window.answerImageQuiz = function(answer){
  const feedback = document.getElementById('imageQuizFeedback');
  if(!imageQuizState) return;
  const question = imageQuizState.questions[imageQuizState.current];

  if(answer === question.answer){
    imageQuizState.score++;
    addGameXp(12);
    if(feedback) feedback.innerText = '✅ Correto!';
  } else {
    if(feedback) feedback.innerText = '❌ Errado!';
  }

  setTimeout(() => {
    imageQuizState.current++;
    if(imageQuizState.current >= imageQuizState.questions.length){
      completeGameMission('imageQuiz');
      const container = document.getElementById('gameContainer');
      if(container) container.innerHTML = `
        <div class="question-card">
          <h2>Quiz finalizado</h2>
          <p>Você acertou ${imageQuizState.score} de ${imageQuizState.questions.length}.</p>
          <button class="primary" onclick="showMiniGame('imageQuiz')">Jogar novamente</button>
        </div>
      `;
      imageQuizState = null;
      return;
    }
    renderImageQuizQuestion();
  }, 800);
};

function renderCompleteWordGame(gameId){
  const container = document.getElementById('gameContainer');
  const customGame = gameId ? completeWordGames.find(item => item.id === gameId) : null;
  const puzzle = customGame?.puzzle || {
    word:'CASA',
    display:'C A _ A',
    options:['S','P','T'],
    correct:'S'
  };

  const title = customGame?.title || 'Complete a Palavra';

  container.innerHTML = `
    <div class="question-card">
      <h2>${title}</h2>
      <p><strong>${puzzle.display}</strong></p>
      <div class="word-options">
        ${puzzle.options.map(letter => `
          <button onclick="answerCompleteWord('${letter}')">${letter}</button>
        `).join('')}
      </div>
      <div id="completeWordFeedback" class="association-result"></div>
    </div>
  `;
  window.completeWordPuzzle = puzzle;
}

window.answerCompleteWord = function(letter){
  const feedback = document.getElementById('completeWordFeedback');
  if(!window.completeWordPuzzle) return;
  if(letter === window.completeWordPuzzle.correct){
    addGameXp(15);
    completeGameMission('completeWord');
    if(feedback) feedback.innerText = '✅ Acertou! CASA está completa.';
  } else {
    if(feedback) feedback.innerText = '❌ Quase! Tente outra letra.';
  }
};

function renderSequenceLogicGame(gameId){
  const container = document.getElementById('gameContainer');
  const customGame = gameId ? sequenceLogicGames.find(item => item.id === gameId) : null;
  const sequence = customGame?.sequence || {
    prompt:'2 - 4 - 6 - ?',
    options:['7','8','10'],
    correct:'8'
  };
  sequenceState = sequence;
  const title = customGame?.title || 'Sequência Lógica';
  container.innerHTML = `
    <div class="question-card">
      <h2>${title}</h2>
      <p>${sequence.prompt}</p>
      <div class="sequence-options">
        ${sequence.options.map(option => `
          <button onclick="answerSequence('${option}')">${option}</button>
        `).join('')}
      </div>
      <div id="sequenceFeedback" class="association-result"></div>
    </div>
  `;
}

window.answerSequence = function(answer){
  const feedback = document.getElementById('sequenceFeedback');
  if(!sequenceState) return;
  if(answer === sequenceState.correct){
    addGameXp(12);
    completeGameMission('sequenceLogic');
    if(feedback) feedback.innerText = '✅ Certo! A sequência segue de 2 em 2.';
  } else {
    if(feedback) feedback.innerText = '❌ Errado. Pense em +2.';
  }
};

function renderMissions(){
  const container = document.getElementById('gameContainer');
  if(!container) return;

  const missionItems = gameHubMissions.map(m => ({
    ...m,
    done: gameProfile.missions[m.id]
  }));

  container.innerHTML = `
    <div class="question-card">
      <h2>Missões</h2>
      <div class="mission-list">
        ${missionItems.map(item => `
          <div class="mission-card ${item.done ? 'completed' : ''}">
            <h4>${item.label}</h4>
            <p>${item.done ? 'Concluído' : 'Pendente'}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.addPair = function(){

  const container =
    document.getElementById(
      "pairsContainer"
    );

  if(!container) return;

  const pairRow = document.createElement(
    'div'
  );

  pairRow.className =
    'association-pair';

  pairRow.innerHTML = `
    <input
      type="text"
      class="association-left-input"
      placeholder="Termo da esquerda"
    >

    <input
      type="text"
      class="association-right-input"
      placeholder="Termo da direita"
    >

    <button
      type="button"
      class="delete-btn"
      onclick="removePair(this)"
    >
      ✖
    </button>
  `;

  container.appendChild(pairRow);
};

window.removePair = function(button){

  const row = button.closest(
    '.association-pair'
  );

  if(row) row.remove();
};

function ensureAssociationRows(){
  const container = document.getElementById('pairsContainer');
  if(!container) return;
  const existingRows = container.querySelectorAll('.association-pair').length;
  for(let i = existingRows; i < 2; i++){
    addPair();
  }
}

window.saveGame = async function(){

  const title =
    document.getElementById(
      'gameTitle'
    ).value.trim();

  const mode =
    document.getElementById(
      'associationMode'
    ).value;

  const rows = Array.from(
    document.querySelectorAll(
      '.association-pair'
    )
  );

  if(!title){
    alert("⚠ Digite o título do jogo");
    return;
  }

  const pairs = rows.map(row => ({
    left: row
      .querySelector(
        '.association-left-input'
      )
      .value.trim(),
    right: row
      .querySelector(
        '.association-right-input'
      )
      .value.trim()
  })).filter(item => item.left && item.right);

  if(pairs.length < 2){
    alert("⚠ Adicione pelo menos 2 pares válidos");
    return;
  }

  try {
    if(editingAssociationGameId){
      await updateDoc(
        doc(db, "association_games", editingAssociationGameId),
        {
          title,
          mode,
          pairs,
          updatedAt: new Date()
        }
      );

      alert("✅ Jogo de associação atualizado!");
      editingAssociationGameId = null;
    } else {
      await addDoc(
        collection(db, "association_games"),
        {
          title,
          mode,
          pairs,
          createdAt: new Date()
        }
      );

      alert("✅ Jogo de associação salvo!");
    }

    document.getElementById(
      'gameTitle'
    ).value = "";

    document.getElementById(
      'pairsContainer'
    ).innerHTML = "";

    addPair();
    addPair();

    await loadAssociationGames();

  } catch(error){
    console.error(
      "ERRO AO SALVAR ASSOCIAÇÃO:",
      error
    );
    alert("Erro ao salvar jogo: " +
      (error.message || error));
  }
};

async function loadAssociationGames(){

  const container =
    document.getElementById(
      'associationList'
    );

  if(!container) return;

  try {
    const querySnapshot =
      await getDocs(
        collection(db, "association_games")
      );

    associationGames = [];

    querySnapshot.forEach(docItem => {
      associationGames.push({
        id: docItem.id,
        ...docItem.data()
      });
    });

    renderAssociationGameList();

  } catch(error){
    console.error(
      "ERRO AO CARREGAR ASSOCIAÇÕES:",
      error
    );
  }
}

function renderAssociationGameList(){

  const container =
    document.getElementById(
      'associationList'
    );

  if(!container) return;

  let html = "";

  associationGames.forEach(game => {
    html += `
      <div class="question-card">
        <h3>${game.title}</h3>
        <p>${game.pairs.length} pares</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="primary" onclick="playAssociationGame('${game.id}')">
            ▶ Jogar
          </button>
          <button class="primary" onclick="editAssociationGame('${game.id}')">
            ✏ Editar
          </button>
          <button class="delete-btn" onclick="deleteAssociationGame('${game.id}')">
            🗑 Excluir
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.editAssociationGame = function(id){
  const game = associationGames.find(item => item.id === id);

  if(!game){
    alert('Jogo de associação não encontrado');
    return;
  }

  editingAssociationGameId = id;
  document.getElementById('gameTitle').value = game.title;
  document.getElementById('associationMode').value = game.mode || 'numbers';

  const pairsContainer = document.getElementById('pairsContainer');
  pairsContainer.innerHTML = '';

  game.pairs.forEach(pair => {
    const pairRow = document.createElement('div');
    pairRow.className = 'association-pair';
    pairRow.innerHTML = `
      <input type="text" class="association-left-input" value="${pair.left}" placeholder="Termo da esquerda">
      <input type="text" class="association-right-input" value="${pair.right}" placeholder="Termo da direita">
      <button type="button" class="delete-btn" onclick="removePair(this)">✖</button>
    `;
    pairsContainer.appendChild(pairRow);
  });

  alert('✏ Jogo de associação carregado para edição. Ajuste e salve.');
};

window.playAssociationGame = async function(id){

  currentAssociationGame =
    associationGames.find(
      item => item.id === id
    );

  if(!currentAssociationGame){
    try {
      const docSnap = await getDoc(doc(db, 'association_games', id));
      if(docSnap.exists()){
        currentAssociationGame = {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
    } catch(error){
      console.error('ERRO AO CARREGAR JOGO DE ASSOCIAÇÃO:', error);
    }
  }

  if(!currentAssociationGame){
    alert("⚠ Jogo não encontrado");
    return;
  }

  associationScore = 0;
  associationAttempts = 0;
  associationMatchedPairs = 0;

  showScreen('associationGame');
  renderAssociationGame();
};

function renderAssociationGame(){

  const container =
    document.getElementById(
      'associationGameContainer'
    );

  if(!container) return;

  if(!currentAssociationGame){
    container.innerHTML = `
      <div class="question-card">
        <h2>Selecione um jogo de associação</h2>
        <p>Vá para o criador de associação e escolha um jogo salvo.</p>
      </div>
    `;
    return;
  }

  const pairs = currentAssociationGame.pairs.map(
    (item, index) => ({
      index,
      left: item.left,
      right: item.right
    })
  );

  const rightShuffled =
    [...pairs].sort(
      () => Math.random() - 0.5
    );

  const leftHtml = pairs.map(item => `
    <div class="association-item association-left-item"
      data-pair-index="${item.index}"
    >
      <span class="association-number">${item.index + 1}</span>
      <span>${item.left}</span>
    </div>
  `).join('');

  const rightHtml = rightShuffled.map(item => `
    <div class="association-item association-right-item"
      data-pair-index="${item.index}"
    >
      <span class="association-number">${String.fromCharCode(65 + item.index)}</span>
      <span>${item.right}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="association-scoreboard">
      <div>Pontuação: <strong id="associationScore">${associationScore}</strong></div>
      <div>Erros/Tentativas: <strong id="associationAttempts">${associationAttempts}</strong></div>
      <div>Restam: <strong id="associationRemaining">${currentAssociationGame.pairs.length - associationMatchedPairs}</strong></div>
    </div>

    <div class="association-board-wrapper" id="associationBoard">
      <svg id="associationSvg" class="association-board-svg"></svg>
      <div class="association-game-board">
        <div class="association-column">
          <div class="association-column-header">Esquerda</div>
          ${leftHtml}
        </div>
        <div class="association-column">
          <div class="association-column-header">Direita</div>
          ${rightHtml}
        </div>
      </div>
    </div>
  `;

  attachAssociationEvents();
}

function attachAssociationEvents(){

  const board =
    document.getElementById('associationBoard');

  const leftItems =
    board.querySelectorAll(
      '.association-left-item'
    );

  leftItems.forEach(item => {
    item.onpointerdown = event => {
      if(item.classList.contains('matched')) return;
      event.preventDefault();
      startAssociationDrag(item);
    };
  });

  board.onpointermove = event => {
    if(!associationDrag) return;
    updateAssociationLine(event, board);
  };

  board.onpointerup = event => {
    if(!associationDrag) return;
    completeAssociationDrag(event);
  };

  board.onpointerleave = () => {
    cancelAssociationDrag();
  };
}

function startAssociationDrag(item){

  const board =
    document.getElementById('associationBoard');

  const rect = item.getBoundingClientRect();
  const boardRect =
    board.getBoundingClientRect();

  const startX =
    rect.right - boardRect.left;
  const startY =
    rect.top + rect.height / 2 -
    boardRect.top;

  const svg =
    document.getElementById('associationSvg');

  const line = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  );

  line.setAttribute('x1', startX);
  line.setAttribute('y1', startY);
  line.setAttribute('x2', startX);
  line.setAttribute('y2', startY);
  line.setAttribute('stroke', '#60a5fa');
  line.setAttribute('stroke-width', 4);
  line.setAttribute('stroke-linecap', 'round');

  svg.appendChild(line);

  associationDrag = {
    fromIndex: Number(item.dataset.pairIndex),
    fromElement: item,
    line
  };
}

function updateAssociationLine(event, board){

  const rect = board.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  associationDrag.line.setAttribute('x2', x);
  associationDrag.line.setAttribute('y2', y);
}

function completeAssociationDrag(event){

  const target = event.target.closest(
    '.association-right-item'
  );

  if(
    target &&
    !target.classList.contains('matched')
  ){
    const rightIndex =
      Number(target.dataset.pairIndex);

    validateAssociationPair(
      associationDrag.fromElement,
      target,
      rightIndex
    );
  } else {
    cancelAssociationDrag();
  }
}

function cancelAssociationDrag(){
  if(!associationDrag) return;
  associationDrag.line.remove();
  associationDrag = null;
}

function validateAssociationPair(
  leftEl,
  rightEl,
  rightIndex
){

  associationAttempts++;

  const isCorrect =
    associationDrag.fromIndex === rightIndex;

  if(isCorrect){
    leftEl.classList.add('matched');
    rightEl.classList.add('matched');
    associationScore++;

    associationDrag.line.setAttribute('stroke', '#22c55e');
    associationDrag.line.setAttribute('stroke-opacity', '0.95');
    associationMatchedPairs++;
    associationDrag = null;

    if(
      associationMatchedPairs ===
      currentAssociationGame.pairs.length
    ){
      saveAssociationResult();
      setTimeout(() => {
        alert(
          `🏆 Você acertou ${associationScore} de ${currentAssociationGame.pairs.length}!`
        );
      }, 200);
    }
  } else {
    leftEl.classList.add('wrong');
    rightEl.classList.add('wrong');
    associationDrag.line.setAttribute('stroke', '#ef4444');

    setTimeout(() => {
      leftEl.classList.remove('wrong');
      rightEl.classList.remove('wrong');
      cancelAssociationDrag();
    }, 700);
  }

  updateAssociationInfo();
}

function updateAssociationInfo(){
  const scoreEl =
    document.getElementById('associationScore');
  const attemptsEl =
    document.getElementById('associationAttempts');
  const remainingEl =
    document.getElementById('associationRemaining');

  if(scoreEl) scoreEl.innerText = associationScore;
  if(attemptsEl) attemptsEl.innerText = associationAttempts;
  if(remainingEl) remainingEl.innerText =
    currentAssociationGame
      ? currentAssociationGame.pairs.length - associationMatchedPairs
      : 0;
}

async function saveAssociationResult(){
  try {
    const playerName =
      localStorage.getItem('playerName') ||
      'Jogador';

    await addDoc(
      collection(db, 'association_results'),
      {
        playerName,
        score: associationScore,
        attempts: associationAttempts,
        totalPairs:
          currentAssociationGame.pairs.length,
        title: currentAssociationGame.title,
        createdAt: new Date()
      }
    );
  } catch(error){
    console.error(
      'ERRO AO SALVAR RESULTADO DE ASSOCIAÇÃO:',
      error
    );
  }
}

window.deleteAssociationGame =
async function(id){
  if(!confirm('Deseja excluir este jogo de associação?')) return;

  try {
    await deleteDoc(
      doc(db, 'association_games', id)
    );
    await loadAssociationGames();
  } catch(error){
    console.error(
      'ERRO AO EXCLUIR ASSOCIAÇÃO:',
      error
    );
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

window.loadQuestionsToSelect = async function(selectedIds = []){

  await loadQuestions();

  const container =
    document.getElementById(
      'questionsSelect'
    );

  if(!container) return;

  if(questions.length === 0){
    container.innerHTML = `
      <p>Nenhuma pergunta disponível.</p>
    `;
    return;
  }

  const html = questions.map(q => `
    <label class="question-select">
      <input
        type="checkbox"
        value="${q.id}"
        ${selectedIds.includes(q.id) ? 'checked' : ''}
      />
      <span>${q.question}</span>
    </label>
  `).join('');

  container.innerHTML = html;
};

window.saveQuiz = async function(){

  const title =
    document.getElementById(
      'quizTitle'
    ).value.trim();

  const checked = Array.from(
    document.querySelectorAll(
      '#questionsSelect input[type=checkbox]:checked'
    )
  ).map(item => item.value);

  if(!title){
    alert('⚠ Digite o nome do quiz');
    return;
  }

  if(checked.length === 0){
    alert('⚠ Selecione ao menos uma pergunta');
    return;
  }

  try {
    if(editingQuizId){
      await updateDoc(
        doc(db, 'quizzes', editingQuizId),
        {
          title,
          questions: checked,
          updatedAt: new Date()
        }
      );
      alert('✅ Quiz atualizado!');
      editingQuizId = null;
    } else {
      await addDoc(
        collection(db, 'quizzes'),
        {
          title,
          questions: checked,
          createdAt: new Date()
        }
      );
      alert('✅ Quiz salvo!');
    }

    document.getElementById(
      'quizTitle'
    ).value = '';
    document.getElementById(
      'questionsSelect'
    ).innerHTML = '';

    await loadSavedQuizzes();
  } catch(error){
    console.error(
      'ERRO AO SALVAR QUIZ:',
      error
    );
    alert('Erro ao salvar quiz: ' +
      (error.message || error));
  }
};

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

    const quizQuery = query(
      collection(db, "quiz_results"),
      orderBy("score", "desc"),
      limit(5)
    );

    const assocQuery = query(
      collection(db, "association_results"),
      orderBy("score", "desc"),
      limit(5)
    );

    const [quizSnapshot, assocSnapshot] =
      await Promise.all([
        getDocs(quizQuery),
        getDocs(assocQuery)
      ]);

    let html = "";

    html += `
      <div class="card">
        <h2>Quiz - Top 5</h2>
      </div>
    `;

    quizSnapshot.forEach(docItem=>{
      const player = docItem.data();
      html += `
        <div class="ranking-item">
          <div>
            <h3>${player.playerName}</h3>
            <span>${player.score}/${player.total}</span>
          </div>
          <button class="delete-btn" onclick="deleteRankingEntry('quiz_results','${docItem.id}')">🗑</button>
        </div>
      `;
    });

    html += `
      <div class="card" style="margin-top:20px;">
        <h2>Associação - Top 5</h2>
      </div>
    `;

    assocSnapshot.forEach(docItem=>{
      const player = docItem.data();
      html += `
        <div class="ranking-item">
          <div>
            <h3>${player.playerName}</h3>
            <span>${player.score}/${player.totalPairs}</span>
          </div>
          <button class="delete-btn" onclick="deleteRankingEntry('association_results','${docItem.id}')">🗑</button>
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

window.deleteRankingEntry = async function(collectionName, id){
  if(!confirm('Excluir esta pontuação?')) return;

  try {
    await deleteDoc(doc(db, collectionName, id));
    await loadRanking();
  } catch(error){
    console.error('ERRO AO EXCLUIR RANKING:', error);
    alert('Erro ao excluir pontuação: ' + (error.message || error));
  }
}

window.addEventListener("load", ()=>{

  loadGameProfile();

  const savedName =
    localStorage.getItem("playerName") ||
    gameProfile.playerName;

  if(savedName){

    const quizInput = document.getElementById(
      "playerName"
    );
    const hubInput = document.getElementById(
      "hubPlayerName"
    );

    if(quizInput) quizInput.value = savedName;
    if(hubInput) hubInput.value = savedName;
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

    if(editingMemoryGameId){
      await updateDoc(
        doc(db, "memory_games", editingMemoryGameId),
        {
          title,
          cards: memoryBuilderCards,
          updatedAt: new Date()
        }
      );

      alert("✅ Jogo atualizado!");
      editingMemoryGameId = null;
    } else {
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
    }

    memoryBuilderCards = [];
    document.getElementById("memoryTitle").value = "";

    renderMemoryPreview();
    await loadMemoryGames();

  } catch(error){

    console.error(
      "❌ ERRO SAVE GAME:",
      error
    );

    alert(
      "Erro ao salvar: " +
      (error.message || error)
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
    memoryGames = [];

    querySnapshot.forEach((docItem)=>{

      console.log(
        "🎮 GAME:",
        docItem.id,
        docItem.data()
      );

      const game = docItem.data();
      memoryGames.push({
        id: docItem.id,
        ...game
      });

      html += `

        <div class="question-card">

          <h3>${game.title}</h3>

          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:15px;
            "
          >

            <button
              class="primary"
              onclick="playMemoryGame('${docItem.id}')"
            >
              ▶ Jogar
            </button>

            <button
              class="primary"
              onclick="editMemoryGame('${docItem.id}')"
            >
              ✏ Editar
            </button>

            <button
              class="delete-btn"
              onclick="deleteMemoryGame('${docItem.id}')"
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

window.editMemoryGame = function(id){
  const game = memoryGames.find(item => item.id === id);

  if(!game){
    alert('Jogo de memória não encontrado');
    return;
  }

  editingMemoryGameId = id;
  document.getElementById('memoryTitle').value = game.title;
  memoryBuilderCards = [...game.cards];
  renderMemoryPreview();

  alert('✏ Jogo de memória carregado para edição. Salve para atualizar.');
};

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
loadAssociationGames();
addPair();
addPair();

console.log("✅ SCRIPT FINALIZADO");

console.log(
  "FUNÇÃO ADD:",
  window.addMemoryCard
);

async function loadQuizzesList() {
  const container = document.getElementById("quizList");

  const snapshot = await getDocs(collection(db, "quizzes"));

  quizzes = [];
  let html = "";

  snapshot.forEach(docItem => {
    const quiz = docItem.data();
    quizzes.push({
      id: docItem.id,
      ...quiz
    });

    html += `
      <div class="question-card">
        <h3>${quiz.title}</h3>
        <p>${quiz.questions?.length || 0} perguntas</p>
        <button class="primary" onclick="selectQuiz('${docItem.id}')">
          ▶ Jogar
        </button>
      </div>
    `;
  });

  if(!html){
    html = `
      <div class="question-card">
        <p>Nenhum quiz disponível.</p>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function loadSavedQuizzes() {
  const container = document.getElementById("savedQuizList");

  if(!container) return;

  const snapshot = await getDocs(collection(db, "quizzes"));

  quizzes = [];
  let html = "";

  snapshot.forEach(docItem => {
    const quiz = docItem.data();
    quizzes.push({
      id: docItem.id,
      ...quiz
    });

    html += `
      <div class="question-card">
        <h3>${quiz.title}</h3>
        <p>${quiz.questions?.length || 0} perguntas</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="primary" onclick="editQuiz('${docItem.id}')">
            ✏ Editar
          </button>
          <button class="delete-btn" onclick="deleteQuiz('${docItem.id}')">
            🗑 Excluir
          </button>
        </div>
      </div>
    `;
  });

  if(!html){
    html = `
      <div class="question-card">
        <p>Nenhum quiz salvo.</p>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function loadBuilderGames(){
  try {
    const [dragSnapshot, imageSnapshot, completeSnapshot, sequenceSnapshot] = await Promise.all([
      getDocs(collection(db, "dragdrop_games")),
      getDocs(collection(db, "image_quiz_games")),
      getDocs(collection(db, "complete_word_games")),
      getDocs(collection(db, "sequence_logic_games"))
    ]);

    dragDropGames = [];
    imageQuizGames = [];
    completeWordGames = [];
    sequenceLogicGames = [];

    dragSnapshot.forEach(docItem => {
      dragDropGames.push({ id: docItem.id, ...docItem.data() });
    });

    imageSnapshot.forEach(docItem => {
      imageQuizGames.push({ id: docItem.id, ...docItem.data() });
    });

    completeSnapshot.forEach(docItem => {
      completeWordGames.push({ id: docItem.id, ...docItem.data() });
    });

    sequenceSnapshot.forEach(docItem => {
      sequenceLogicGames.push({ id: docItem.id, ...docItem.data() });
    });

    renderSavedBuilderGames();
  } catch(error){
    console.error('ERRO AO CARREGAR JOGOS CRIADOS:', error);
  }
}

function getBuilderGameByType(type, id){
  switch(type){
    case 'dragDrop':
      return dragDropGames.find(item => item.id === id);
    case 'imageQuiz':
      return imageQuizGames.find(item => item.id === id);
    case 'completeWord':
      return completeWordGames.find(item => item.id === id);
    case 'sequenceLogic':
      return sequenceLogicGames.find(item => item.id === id);
  }
  return null;
}

function renderBuilderForm(){
  const type = document.getElementById('builderGameType')?.value || 'dragDrop';
  const container = document.getElementById('builderFormArea');
  if(!container) return;

  const editing = editingBuilderGameType === type && editingBuilderGameId;
  const game = editing ? getBuilderGameByType(type, editingBuilderGameId) : null;

  let html = `
    <div class="question-card">
      <h2>${editing ? 'Editar' : 'Novo'} ${type === 'dragDrop' ? 'Arrastar e Soltar' : type === 'imageQuiz' ? 'Quiz com Imagem' : type === 'completeWord' ? 'Complete a Palavra' : 'Sequência Lógica'}</h2>
      <label>
        Título do jogo
        <input type="text" id="builderTitle" value="${game?.title || ''}" placeholder="Digite um título">
      </label>
  `;

  if(type === 'dragDrop'){
    const pairsText = game?.pairs?.map(pair => `${pair.label}:${pair.category}`).join('\n') || '';
    html += `
      <label>
        Itens e categorias (uma linha por item, separando por dois pontos)
        <textarea id="dragDropPairs" placeholder="Ex: Trator:Rural\nPrédio:Urbana">${pairsText}</textarea>
      </label>
    `;
  }

  if(type === 'imageQuiz'){
    const question = game?.question || { image:'🐄', text:'Qual é este animal?', options:['Cavalo','Vaca','Ovelha'], answer:'Vaca' };
    html += `
      <label>
        Ícone ou imagem
        <input type="text" id="imageQuizImage" value="${question.image || ''}" placeholder="Digite um emoji ou texto">
      </label>
      <label>
        Pergunta
        <input type="text" id="imageQuizQuestion" value="${question.text || ''}" placeholder="Digite a pergunta">
      </label>
      <label>
        Opções (separadas por vírgula)
        <input type="text" id="imageQuizOptions" value="${(question.options || []).join(',')}" placeholder="Ex: Cavalo,Vaca,Ovelha">
      </label>
      <label>
        Resposta correta
        <input type="text" id="imageQuizAnswer" value="${question.answer || ''}" placeholder="Digite a resposta correta">
      </label>
    `;
  }

  if(type === 'completeWord'){
    const puzzle = game?.puzzle || { display:'C A _ A', options:['S','P','T'], correct:'S' };
    html += `
      <label>
        Palavra com lacunas
        <input type="text" id="completeWordDisplay" value="${puzzle.display || ''}" placeholder="Ex: C A _ A">
      </label>
      <label>
        Letras opções (separadas por vírgula)
        <input type="text" id="completeWordOptions" value="${(puzzle.options || []).join(',')}" placeholder="Ex: S,P,T">
      </label>
      <label>
        Letra correta
        <input type="text" id="completeWordAnswer" value="${puzzle.correct || ''}" placeholder="Digite a letra correta">
      </label>
    `;
  }

  if(type === 'sequenceLogic'){
    const sequence = game?.sequence || { prompt:'2 - 4 - 6 - ?', options:['7','8','10'], correct:'8' };
    html += `
      <label>
        Enunciado da sequência
        <input type="text" id="sequencePrompt" value="${sequence.prompt || ''}" placeholder="Ex: 2 - 4 - 6 - ?">
      </label>
      <label>
        Opções (separadas por vírgula)
        <input type="text" id="sequenceOptions" value="${(sequence.options || []).join(',')}" placeholder="Ex: 7,8,10">
      </label>
      <label>
        Resposta correta
        <input type="text" id="sequenceAnswer" value="${sequence.correct || ''}" placeholder="Digite a resposta correta">
      </label>
    `;
  }

  html += `
      <button class="primary" onclick="saveBuilderGame()">
        ${editing ? 'Salvar alterações' : 'Salvar jogo'}
      </button>
      ${editing ? '<button class="delete-btn" style="margin-left:10px;" onclick="resetBuilderForm()">Cancelar edição</button>' : ''}
    </div>
  `;

  container.innerHTML = html;
}

window.renderBuilderForm = renderBuilderForm;

function renderSavedBuilderGames(){
  const container = document.getElementById('savedBuilderGamesList');
  if(!container) return;

  let html = '';
  const renderCards = (type, label, games) => {
    if(!games.length) return `
      <div class="question-card">
        <h3>${label}</h3>
        <p>Nenhum jogo salvo.</p>
      </div>
    `;

    return games.map(game => `
      <div class="question-card">
        <h3>${game.title || label}</h3>
        <p>${type === 'dragDrop' ? game.pairs?.length + ' itens' : type === 'imageQuiz' ? 'Quiz de imagem' : type === 'completeWord' ? 'Complete a palavra' : 'Sequência lógica'}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="primary" onclick="playBuilderGame('${type}','${game.id}')">▶ Jogar</button>
          <button class="primary" onclick="editBuilderGame('${type}','${game.id}')">✏ Editar</button>
          <button class="delete-btn" onclick="deleteBuilderGame('${type}','${game.id}')">🗑 Excluir</button>
        </div>
      </div>
    `).join('');
  };

  html += renderCards('dragDrop','Arrastar e Soltar', dragDropGames);
  html += renderCards('imageQuiz','Quiz com Imagem', imageQuizGames);
  html += renderCards('completeWord','Complete a Palavra', completeWordGames);
  html += renderCards('sequenceLogic','Sequência Lógica', sequenceLogicGames);

  if(!html){
    html = `
      <div class="question-card">
        <p>Nenhum jogo criado ainda.</p>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function saveBuilderGame(){
  const type = document.getElementById('builderGameType')?.value || 'dragDrop';
  const title = document.getElementById('builderTitle')?.value.trim();
  if(!title){
    alert('⚠ Digite o título do jogo');
    return;
  }

  let payload = { title, updatedAt: new Date() };
  let collectionName = '';

  if(type === 'dragDrop'){
    const pairsText = document.getElementById('dragDropPairs')?.value.trim();
    if(!pairsText){
      alert('⚠ Digite pelo menos um item para arrastar');
      return;
    }
    const pairs = pairsText.split('\n').map(line => line.split(':').map(part => part.trim())).filter(parts => parts.length === 2).map(parts => ({ label: parts[0], category: parts[1] }));
    if(pairs.length < 2){
      alert('⚠ Forneça pelo menos 2 pares válidos');
      return;
    }
    payload = { ...payload, pairs };
    collectionName = 'dragdrop_games';
  }

  if(type === 'imageQuiz'){
    const image = document.getElementById('imageQuizImage')?.value.trim();
    const text = document.getElementById('imageQuizQuestion')?.value.trim();
    const options = document.getElementById('imageQuizOptions')?.value.split(',').map(item => item.trim()).filter(Boolean);
    const answer = document.getElementById('imageQuizAnswer')?.value.trim();
    if(!image || !text || options.length < 2 || !answer){
      alert('⚠ Preencha todos os campos do quiz de imagem');
      return;
    }
    payload = { ...payload, question: { image, text, options, answer } };
    collectionName = 'image_quiz_games';
  }

  if(type === 'completeWord'){
    const display = document.getElementById('completeWordDisplay')?.value.trim();
    const options = document.getElementById('completeWordOptions')?.value.split(',').map(item => item.trim()).filter(Boolean);
    const answer = document.getElementById('completeWordAnswer')?.value.trim();
    if(!display || options.length < 2 || !answer){
      alert('⚠ Preencha todos os campos do complete a palavra');
      return;
    }
    payload = { ...payload, puzzle: { display, options, correct: answer } };
    collectionName = 'complete_word_games';
  }

  if(type === 'sequenceLogic'){
    const prompt = document.getElementById('sequencePrompt')?.value.trim();
    const options = document.getElementById('sequenceOptions')?.value.split(',').map(item => item.trim()).filter(Boolean);
    const answer = document.getElementById('sequenceAnswer')?.value.trim();
    if(!prompt || options.length < 2 || !answer){
      alert('⚠ Preencha todos os campos da sequência lógica');
      return;
    }
    payload = { ...payload, sequence: { prompt, options, correct: answer } };
    collectionName = 'sequence_logic_games';
  }

  try {
    if(editingBuilderGameType === type && editingBuilderGameId){
      await updateDoc(doc(db, collectionName, editingBuilderGameId), payload);
      alert('✅ Jogo atualizado com sucesso!');
    } else {
      await addDoc(collection(db, collectionName), { ...payload, createdAt: new Date() });
      alert('✅ Jogo salvo com sucesso!');
    }

    editingBuilderGameType = null;
    editingBuilderGameId = null;
    document.getElementById('builderTitle').value = '';

    await loadBuilderGames();
    renderBuilderForm();
  } catch(error){
    console.error('ERRO AO SALVAR JOGO CRIADO:', error);
    alert('Erro ao salvar jogo: ' + (error.message || error));
  }
}

window.saveBuilderGame = saveBuilderGame;

window.editBuilderGame = function(type, id){
  editingBuilderGameType = type;
  editingBuilderGameId = id;
  document.getElementById('builderGameType').value = type;
  renderBuilderForm();
};

window.deleteBuilderGame = async function(type, id){
  if(!confirm('Deseja excluir este jogo?')) return;

  const collectionName = type === 'dragDrop' ? 'dragdrop_games' : type === 'imageQuiz' ? 'image_quiz_games' : type === 'completeWord' ? 'complete_word_games' : 'sequence_logic_games';

  try {
    await deleteDoc(doc(db, collectionName, id));
    await loadBuilderGames();
  } catch(error){
    console.error('ERRO AO EXCLUIR JOGO CRIADO:', error);
    alert('Erro ao excluir jogo: ' + (error.message || error));
  }
};

window.playBuilderGame = function(type, id){
  currentCustomGame = { type, id };
  showScreen('gamesHub');
  setTimeout(() => {
    switch(type){
      case 'dragDrop':
        renderDragDropGame(id);
        break;
      case 'imageQuiz':
        renderImageQuizGame(id);
        break;
      case 'completeWord':
        renderCompleteWordGame(id);
        break;
      case 'sequenceLogic':
        renderSequenceLogicGame(id);
        break;
    }
  }, 0);
};

window.resetBuilderForm = function(){
  editingBuilderGameType = null;
  editingBuilderGameId = null;
  document.getElementById('builderGameType').value = 'dragDrop';
  renderBuilderForm();
};

window.editQuiz = async function(id) {
  const quiz = quizzes.find(item => item.id === id);

  if(!quiz) {
    alert('Quiz não encontrado');
    return;
  }

  editingQuizId = id;
  document.getElementById('quizTitle').value = quiz.title;
  document.getElementById('questionsSelect').innerHTML = '';
  await loadQuestionsToSelect(quiz.questions || []);

  alert('✏ Quiz carregado para edição. Ajuste o título e as perguntas, depois salve.');
};

window.deleteQuiz = async function(id) {
  if(!confirm('Deseja excluir este quiz?')) return;

  try {
    await deleteDoc(doc(db, 'quizzes', id));
    await loadSavedQuizzes();
  } catch(error) {
    console.error('ERRO AO DELETAR QUIZ:', error);
    alert('Erro ao excluir quiz: ' + (error.message || error));
  }
};

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