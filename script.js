const API_URL = 'https://script.google.com/macros/s/AKfycbwjJYB9C1x9ebX1fuDXaGZ5dCbE_bLhjbntodaA0zKMrXH9cTfedPetpeTcDx3yZpG_/exec';

const crosswordContainer = document.getElementById('crossword');
const checkButton = document.getElementById('checkAnswer');
const form = document.getElementById('add-word-form');

let crosswordData = []

// Load weekly crossword
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${API_URL}?action=getWeeklyCrossword`);
    const data = await res.json();
    renderCrossword(data);
  } catch (error) {
    crosswordContainer.innerHTML = '<p>Error loading crossword. Try again later.</p>';
    console.error(error);
  }
});

// Check Answer
checkButton.addEventListener('click', (e) => {
  e.preventDefault(); // optional, only needed if it's inside a <form>
  checkAnswer();
});

// Render placeholder crossword clues
function renderCrossword(data) {
  if (!data.clues || data.clues.length === 0) {
    crosswordContainer.innerHTML = '<p>No crossword available this week.</p>';
    return;
  }

  const words = data.clues.map(item => ({
    answer: item.word.toUpperCase().replace(/ /g, ''),
    clue: item.clue
  }));

  var layout = generateLayout(words);
  var rows = layout.rows;
  var cols = layout.cols;
  var table = layout.table; // table as two-dimensional array
  var output_html = layout.table_string; // table as plain text (with HTML line breaks)
  crosswordData = layout.result; // words along with orientation, position, startx, and starty
  
  // Determine grid size
  const maxX = Math.max(...crosswordData.map(c => c.startx + (c.orientation === 'across' ? c.answer.length - 1 : 0))) + 1;
  const maxY = Math.max(...crosswordData.map(c => c.starty + (c.orientation === 'down' ? c.answer.length - 1 : 0))) + 1;

  // Create empty grid
  const grid = Array.from({ length: maxY }, () =>
    Array.from({ length: maxX }, () => null)
  );

  console.log("grid created");
  console.log(crosswordData);

  // Fill the grid with placeholders and position numbers
  crosswordData.forEach(({ answer, startx, starty, position, orientation }) => {
    console.log("begin loop");
    for (let i = 0; i < answer.length; i++) {
      const x = startx - 1 + (orientation === "across" ? i : 0);
      const y = starty - 1 + (orientation === "down" ? i : 0);
      if (!grid[y][x]) {
        console.log("not grid[y][x]");
        grid[y][x] = { letter: "", number: null };
      }
      if (i === 0) grid[y][x].number = position;
    }
  });
  // Generate HTML for grid
  console.log("generating...");
  let html = `<table class="crossword">`;
  grid.forEach((row, rowIndex) => {
    html += `<tr>`;
    row.forEach((cell, colIndex) => {
      if (cell) {
        html += `<td class="cell">
          ${cell.number !== null ? `<span class="number">${cell.number}</span>` : ""}
          <input maxlength="1" data-x="${colIndex}" data-y="${rowIndex}">
        </td>`;
      } else {
        html += `<td class="empty"></td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</table>`;

  // Generate clues
  const acrossClues = crosswordData.filter(c => c.orientation === "across");
  const downClues = crosswordData.filter(c => c.orientation === "down");

  html += `<div class="clues">
    <div class="clue-group">
      <h3>Across</h3>
      <ul>${acrossClues.map(c => `<li><strong>${c.position}</strong>. ${c.clue}</li>`).join("")}</ul>
    </div>
    <div class="clue-group">
      <h3>Down</h3>
      <ul>${downClues.map(c => `<li><strong>${c.position}</strong>. ${c.clue}</li>`).join("")}</ul>
    </div>
  </div>`;

  // Set innerHTML
  crosswordContainer.innerHTML = html;
}

function checkAnswer() {
  console.log("checking answer");
  // check if crossword is right. make incorrect boxes have red tint, correct boxes green have green tint
  crosswordData.forEach(({ answer, startx, starty, orientation }) => {
    for (let i = 0; i < answer.length; i++) {
      const x = startx - 1 + (orientation === "across" ? i : 0);
      const y = starty - 1 + (orientation === "down" ? i : 0);
      const input = document.querySelector(`input[data-x="${x}"][data-y="${y}"]`);
      const userLetter = input.value.toUpperCase();
      const correctLetter = answer[i].toUpperCase();

      if (userLetter === correctLetter) {
        input.style.backgroundColor = "#c8e6c9"; // light green
      } else {
        input.style.backgroundColor = "#ffcdd2"; // light red
      }
    }
  });
}
