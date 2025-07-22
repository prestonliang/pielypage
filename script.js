const API_URL = 'https://script.google.com/macros/s/AKfycbwjJYB9C1x9ebX1fuDXaGZ5dCbE_bLhjbntodaA0zKMrXH9cTfedPetpeTcDx3yZpG_/exec';

const crosswordContainer = document.getElementById('crossword');
const form = document.getElementById('add-word-form');

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

// Add word to Google Sheet
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const word = document.getElementById('word').value.trim();
  const clue = document.getElementById('clue').value.trim();

  if (!word || !clue) return;

  try {
    await fetch(`${API_URL}?action=addClue`, {
      method: 'POST',
      body: JSON.stringify({ word, clue }),
      headers: { 'Content-Type': 'application/json' }
    });

    alert('Clue added! It may appear in next week\'s puzzle.');
    form.reset();
  } catch (error) {
    alert('Failed to add clue. Please try again.');
    console.error(error);
  }
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

  const grid = generateGrid(words);

  if (!grid) {
    crosswordContainer.innerHTML = '<p>Could not generate grid.</p>';
    return;
  }

  renderGrid(grid, words);
}

// Simple grid generation algorithm
function generateGrid(words) {
  const size = 20;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));

  // Place first word horizontally in the middle
  let [first, ...rest] = words;
  const mid = Math.floor(size / 2);
  const startCol = mid - Math.floor(first.answer.length / 2);

  for (let i = 0; i < first.answer.length; i++) {
    grid[mid][startCol + i] = { letter: first.answer[i], wordIndex: 0 };
  }

  // Place remaining words
  for (let w = 0; w < rest.length; w++) {
    const word = rest[w].answer;
    let placed = false;

    outer: for (let i = 0; i < word.length; i++) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = grid[r][c];
          if (cell && cell.letter === word[i]) {
            // Try placing vertically
            const startRow = r - i;
            if (startRow >= 0 && startRow + word.length <= size) {
              let conflict = false;
              for (let j = 0; j < word.length; j++) {
                const existing = grid[startRow + j][c];
                if (existing && existing.letter !== word[j]) {
                  conflict = true;
                  break;
                }
              }
              if (!conflict) {
                for (let j = 0; j < word.length; j++) {
                  grid[startRow + j][c] = { letter: word[j], wordIndex: w + 1 };
                }
                placed = true;
                break outer;
              }
            }

            // Try placing horizontally
            const startCol = c - i;
            if (startCol >= 0 && startCol + word.length <= size) {
              let conflict = false;
              for (let j = 0; j < word.length; j++) {
                const existing = grid[r][startCol + j];
                if (existing && existing.letter !== word[j]) {
                  conflict = true;
                  break;
                }
              }
              if (!conflict) {
                for (let j = 0; j < word.length; j++) {
                  grid[r][startCol + j] = { letter: word[j], wordIndex: w + 1 };
                }
                placed = true;
                break outer;
              }
            }
          }
        }
      }
    }

    if (!placed) {
      console.warn('Could not place word:', word);
    }
  }

  return grid;
}

// Render the crossword grid
function renderGrid(grid, words) {
  let html = '<div class="grid">';
  const inputs = [];

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        const id = `cell-${rowIndex}-${colIndex}`;
        html += `<div class="cell filled"><input maxlength="1" id="${id}" data-letter="${cell.letter}" /></div>`;
        inputs.push(id);
      } else {
        html += '<div class="cell empty"></div>';
      }
    });
  });
  html += '</div>';

  html += '<div class="clues"><h3>Clues</h3><ol>';
  for (let i = 0; i < words.length; i++) {
    html += `<li>${words[i].clue}</li>`;
  }
  html += '</ol></div>';

  crosswordContainer.innerHTML = html;

  // Input logic
  inputs.forEach((id, idx) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      if (input.value.length === 1 && idx + 1 < inputs.length) {
        document.getElementById(inputs[idx + 1]).focus();
      }
    });
  });
}

