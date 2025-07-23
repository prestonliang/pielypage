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
  const entries = words.map((w, i) => ({
    word: w.answer.toLowerCase(),
    clue: w.clue,
    id: i + 1
  }));

  const layout = crosswordLayoutGenerator.generateLayout(entries);

  if (!layout || layout.result !== 'success') {
    console.warn('Layout failed:', layout);
    return null;
  }

  const size = layout.size;
  const grid = Array.from({ length: size.rows }, () => Array(size.cols).fill(null));

  layout.entries.forEach(entry => {
    const { x, y, direction, word, id } = entry;
    for (let i = 0; i < word.length; i++) {
      const row = direction === 'across' ? y : y + i;
      const col = direction === 'across' ? x + i : x;
      grid[row][col] = { letter: word[i].toUpperCase(), wordIndex: id };
    }
  });

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

