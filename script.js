// Configuration
const CONFIG = {
    GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzedDQmSJfyU6w69Tt7q0_QwEtdlh4WZFe7Mz6J9eP1tNtC9fKyP_BpHpW3QZPYORDMuw/exec", // Replace with your deployed GAS URL
    GRID_SIZE: 15,
    MIN_WORD_LENGTH: 3,
    MAX_WORD_LENGTH: 12
};

// Global state
let currentWeek = getCurrentWeek();
let currentCrossword = null;
let selectedCell = null;
let selectedDirection = 'across';
let showingSolution = false;

// DOM Elements
const elements = {
    weekDisplay: document.getElementById('week-display'),
    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    generateBtn: document.getElementById('generate-crossword'),
    addClueBtn: document.getElementById('add-clue-btn'),
    printBtn: document.getElementById('print-crossword'),
    loading: document.getElementById('loading'),
    message: document.getElementById('message'),
    addClueModal: document.getElementById('add-clue-modal'),
    addClueForm: document.getElementById('add-clue-form'),
    cancelAddBtn: document.getElementById('cancel-add'),
    closeModal: document.querySelector('.close'),
    crosswordGrid: document.getElementById('crossword-grid'),
    acrossClues: document.getElementById('across-clues'),
    downClues: document.getElementById('down-clues'),
    toggleSolution: document.getElementById('toggle-solution'),
    clearAnswers: document.getElementById('clear-answers')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateWeekDisplay();
    loadCrosswordForWeek();
});

// Event Listeners
function setupEventListeners() {
    elements.prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    elements.nextWeekBtn.addEventListener('click', () => navigateWeek(1));
    elements.generateBtn.addEventListener('click', generateNewCrossword);
    elements.addClueBtn.addEventListener('click', openAddClueModal);
    elements.printBtn.addEventListener('click', printCrossword);
    elements.addClueForm.addEventListener('submit', handleAddClue);
    elements.cancelAddBtn.addEventListener('click', closeAddClueModal);
    elements.closeModal.addEventListener('click', closeAddClueModal);
    elements.toggleSolution.addEventListener('click', toggleSolution);
    elements.clearAnswers.addEventListener('click', clearAllAnswers);
    
    // Close modal when clicking outside
    elements.addClueModal.addEventListener('click', (e) => {
        if (e.target === elements.addClueModal) {
            closeAddClueModal();
        }
    });
}

// Week Navigation
function getCurrentWeek() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday.toISOString().split('T')[0];
}

function navigateWeek(direction) {
    const currentDate = new Date(currentWeek);
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    currentWeek = currentDate.toISOString().split('T')[0];
    updateWeekDisplay();
    loadCrosswordForWeek();
}

function updateWeekDisplay() {
    const date = new Date(currentWeek);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    elements.weekDisplay.textContent = `Week of ${date.toLocaleDateString('en-US', options)}`;
}

// API Calls
async function apiCall(action, data = {}) {
    try {
        showLoading(true);
        const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        showMessage(`Error: ${error.message}`, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Crossword Generation
async function generateNewCrossword() {
    try {
        const result = await apiCall('generateCrossword', { week: currentWeek });
        if (result.crossword) {
            currentCrossword = result.crossword;
            renderCrossword();
            showMessage('New crossword generated successfully!', 'success');
        }
    } catch (error) {
        showMessage('Failed to generate crossword. Please try again.', 'error');
    }
}

async function loadCrosswordForWeek() {
    try {
        const result = await apiCall('getCrossword', { week: currentWeek });
        if (result.crossword) {
            currentCrossword = result.crossword;
            renderCrossword();
        } else {
            // No crossword exists for this week, generate one
            await generateNewCrossword();
        }
    } catch (error) {
        showMessage('Failed to load crossword for this week.', 'error');
    }
}

// Crossword Rendering
function renderCrossword() {
    if (!currentCrossword) return;
    
    renderGrid();
    renderClues();
    showingSolution = false;
    elements.toggleSolution.textContent = 'Show Solution';
}

function renderGrid() {
    const { grid, size } = currentCrossword;
    elements.crosswordGrid.innerHTML = '';
    elements.crosswordGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = createCell(grid[row][col], row, col);
            elements.crosswordGrid.appendChild(cell);
        }
    }
}

function createCell(cellData, row, col) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    
    if (cellData.black) {
        cell.classList.add('black');
    } else {
        if (cellData.number) {
            const number = document.createElement('span');
            number.className = 'cell-number';
            number.textContent = cellData.number;
            cell.appendChild(number);
        }
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.addEventListener('input', handleCellInput);
        input.addEventListener('focus', () => selectCell(cell));
        input.addEventListener('keydown', handleKeyDown);
        cell.appendChild(input);
        
        cell.addEventListener('click', () => selectCell(cell));
    }
    
    return cell;
}

function renderClues() {
    const { clues } = currentCrossword;
    
    elements.acrossClues.innerHTML = '';
    elements.downClues.innerHTML = '';
    
    // Render across clues
    clues.across.forEach(clue => {
        const clueElement = createClueElement(clue, 'across');
        elements.acrossClues.appendChild(clueElement);
    });
    
    // Render down clues
    clues.down.forEach(clue => {
        const clueElement = createClueElement(clue, 'down');
        elements.downClues.appendChild(clueElement);
    });
}

function createClueElement(clue, direction) {
    const div = document.createElement('div');
    div.className = 'clue-item';
    div.dataset.number = clue.number;
    div.dataset.direction = direction;
    
    div.innerHTML = `
        <span class="clue-number">${clue.number}</span>
        ${clue.clue}
    `;
    
    div.addEventListener('click', () => selectClue(clue.number, direction));
    
    return div;
}

// Cell Interaction
function selectCell(cell) {
    if (cell.classList.contains('black')) return;
    
    // Clear previous selection
    document.querySelectorAll('.cell.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.cell.highlighted').forEach(c => c.classList.remove('highlighted'));
    document.querySelectorAll('.clue-item.active').forEach(c => c.classList.remove('active'));
    
    selectedCell = cell;
    cell.classList.add('active');
    
    // Find and highlight the word
    highlightCurrentWord();
}

function selectClue(number, direction) {
    selectedDirection = direction;
    
    // Clear previous selection
    document.querySelectorAll('.cell.active, .cell.highlighted').forEach(c => {
        c.classList.remove('active', 'highlighted');
    });
    document.querySelectorAll('.clue-item.active').forEach(c => c.classList.remove('active'));
    
    // Find the starting cell for this clue
    const startCell = document.querySelector(`[data-row] .cell-number:contains("${number}")`);
    if (startCell) {
        const cell = startCell.closest('.cell');
        selectCell(cell);
    }
    
    // Highlight the clue
    const clueElement = document.querySelector(`.clue-item[data-number="${number}"][data-direction="${direction}"]`);
    if (clueElement) {
        clueElement.classList.add('active');
    }
}

function highlightCurrentWord() {
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    const { words } = currentCrossword;
    
    // Find which word this cell belongs to
    const word = words.find(w => {
        if (w.direction === selectedDirection) {
            const startRow = w.row;
            const startCol = w.col;
            const endRow = w.direction === 'across' ? startRow : startRow + w.answer.length - 1;
            const endCol = w.direction === 'across' ? startCol + w.answer.length - 1 : startCol;
            
            return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
        }
        return false;
    });
    
    if (word) {
        // Highlight all cells in this word
        for (let i = 0; i < word.answer.length; i++) {
            const cellRow = word.direction === 'across' ? word.row : word.row + i;
            const cellCol = word.direction === 'across' ? word.col + i : word.col;
            const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (cell && !cell.classList.contains('black')) {
                cell.classList.add('highlighted');
            }
        }
    }
}

function handleCellInput(e) {
    const input = e.target;
    const value = input.value.toUpperCase();
    
    if (value.match(/[A-Z]/)) {
        input.value = value;
        moveToNextCell();
    } else {
        input.value = '';
    }
}

function handleKeyDown(e) {
    const input = e.target;
    const cell = input.closest('.cell');
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    switch (e.key) {
        case 'ArrowLeft':
            moveToCell(row, col - 1);
            break;
        case 'ArrowRight':
            moveToCell(row, col + 1);
            break;
        case 'ArrowUp':
            moveToCell(row - 1, col);
            break;
        case 'ArrowDown':
            moveToCell(row + 1, col);
            break;
        case 'Backspace':
            if (!input.value) {
                moveToPrevCell();
            }
            break;
        case 'Tab':
            e.preventDefault();
            selectedDirection = selectedDirection === 'across' ? 'down' : 'across';
            highlightCurrentWord();
            break;
    }
}

function moveToNextCell() {
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    
    if (selectedDirection === 'across') {
        moveToCell(row, col + 1);
    } else {
        moveToCell(row + 1, col);
    }
}

function moveToPrevCell() {
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    
    if (selectedDirection === 'across') {
        moveToCell(row, col - 1);
    } else {
        moveToCell(row - 1, col);
    }
}

function moveToCell(row, col) {
    const targetCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (targetCell && !targetCell.classList.contains('black')) {
        const input = targetCell.querySelector('input');
        if (input) {
            input.focus();
            selectCell(targetCell);
        }
    }
}

// Add Clue Modal
function openAddClueModal() {
    elements.addClueModal.style.display = 'block';
    document.getElementById('new-word').focus();
}

function closeAddClueModal() {
    elements.addClueModal.style.display = 'none';
    elements.addClueForm.reset();
}

async function handleAddClue(e) {
    e.preventDefault();
    
    const word = document.getElementById('new-word').value.trim().toUpperCase();
    const clue = document.getElementById('new-clue').value.trim();
    
    if (!word || !clue) {
        showMessage('Please fill in both word and clue fields.', 'error');
        return;
    }
    
    // Validate word (only letters and spaces)
    if (!/^[A-Z\s]+$/.test(word)) {
        showMessage('Word can only contain letters and spaces.', 'error');
        return;
    }
    
    try {
        await apiCall('addClue', {
            word: word,
            clue: clue,
            date_added: new Date().toISOString().split('T')[0]
        });
        
        showMessage('Clue added successfully!', 'success');
        closeAddClueModal();
    } catch (error) {
        showMessage('Failed to add clue. Please try again.', 'error');
    }
}

// Solution Toggle
function toggleSolution() {
    if (!currentCrossword) return;
    
    showingSolution = !showingSolution;
    
    if (showingSolution) {
        showSolution();
        elements.toggleSolution.textContent = 'Hide Solution';
    } else {
        hideSolution();
        elements.toggleSolution.textContent = 'Show Solution';
    }
}

function showSolution() {
    const { words } = currentCrossword;
    
    words.forEach(word => {
        for (let i = 0; i < word.answer.length; i++) {
            const row = word.direction === 'across' ? word.row : word.row + i;
            const col = word.direction === 'across' ? word.col + i : word.col;
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const input = cell?.querySelector('input');
            
            if (input) {
                input.value = word.answer[i];
                input.style.color = '#007bff';
                input.style.backgroundColor = '#f8f9fa';
            }
        }
    });
}

function hideSolution() {
    document.querySelectorAll('.cell input').forEach(input => {
        input.style.color = '';
        input.style.backgroundColor = '';
    });
}

function clearAllAnswers() {
    if (confirm('Are you sure you want to clear all answers?')) {
        document.querySelectorAll('.cell input').forEach(input => {
            input.value = '';
            input.style.color = '';
            input.style.backgroundColor = '';
        });
        showingSolution = false;
        elements.toggleSolution.textContent = 'Show Solution';
        showMessage('All answers cleared.', 'success');
    }
}

// Print Functionality
function printCrossword() {
    const printWindow = window.open('', '_blank');
    const crosswordHTML = generatePrintHTML();
    
    printWindow.document.write(crosswordHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function generatePrintHTML() {
    if (!currentCrossword) return '';
    
    const { grid, clues, size } = currentCrossword;
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Crossword - Week of ${elements.weekDisplay.textContent}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; margin-bottom: 30px; }
                .crossword-container { display: flex; gap: 40px; }
                .grid-container { flex: 1; }
                .clues-container { flex: 1; }
                .grid { 
                    display: grid; 
                    grid-template-columns: repeat(${size}, 25px);
                    gap: 1px;
                    background: #000;
                    padding: 1px;
                    margin-bottom: 20px;
                }
                .cell { 
                    width: 25px; 
                    height: 25px; 
                    background: white;
                    position: relative;
                    border: 1px solid #ccc;
                }
                .cell.black { background: #000; }
                .cell-number { 
                    position: absolute;
                    top: 1px;
                    left: 2px;
                    font-size: 8px;
                }
                .clues-section { margin-bottom: 30px; }
                .clues-section h3 { margin-bottom: 10px; }
                .clue-item { margin-bottom: 5px; }
                @media print { 
                    .crossword-container { flex-direction: column; }
                    .grid { margin: 0 auto 20px; }
                }
            </style>
        </head>
        <body>
            <h1>Weekly Crossword - ${elements.weekDisplay.textContent}</h1>
            <div class="crossword-container">
                <div class="grid-container">
                    <div class="grid">`;
    
    // Add grid cells
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cellData = grid[row][col];
            const cellClass = cellData.black ? 'cell black' : 'cell';
            const number = cellData.number ? `<span class="cell-number">${cellData.number}</span>` : '';
            html += `<div class="${cellClass}">${number}</div>`;
        }
    }
    
    html += `
                    </div>
                </div>
                <div class="clues-container">
                    <div class="clues-section">
                        <h3>Across</h3>`;
    
    // Add across clues
    clues.across.forEach(clue => {
        html += `<div class="clue-item"><strong>${clue.number}.</strong> ${clue.clue}</div>`;
    });
    
    html += `
                    </div>
                    <div class="clues-section">
                        <h3>Down</h3>`;
    
    // Add down clues
    clues.down.forEach(clue => {
        html += `<div class="clue-item"><strong>${clue.number}.</strong> ${clue.clue}</div>`;
    });
    
    html += `
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    
    return html;
}

// Utility Functions
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'info') {
    elements.message.textContent = message;
    elements.message.className = `message ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            elements.message.textContent = '';
            elements.message.className = 'message';
        }, 3000);
    }
}

// Helper function for selecting elements by text content
function findElementByText(selector, text) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).find(el => el.textContent.includes(text));
}

// Crossword Generation Algorithm (Simple Implementation)
// This is a basic implementation - you might want to use a more sophisticated algorithm
function generateSimpleCrossword(words) {
    const grid = Array(CONFIG.GRID_SIZE).fill(null).map(() => 
        Array(CONFIG.GRID_SIZE).fill(null).map(() => ({ black: true }))
    );
    
    const placedWords = [];
    const clues = { across: [], down: [] };
    let numberCounter = 1;
    
    // Sort words by length (longer first for better placement)
    const sortedWords = words.sort((a, b) => b.word.length - a.word.length);
    
    // Place first word horizontally in the center
    if (sortedWords.length > 0) {
        const firstWord = sortedWords[0];
        const startRow = Math.floor(CONFIG.GRID_SIZE / 2);
        const startCol = Math.floor((CONFIG.GRID_SIZE - firstWord.word.length) / 2);
        
        placeWord(grid, firstWord, startRow, startCol, 'across', numberCounter++, placedWords, clues);
    }
    
    // Try to place remaining words
    for (let i = 1; i < Math.min(sortedWords.length, 15); i++) {
        const word = sortedWords[i];
        let placed = false;
        
        // Try to intersect with existing words
        for (const placedWord of placedWords) {
            if (placed) break;
            
            for (let j = 0; j < placedWord.answer.length; j++) {
                if (placed) break;
                
                for (let k = 0; k < word.word.length; k++) {
                    if (placedWord.answer[j].toUpperCase() === word.word[k].toUpperCase()) {
                        // Try to place perpendicular to existing word
                        const direction = placedWord.direction === 'across' ? 'down' : 'across';
                        let newRow, newCol;
                        
                        if (direction === 'down') {
                            newRow = placedWord.row - k;
                            newCol = placedWord.col + j;
                        } else {
                            newRow = placedWord.row + j;
                            newCol = placedWord.col - k;
                        }
                        
                        if (canPlaceWord(grid, word.word, newRow, newCol, direction)) {
                            placeWord(grid, word, newRow, newCol, direction, numberCounter++, placedWords, clues);
                            placed = true;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    return {
        grid,
        words: placedWords,
        clues,
        size: CONFIG.GRID_SIZE
    };
}

function canPlaceWord(grid, word, row, col, direction) {
    const size = CONFIG.GRID_SIZE;
    
    if (direction === 'across') {
        if (col + word.length > size || row < 0 || row >= size) return false;
        
        for (let i = 0; i < word.length; i++) {
            const cell = grid[row][col + i];
            if (!cell.black && cell.letter && cell.letter !== word[i].toUpperCase()) {
                return false;
            }
        }
    } else {
        if (row + word.length > size || col < 0 || col >= size) return false;
        
        for (let i = 0; i < word.length; i++) {
            const cell = grid[row + i][col];
            if (!cell.black && cell.letter && cell.letter !== word[i].toUpperCase()) {
                return false;
            }
        }
    }
    
    return true;
}

function placeWord(grid, wordObj, row, col, direction, number, placedWords, clues) {
    const word = wordObj.word.replace(/\s+/g, '').toUpperCase();
    
    // Place the word in the grid
    for (let i = 0; i < word.length; i++) {
        const currentRow = direction === 'across' ? row : row + i;
        const currentCol = direction === 'across' ? col + i : col;
        
        grid[currentRow][currentCol] = {
            black: false,
            letter: word[i],
            number: i === 0 ? number : (grid[currentRow][currentCol].number || null)
        };
    }
    
    // Add to placed words
    placedWords.push({
        answer: word,
        row,
        col,
        direction,
        number
    });
    
    // Add to clues
    clues[direction].push({
        number,
        clue: wordObj.clue,
        answer: word
    });
}

// This would be called from the backend, but here's a mock version
window.mockCrosswordData = {
    crossword: {
        grid: Array(15).fill(null).map((_, i) => 
            Array(15).fill(null).map((_, j) => {
                if (i === 7 && j >= 5 && j <= 9) {
                    return { black: false, letter: 'HELLO'[j-5], number: j === 5 ? 1 : null };
                }
                if (j === 7 && i >= 5 && i <= 9) {
                    return { black: false, letter: 'WORLD'[i-5], number: i === 5 ? 2 : null };
                }
                return { black: true };
            })
        ),
        words: [
            { answer: 'HELLO', row: 7, col: 5, direction: 'across', number: 1 },
            { answer: 'WORLD', row: 5, col: 7, direction: 'down', number: 2 }
        ],
        clues: {
            across: [{ number: 1, clue: 'A greeting', answer: 'HELLO' }],
            down: [{ number: 2, clue: 'The Earth', answer: 'WORLD' }]
        },
        size: 15
    }
};

// For testing purposes - remove when backend is ready
if (CONFIG.GOOGLE_APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.warn('Google Apps Script URL not configured. Using mock data.');
    
    // Override API calls for testing
    window.originalApiCall = apiCall;
    window.apiCall = async function(action, data = {}) {
        showLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        showLoading(false);
        
        switch (action) {
            case 'generateCrossword':
            case 'getCrossword':
                return window.mockCrosswordData;
            case 'addClue':
                return { success: true };
            default:
                return { success: true };
        }
    };
}
