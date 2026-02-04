const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreSpan = document.getElementById("scoreValue");
const speedSelect = document.getElementById("speedSelect");

const tileSize = 20;
const tileCount = canvas.width / tileSize;

let quizFinished = false;

let quizData = null;
let selectedCategory = null;
let selectedSubcategory = null;

let questions = [];            // questions for chosen category/subcategory
let currentQuestionIndex = 0;
let currentAnswer = "";        // current answer word/sentence
let currentAnswerLetters = []; // array of letters (in order)
let currentLetterIndex = 0;    // index of next letter to eat

let eatenLetters = []; // tracks letters snake has eaten

let lives = 3;  //  3 snake lives
let snake = [{ x: 10, y: 10 }];
let vx = 1;
let vy = 0;
let score = 0;
let gameOver = false;
let speed = 8;
let letterCubes = []; // each: { x, y, letter, indexInAnswer }


const questionTextEl = document.getElementById("questionText");
const categorySelect = document.getElementById("categorySelect");
const lessonSelect = document.getElementById("lessonSelect");
const startQuizBtn = document.getElementById("startQuizBtn");

startQuizBtn.addEventListener("click", () => {
  selectedCategory = categorySelect.value;
  selectedSubcategory = lessonSelect.value;

  // Get selected speed
  speed = parseInt(speedSelect.value);
  
  if (!selectedCategory || !selectedSubcategory) {
    alert("Please choose both category and lesson.");
    return;
  }

  if (!quizData || !quizData[selectedCategory] || !quizData[selectedCategory][selectedSubcategory]) {
    alert("No questions found for this selection.");
    return;
  }

  questions = quizData[selectedCategory][selectedSubcategory];
  currentQuestionIndex = 0;
  score = 0;
  scoreSpan.textContent = score;

  resetGameForNewQuestion();
});


document.addEventListener("keydown", handleKeydown);

function resetGame() {
  resetGameForNewQuestion();
}

async function loadQuizData() {
  const response = await fetch("quiz-data.json");
  quizData = await response.json();
}

function prepareCurrentQuestion() {
  const q = questions[currentQuestionIndex];
  if (!q) {
    // no more questions
    quizFinished = true;
    questionTextEl.textContent = "Quiz completed!";
    return;
  }

  questionTextEl.textContent = q.question;

  // Normalize answer: keep letters and spaces, for now ignore case
  currentAnswer = q.answer;
  currentAnswerLetters = currentAnswer.split(""); // includes spaces and punctuation
  currentLetterIndex = 0;

  generateLetterCubesForAnswer();
}


function handleKeydown(e) {
  // Prevent scrolling on mobile
  e.preventDefault();
  
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    if (vy === 1) return;
    vx = 0; vy = -1;
  } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    if (vy === -1) return;
    vx = 0; vy = 1;
  } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    if (vx === 1) return;
    vx = -1; vy = 0;
  } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    if (vx === -1) return;
    vx = 1; vy = 0;
  } else if (e.key.toLowerCase() === "r") {
    resetGame();
  }
}


function resetGameForNewQuestion() {
  snake = [{ x: 10, y: 10 }];
  vx = 1;
  vy = 0;
  gameOver = false;
  quizFinished = false;
  eatenLetters = [];
  lives = 3;  // RESET LIVES
  document.getElementById("livesValue").textContent = lives;
  prepareCurrentQuestion();
}


// MOBILE TOUCH CONTROLS
function moveSnake(direction) {
  if (gameOver || quizFinished) return;
  
  switch(direction) {
    case 'up':
      if (vy === 1) return;
      vx = 0; vy = -1;
      break;
    case 'down':
      if (vy === -1) return;
      vx = 0; vy = 1;
      break;
    case 'left':
      if (vx === 1) return;
      vx = -1; vy = 0;
      break;
    case 'right':
      if (vx === -1) return;
      vx = 1; vy = 0;
      break;
  }
}

function preventDefault(e) {
  e.preventDefault();
  return false;
}

// 👈 Prevent mobile zoom/scroll
document.addEventListener('touchstart', function(e) {}, { passive: false });
document.addEventListener('touchend', function(e) {}, { passive: false });
document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });


function drawQuizComplete() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#bbf7d0";
  ctx.font = "bold 28px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎉 Quiz Complete!", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "20px system-ui";
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
}


function gameLoop() {
  if (quizFinished) {
    drawQuizComplete();
  } else if (gameOver) {
    drawGameOver();
  } else {
    update();
    draw();
  }
  setTimeout(gameLoop, 1000 / speed);
}


function update() {
  if (quizFinished) return;

  const head = { x: snake[0].x + vx, y: snake[0].y + vy };

  // walls
  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= tileCount ||
    head.y >= tileCount
  ) {
    gameOver = true;
    return;
  }

  // self collision
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver = true;
      return;
    }
  }

  snake.unshift(head);

  // check cubes
  const cubeIndex = letterCubes.findIndex(
    c => c.x === head.x && c.y === head.y
  );
  
  if (cubeIndex !== -1) {
    const cube = letterCubes[cubeIndex];
    
    // IMMEDIATELY remove eaten cube
    letterCubes.splice(cubeIndex, 1);
    
    if (cube.isCorrect) {
      // CORRECT: add to snake and advance
      eatenLetters.push(cube.letter.toUpperCase());
      // Skip spaces properly
      while (currentLetterIndex < currentAnswerLetters.length && 
             currentAnswerLetters[currentLetterIndex] === " ") {
        currentLetterIndex++;
      }
      currentLetterIndex++;
      
      score++;
      scoreSpan.textContent = score;
  
      // Generate NEW set of 5 cubes for next letter
      generateLetterCubesForAnswer();
  
      // Check if finished this answer
      if (currentLetterIndex >= currentAnswerLetters.length) {
        let allDone = true;
        for (let i = currentLetterIndex; i < currentAnswerLetters.length; i++) {
          if (currentAnswerLetters[i] !== " ") {
            allDone = false;
            break;
          }
        }
  
        if (allDone) {
          currentQuestionIndex++;
          if (currentQuestionIndex >= questions.length) {
            quizFinished = true;
            questionTextEl.textContent = "Quiz completed!";
          } else {
            resetGameForNewQuestion();
          }
        }
      }
    } else {
      // WRONG distractor
      lives--;
      document.getElementById("livesValue").textContent = lives;
      if (lives <= 0) {
        gameOver = true;
      }
    }
  } else {
    // Normal move, no cube eaten
    snake.pop();
  }
}


function draw() {
  // Clear canvas
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw lives indicator (top-left corner)
  ctx.fillStyle = "rgba(11, 17, 32, 0.9)";
  ctx.fillRect(12, 12, 140, 36);
  
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`♥ ${lives}`, 24, 30);
  
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 144, 40);

  // Snake: each segment shows its letter
  for (let i = 0; i < snake.length; i++) {
    const segment = snake[i];
    
    // Head green, body blue gradient
    ctx.fillStyle = i === 0 ? "#22c55e" : `hsl(200, 80%, ${55 - i * 2}%)`;
    
    ctx.fillRect(
      segment.x * tileSize,
      segment.y * tileSize,
      tileSize - 2,
      tileSize - 2
    );
    
    // Head glow effect
    if (i === 0) {
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 12;
      ctx.fillRect(
        segment.x * tileSize + 1,
        segment.y * tileSize + 1,
        tileSize - 4,
        tileSize - 4
      );
      ctx.shadowBlur = 0;
    }

    // Show letter on snake segments (last eaten letters)
    if (i > 0 && eatenLetters[i-1]) {
      ctx.fillStyle = "#0b1120";
      ctx.font = `${Math.max(10, 16 - snake.length * 0.3)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        eatenLetters[i-1],
        segment.x * tileSize + tileSize / 2,
        segment.y * tileSize + tileSize / 2
      );
    }
  }

  // Letter cubes: ALL BLUE
  for (const cube of letterCubes) {
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(
      cube.x * tileSize,
      cube.y * tileSize,
      tileSize - 2,
      tileSize - 2
    );
    
    // Cube glow
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.fillRect(
      cube.x * tileSize + 1,
      cube.y * tileSize + 1,
      tileSize - 4,
      tileSize - 4
    );
    ctx.shadowBlur = 0;
    
    // Letter text
    ctx.fillStyle = "#0b1120";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      cube.letter.toUpperCase(),
      cube.x * tileSize + tileSize / 2,
      cube.y * tileSize + tileSize / 2
    );
  }

  // Progress indicator (current word progress)
  if (currentAnswerLetters.length > 0) {
    const progress = Math.min((currentLetterIndex / currentAnswerLetters.length) * 100, 100);
    ctx.fillStyle = "rgba(99, 102, 241, 0.2)";
    ctx.fillRect(canvas.width - 120, 12, 108, 20);
    
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(canvas.width - 120, 12, (108 * progress) / 100, 20);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${Math.floor(progress)}%`,
      canvas.width - 66,
      22
    );
  }

  // Reset canvas state
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
}


function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f9fafb";
  ctx.font = "bold 28px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💀 Game Over", canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = "20px system-ui";
  ctx.fillText(`Score: ${score} | Lives Lost`, canvas.width / 2, canvas.height / 2 + 10);
  ctx.font = "16px system-ui";
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 40);
}


function generateLetterCubesForAnswer() {
  letterCubes = [];

  // Skip spaces to find next REAL letter needed
  let nextLetterIndex = currentLetterIndex;
  while (nextLetterIndex < currentAnswerLetters.length && 
         currentAnswerLetters[nextLetterIndex] === " ") {
    nextLetterIndex++;
  }

  // If no more letters needed, exit
  if (nextLetterIndex >= currentAnswerLetters.length) {
    return;
  }

  const correctLetter = currentAnswerLetters[nextLetterIndex];

  // Define distractors based on correct letter
  let distractors = [];
  if (correctLetter.toLowerCase() === "s") {
    distractors = ["c", "z", "x", "p"];
  } else if (correctLetter.toLowerCase() === "a") {
    distractors = ["i", "o", "e", "u"];
  } else if (correctLetter.toLowerCase() === "e") {
    distractors = ["i", "a", "o", "u"];
  } else if (correctLetter.toLowerCase() === "i") {
    distractors = ["e", "a", "o", "u"];
  } else if (correctLetter.toLowerCase() === "o") {
    distractors = ["a", "e", "i", "u"];
  } else if (correctLetter.toLowerCase() === "u") {
    distractors = ["a", "e", "i", "o"];
  } else {
    distractors = ["q", "w", "d", "f"];
  }

  // Create 5 cubes: 1 correct + 4 distractors
  const allLetters = [correctLetter.toLowerCase(), ...distractors];
  
  for (let i = 0; i < 5; i++) {
    let pos;
    let conflict;
    do {
      pos = {
        x: Math.floor(Math.random() * (tileCount - 4)) + 2,  // 2 tiles from left/right
        y: Math.floor(Math.random() * (tileCount * 0.7)) + 5  // 25% top = ~6 tiles down + 60% play area
      };
      conflict = snake.some(seg => seg.x === pos.x && seg.y === pos.y);
      if (!conflict) {
        conflict = letterCubes.some(c => c.x === pos.x && c.y === pos.y);
      }
    } while (conflict);

    const letter = allLetters[i];
    const isCorrect = i === 0;  // First letter is always correct

    letterCubes.push({
      x: pos.x,
      y: pos.y,
      letter: letter,
      indexInAnswer: nextLetterIndex,  // CRITICAL: Use nextLetterIndex!
      isCorrect: isCorrect
    });
  }
}


// Wait for JSON before starting game
loadQuizData().then(() => {
  console.log("✅ Quiz data loaded successfully:", quizData);
  gameLoop();
}).catch(error => {
  console.error("❌ Failed to load quiz-data.json:", error);
  questionTextEl.textContent = "Error loading questions. Check quiz-data.json";
});











