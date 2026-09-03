// Add or edit test puzzles here. `encoded` is shown in the game and is what players type.
const PUZZLES = [
  { answer: "POOL TIME", encoded: "P00L T1M3", theme: "SUMMER" },
  { answer: "TAN LINES", encoded: "T4N L1N3S", theme: "SUMMER" },
  { answer: "ICE CREAM", encoded: "1C3 CR34M", theme: "SUMMER" },
  { answer: "FLIP FLOP", encoded: "FL1P FL0P", theme: "SUMMER" },
  { answer: "COOK OUTS", encoded: "C00K 0UTS", theme: "SUMMER" },
  { answer: "BACK PACK", encoded: "B4CK P4CK", theme: "SCHOOL" },
  { answer: "LUNCH BOX", encoded: "LUNCH B0X", theme: "SCHOOL" },
  { answer: "NEW SHOES", encoded: "N3W SH03S", theme: "SCHOOL" },
  { answer: "WIDE RULE", encoded: "W1D3 RUL3", theme: "SCHOOL" },
  { answer: "FIRST DAY", encoded: "F1RST D4Y", theme: "SCHOOL" },
  { answer: "ART CLASS", encoded: "4RT CL4SS", theme: "SCHOOL" },
  { answer: "HOME WORK", encoded: "H0M3 W0RK", theme: "SCHOOL" },
  { answer: "SNACK BOX", encoded: "SN4CK B0X", theme: "SCHOOL" }
];
let puzzleIndex = 2;
const substitutions = { A: "4", E: "3", I: "1", O: "0" };
const hintMilestones = [1, 3, 5, 7];
let state;
const $ = selector => document.querySelector(selector);
const tiles = $("#tiles");
const guessInput = $("#guessInput");
const guessButton = $("#guessButton");
const hintButton = $("#hintButton");
const shareButton = $("#shareButton");

function currentPuzzle() { return PUZZLES[puzzleIndex]; }
function encoded(char, position) { return currentPuzzle().encoded.replace(/\s/g, "")[position] || substitutions[char] || char; }
function wordForPosition(targetPosition) {
  let position = 0;
  let wordIndex = 0;
  for (const char of currentPuzzle().answer) {
    if (char === " ") { wordIndex++; continue; }
    if (position === targetPosition) return wordIndex;
    position++;
  }
  return -1;
}
function normalise(input) {
  return input.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function reset() {
  state = { guesses: 0, hintsUsed: 0, hintsBanked: 1, unlockedMilestones: [], solvedWords: new Set(), revealed: new Set(), selectingHint: false, finished: false };
  guessInput.value = "";
  $("#result").hidden = true;
  updateStatus("Make a full-phrase guess to start.");
  render();
  guessInput.focus();
}
function render() {
  const puzzle = currentPuzzle();
  const letters = [...puzzle.answer].filter(char => char !== " ");
  $("#themeLabel").innerHTML = `TH<span>3</span>M<span>3</span>: <strong>${puzzle.theme.replace(/E/g, "3")}</strong>`;
  tiles.innerHTML = "";
  let position = 0;
  let wordIndex = 0;
  [...puzzle.answer].forEach(char => {
    if (char === " ") {
      const breakEl = document.createElement("div");
      breakEl.className = "word-break";
      tiles.append(breakEl);
      wordIndex++;
      return;
    }
    const tilePosition = position;
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.position = position;
    const isKnown = state.solvedWords.has(wordIndex);
    const isRevealed = state.revealed.has(position);
    if (isKnown) tile.classList.add("known");
    if (isRevealed) tile.classList.add("revealed");
    if (state.selectingHint && !isKnown && !isRevealed) {
      tile.classList.add("selectable");
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", `Reveal character ${position + 1}`);
      tile.addEventListener("click", () => reveal(tilePosition));
      tile.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") reveal(tilePosition); });
    }
    if (isKnown || isRevealed) tile.textContent = encoded(char, tilePosition);
    else {
      const display = encoded(char, tilePosition);
      tile.textContent = /\d/.test(display) ? "#" : "–";
      if (/\d/.test(display)) tile.classList.add("number-blank");
    }
    tiles.append(tile);
    position++;
  });
  $("#guessCount").textContent = `${state.guesses}/8`;
  $("#hintCount").textContent = `${state.hintsUsed}/4`;
  $("#hintBank").textContent = `${state.hintsBanked}/4`;
  const solvedPositions = letters.reduce((total, _, position) => total + (state.solvedWords.has(wordForPosition(position)) ? 1 : 0), 0);
  const hasHidden = solvedPositions + state.revealed.size < letters.length;
  hintButton.disabled = state.finished || state.hintsBanked === 0 || !hasHidden;
  hintButton.textContent = state.selectingHint ? "T4P 4N 0UTL1N3D T1L3" : "R3V34L 4 CH4R4CT3R";
  guessInput.disabled = state.finished;
  guessButton.disabled = state.finished;
  shareButton.disabled = !state.finished;
}
function updateStatus(message) { $("#statusLine").textContent = message; }
function submitGuess(event) {
  event.preventDefault();
  if (state.finished) return;
  const puzzle = currentPuzzle();
  const guess = normalise(guessInput.value);
  if (!guess) return updateStatus("Type a two-word phrase first.");
  state.selectingHint = false;
  state.guesses++;
  const guessWords = guess.split(" ");
  const answerWords = puzzle.encoded.split(" ");
  answerWords.forEach((word, index) => { if (guessWords[index] === word) state.solvedWords.add(index); });
  hintMilestones.forEach(mark => {
    if (state.guesses >= mark && !state.unlockedMilestones.includes(mark)) {
      state.unlockedMilestones.push(mark);
      state.hintsBanked++;
    }
  });
  guessInput.value = "";
  // A player can solve the two words across separate guesses. Once every word
  // is locked, the puzzle is complete even if no single submission was perfect.
  if (state.solvedWords.size === answerWords.length) finish(true);
  else if (state.guesses >= 8) finish(false);
  else {
    const newlyBanked = hintMilestones.includes(state.guesses);
    updateStatus(newlyBanked ? "A hint was banked. Use it now or save it for later." : "Correct words locked in green. Try again.");
    render();
  }
}
function beginHint() {
  if (hintButton.disabled) return;
  state.selectingHint = !state.selectingHint;
  updateStatus(state.selectingHint ? "Choose any outlined character to reveal it in purple." : "Hint selection cancelled.");
  render();
}
function reveal(position) {
  const word = wordForPosition(position);
  if (!state.selectingHint || state.solvedWords.has(word) || state.revealed.has(position)) return;
  state.revealed.add(position);
  state.hintsUsed++;
  state.hintsBanked--;
  state.selectingHint = false;
  updateStatus("Character revealed in purple. Keep decoding!");
  render();
}
function finish(won) {
  state.finished = true;
  state.selectingHint = false;
  if (won) {
    currentPuzzle().answer.split(" ").forEach((_, index) => state.solvedWords.add(index));
    updateStatus("Solved! Your result is ready to share.");
  } else updateStatus(`Out of guesses — the encoded answer was ${currentPuzzle().encoded}.`);
  const title = won ? "Y0U D1D 1T!" : "N3XT T1M3!";
  $("#resultTitle").textContent = title;
  $("#resultStats").textContent = `${state.guesses}/8 guesses • ${state.hintsUsed}/4 hints`;
  $("#sharePreview").textContent = shareText();
  $("#result").hidden = false;
  render();
}
function shareGrid() {
  const letterCount = [...currentPuzzle().answer].filter(char => char !== " ").length;
  return Array.from({ length: letterCount }, (_, position) => {
    if (state.revealed.has(position)) return "🟪";
    return state.solvedWords.has(wordForPosition(position)) ? "🟩" : "⬛";
  }).join("");
}
function shareText() {
  return `TW0 W0RDS #${puzzleIndex + 1}\n${currentPuzzle().theme}\n\n${shareGrid()}\n${state.guesses}/8 GU3SS3S • ${state.hintsUsed}/4 H1NTS\n\nPlay TW0 W0RDS`;
}
async function shareResult() {
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ title: "TW0 W0RDS", text });
    else { await navigator.clipboard.writeText(text); updateStatus("Result copied — paste it anywhere."); }
  } catch (error) {
    if (error.name !== "AbortError") updateStatus("Could not share automatically. Copy the result preview below.");
  }
}

$("#guessForm").addEventListener("submit", submitGuess);
hintButton.addEventListener("click", beginHint);
shareButton.addEventListener("click", shareResult);
$("#resetButton").addEventListener("click", reset);
$("#nextButton").addEventListener("click", () => { puzzleIndex = (puzzleIndex + 1) % PUZZLES.length; reset(); });
reset();
