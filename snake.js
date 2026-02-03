const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreSpan = document.getElementById("scoreValue");

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
  if (e.key === "ArrowUp" || e.key === "w") {
    if (vy === 1) return;
    vx = 0; vy = -1;
  } else if (e.key === "ArrowDown" || e.key === "s") {
    if (vy === -1) return;
    vx = 0; vy = 1;
  } else if (e.key === "ArrowLeft" || e.key === "a") {
    if (vx === 1) return;
    vx = -1; vy = 0;
  } else if (e.key === "ArrowRight" || e.key === "d") {
    if (vx === -1) return;
    vx = 1; vy = 0;
  } else if (e.key === "r") {
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

    if (cube.indexInAnswer === currentLetterIndex) {
      // Correct next letter
      currentLetterIndex++;
      score++;
      scoreSpan.textContent = score;

      // Remove that cube and regenerate cubes only for remaining letters
      generateLetterCubesForAnswer();

      // Check if finished this answer
      if (currentLetterIndex >= currentAnswerLetters.length) {
        // skip trailing spaces
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

      // Snake grows on correct letter (no pop)
    } else {
      // Wrong letter order
      gameOver = true;
    }
  } else {
    // Normal move, no letter eaten
    snake.pop();
  }
}


function draw() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // snake
  ctx.fillStyle = "#22c55e";
  for (const segment of snake) {
    ctx.fillRect(
      segment.x * tileSize,
      segment.y * tileSize,
      tileSize - 2,
      tileSize - 2
    );
  }

  // cubes: next letter = highlighted color, others another color
  for (const cube of letterCubes) {
    const isNext = cube.indexInAnswer === currentLetterIndex;
    ctx.fillStyle = isNext ? "#f97316" : "#38bdf8";
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

  // place cubes for remaining letters from currentLetterIndex to end
  for (let i = currentLetterIndex; i < currentAnswerLetters.length; i++) {
    const letter = currentAnswerLetters[i];

    // You might want to ignore spaces (so they are “auto-correct”)
    if (letter === " ") continue;

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

    letterCubes.push({
      x: pos.x,
      y: pos.y,
      letter,
      indexInAnswer: i
    });
  }
}


loadQuizData().then(() => {
  // Optionally, auto-select a default category/lesson
  // or show a message like "Choose category to start".
});


gameLoop();
