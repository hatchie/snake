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


document.addEventListener("keydown", );

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
  speed = 8;
  eatenLetters = []; // CLEAR eaten letters
  
  prepareCurrentQuestion();
}

function gameLoop() {
  if (gameOver) {
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
      gameOver = true;
    }
  } else {
    // Normal move, no cube eaten
    snake.pop();
  }
}


function draw() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

   // snake: each segment shows its letter
  for (let i = 0; i < snake.length; i++) {
    const segment = snake[i];
    ctx.fillStyle = i === 0 ? "#22c55e" : "#38bdf8"; // head green, body blue
    
    ctx.fillRect(
      segment.x * tileSize,
      segment.y * tileSize,
      tileSize - 2,
      tileSize - 2
    );
  
    // Show letter on snake segments (last eaten letters)
    if (i > 0 && eatenLetters[i-1]) {
      ctx.fillStyle = "#0b1120";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        eatenLetters[i-1],
        segment.x * tileSize + tileSize / 2,
        segment.y * tileSize + tileSize / 2
      );
    }
  }


  // cubes: ALL BLUE now
  for (const cube of letterCubes) {
    ctx.fillStyle = "#38bdf8";  // ALL BLUE
    ctx.fillRect(
      cube.x * tileSize,
      cube.y * tileSize,
      tileSize - 2,
      tileSize - 2
    );
  
    ctx.fillStyle = "#0b1120";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      cube.letter,
      cube.x * tileSize + tileSize / 2,
      cube.y * tileSize + tileSize / 2
    );
  }

}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f9fafb";
  ctx.font = "24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Game Over - Press R", canvas.width / 2, canvas.height / 2);
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
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
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


loadQuizData().then(() => {
  // Optionally, auto-select a default category/lesson
  // or show a message like "Choose category to start".
});


gameLoop();







