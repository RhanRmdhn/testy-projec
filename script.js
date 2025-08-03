class RetroCheckersGame {
    constructor() {
        // Inisialisasi variabel game
        this.board = []; // Papan permainan 8x8
        this.currentPlayer = 'player'; // 'player' atau 'bot'
        this.selectedSquare = null; // Kotak yang dipilih
        this.validMoves = []; // Gerakan yang valid
        this.gameHistory = []; // Riwayat untuk undo
        this.difficulty = 'sedang'; // Tingkat kesulitan
        this.isThinking = false; // Status bot sedang berpikir
        this.soundEnabled = true; // Status suara
        
        // Inisialisasi permainan
        this.initializeBoard();
        this.renderBoard();
        this.updateGameInfo();
        this.setupEventListeners();
    }

    /**
     * Inisialisasi papan permainan dengan posisi awal bidak
     */
    initializeBoard() {
        // Buat papan kosong 8x8
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Tempatkan bidak hitam (bot) di baris 0, 1, 2
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { 
                        color: 'black', 
                        isKing: false,
                        player: 'bot'
                    };
                }
            }
        }
        
        // Tempatkan bidak merah (pemain) di baris 5, 6, 7
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { 
                        color: 'red', 
                        isKing: false,
                        player: 'player'
                    };
                }
            }
        }
    }

    /**
     * Render papan permainan ke DOM
     */
    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                // Buat elemen kotak
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Tambahkan kelas untuk gerakan valid
                if (this.validMoves.some(move => move.row === row && move.col === col)) {
                    square.classList.add('valid-move');
                }

                // Tambahkan kelas untuk kotak yang dipilih
                if (this.selectedSquare && 
                    this.selectedSquare.row === row && 
                    this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                // Tambahkan bidak jika ada
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color} ${piece.isKing ? 'king' : ''}`;
                    square.appendChild(pieceElement);
                }

                // Tambahkan event listener untuk klik
                square.addEventListener('click', () => this.handleSquareClick(row, col));
                gameBoard.appendChild(square);
            }
        }
    }

    /**
     * Setup event listeners untuk kontrol game
     */
    setupEventListeners() {
        // Event listener untuk perubahan tingkat kesulitan
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.playSound('click');
        });
    }

    /**
     * Handle klik pada kotak papan
     */
    handleSquareClick(row, col) {
        // Jangan izinkan klik saat bot sedang berpikir atau bukan giliran pemain
        if (this.isThinking || this.currentPlayer !== 'player') {
            return;
        }

        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            // Coba lakukan gerakan
            const validMove = this.validMoves.find(move => 
                move.row === row && move.col === col
            );
            
            if (validMove) {
                // Lakukan gerakan
                this.makeMove(this.selectedSquare, { row, col }, validMove.captures);
                this.clearSelection();
                this.switchPlayer();
                this.playSound('move');
            } else {
                // Pilih bidak baru atau batalkan pilihan
                this.selectPiece(row, col, piece);
            }
        } else {
            // Pilih bidak
            this.selectPiece(row, col, piece);
        }

        this.renderBoard();
        this.updateGameInfo();
    }

    /**
     * Pilih bidak untuk dipindahkan
     */
    selectPiece(row, col, piece) {
        if (piece && piece.player === 'player') {
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMoves(row, col, piece);
            this.playSound('select');
            
            if (this.validMoves.length === 0) {
                document.getElementById('gameStatus').textContent = 
                    'Bidak ini tidak bisa bergerak';
            } else {
                document.getElementById('gameStatus').textContent = 
                    `${this.validMoves.length} gerakan tersedia`;
            }
        } else {
            this.clearSelection();
        }
    }

    /**
     * Batalkan pemilihan bidak
     */
    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        document.getElementById('gameStatus').textContent = 
            'Pilih bidak untuk bergerak';
    }

    /**
     * Dapatkan semua gerakan valid untuk bidak
     */
    getValidMoves(row, col, piece) {
        const moves = [];
        
        // Tentukan arah gerakan berdasarkan jenis bidak
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : // King bisa ke semua arah
            piece.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; // Bidak biasa

        for (const [deltaRow, deltaCol] of directions) {
            // Cek gerakan biasa
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, captures: [] });
            }

            // Cek gerakan makan (capture)
            const captureRow = row + deltaRow * 2;
            const captureCol = col + deltaCol * 2;
            
            if (this.isValidPosition(captureRow, captureCol) && 
                !this.board[captureRow][captureCol] &&
                this.board[newRow][newCol] &&
                this.board[newRow][newCol].player !== piece.player) {
                
                const captures = [{ row: newRow, col: newCol }];
                moves.push({ row: captureRow, col: captureCol, captures });
                
                // Cek multiple captures
                const multiCaptures = this.getMultipleCaptures(
                    captureRow, captureCol, piece, captures
                );
                moves.push(...multiCaptures);
            }
        }

        return moves;
    }

    /**
     * Dapatkan gerakan makan berantai (multiple captures)
     */
    getMultipleCaptures(row, col, piece, existingCaptures) {
        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            piece.color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

        for (const [deltaRow, deltaCol] of directions) {
            const captureRow = row + deltaRow * 2;
            const captureCol = col + deltaCol * 2;
            const middleRow = row + deltaRow;
            const middleCol = col + deltaCol;
            
            if (this.isValidPosition(captureRow, captureCol) && 
                !this.board[captureRow][captureCol] &&
                this.board[middleRow][middleCol] &&
                this.board[middleRow][middleCol].player !== piece.player &&
                !existingCaptures.some(cap => 
                    cap.row === middleRow && cap.col === middleCol)) {
                
                const newCaptures = [...existingCaptures, { row: middleRow, col: middleCol }];
                moves.push({ row: captureRow, col: captureCol, captures: newCaptures });
                
                // Rekursif untuk captures selanjutnya
                const furtherCaptures = this.getMultipleCaptures(
                    captureRow, captureCol, piece, newCaptures
                );
                moves.push(...furtherCaptures);
            }
        }

        return moves;
    }

    /**
     * Cek apakah posisi valid dalam papan
     */
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    /**
     * Lakukan gerakan bidak
     */
    makeMove(from, to, captures) {
        // Simpan state untuk undo
        this.gameHistory.push(JSON.parse(JSON.stringify(this.board)));

        // Pindahkan bidak
        const piece = this.board[from.row][from.col];
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Hapus bidak yang dimakan
        captures.forEach(capture => {
            this.board[capture.row][capture.col] = null;
        });

        // Cek promosi menjadi king
        if ((piece.color === 'red' && to.row === 0) || 
            (piece.color === 'black' && to.row === 7)) {
            piece.isKing = true;
            this.playSound('king');
        }

        // Aktifkan tombol undo
        document.getElementById('undoBtn').disabled = false;
    }

    /**
     * Ganti giliran pemain
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'player' ? 'bot' : 'player';
        
        if (this.currentPlayer === 'bot') {
            // Giliran bot, jalankan AI setelah delay
            setTimeout(() => this.makeBotMove(), 1000 + Math.random() * 1000);
        }
    }

    /**
     * Bot melakukan gerakan berdasarkan tingkat kesulitan
     */
    makeBotMove() {
        this.isThinking = true;
        document.getElementById('gameStatus').innerHTML = 
            '<span class="thinking-indicator">🤖 Bot sedang berpikir...</span>';
        
        setTimeout(() => {
            const move = this.getBestBotMove();
            if (move) {
                this.makeMove(move.from, move.to, move.captures);
                this.switchPlayer();
                this.playSound('move');
            } else {
                // Bot tidak bisa bergerak, pemain menang
                this.endGame('ANDA MENANG!', 'Bot tidak memiliki gerakan yang valid!');
            }
            
            this.isThinking = false;
            this.renderBoard();
            this.updateGameInfo();
            this.checkGameOver();
        }, 800 + Math.random() * 1200);
    }

    /**
     * Dapatkan gerakan terbaik untuk bot berdasarkan tingkat kesulitan
     */
    getBestBotMove() {
        const allMoves = this.getAllValidMovesForPlayer('bot');
        if (allMoves.length === 0) return null;

        switch (this.difficulty) {
            case 'mudah':
                return this.getRandomMove(allMoves);
            
            case 'sedang':
                return this.getMediumMove(allMoves);
            
            case 'sulit':
                return this.getHardMove(allMoves);
            
            default:
                return this.getRandomMove(allMoves);
        }
    }

    /**
     * Gerakan random untuk tingkat mudah
     */
    getRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    /**
     * Gerakan dengan strategi sederhana untuk tingkat sedang
     */
    getMediumMove(moves) {
        // Prioritas: 1. Capture, 2. Advance, 3. Random
        const captureMoves = moves.filter(move => move.captures.length > 0);
        if (captureMoves.length > 0) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }

        // Pilih gerakan yang maju ke depan
        const advanceMoves = moves.filter(move => move.to.row > move.from.row);
        if (advanceMoves.length > 0) {
            return advanceMoves[Math.floor(Math.random() * advanceMoves.length)];
        }

        return this.getRandomMove(moves);
    }

    /**
     * Gerakan dengan AI pintar untuk tingkat sulit
     */
    getHardMove(moves) {
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = 0;
            
            // Prioritas tinggi untuk capture
            score += move.captures.length * 50;
            
            // Bonus untuk multiple captures
            if (move.captures.length > 1) {
                score += move.captures.length * 20;
            }
            
            // Prioritas untuk bidak king
            const piece = this.board[move.from.row][move.from.col];
            if (piece.isKing) {
                score += 15;
            }
            
            // Prioritas untuk mencapai sisi berlawanan (menjadi king)
            if (!piece.isKing && move.to.row === 7) {
                score += 30;
            }
            
            // Prioritas untuk bergerak ke tengah
            const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
            score += (7 - centerDistance) * 2;
            
            // Prioritas untuk maju ke depan
            if (move.to.row > move.from.row) {
                score += 10;
            }
            
            // Hindari pinggir papan
            if (move.to.col === 0 || move.to.col === 7) {
                score -= 5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || this.getRandomMove(moves);
    }

    /**
     * Dapatkan semua gerakan valid untuk pemain tertentu
     */
    getAllValidMovesForPlayer(player) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === player) {
                    const pieceMoves = this.getValidMoves(row, col, piece);
                    pieceMoves.forEach(move => {
                        moves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            captures: move.captures
                        });
                    });
                }
            }
        }
        
        return moves;
    }

    /**
     * Update informasi permainan di panel kontrol
     */
    updateGameInfo() {
        const playerPieces = this.countPieces('player');
        const botPieces = this.countPieces('bot');
        
        document.getElementById('playerScore').textContent = playerPieces;
        document.getElementById('botScore').textContent = botPieces;
        
        const turnText = this.currentPlayer === 'player' ? 
            '🔴 GILIRAN: PEMAIN' : '⚫ GILIRAN: BOT';
        document.getElementById('currentTurn').textContent = turnText;
        
        if (!this.isThinking && this.currentPlayer === 'player') {
            document.getElementById('gameStatus').textContent = 'Pilih bidak untuk bergerak';
        }
    }

    /**
     * Hitung jumlah bidak untuk pemain tertentu
     */
    countPieces(player) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] && this.board[row][col].player === player) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Cek apakah permainan sudah berakhir
     */
    checkGameOver() {
        const playerPieces = this.countPieces('player');
        const botPieces = this.countPieces('bot');
        const playerMoves = this.getAllValidMovesForPlayer('player');
        const botMoves = this.getAllValidMovesForPlayer('bot');

        if (playerPieces === 0) {
            this.endGame('BOT MENANG!', 'Semua bidak Anda telah dimakan!');
        } else if (botPieces === 0) {
            this.endGame('ANDA MENANG!', 'Semua bidak bot telah dimakan!');
        } else if (this.currentPlayer === 'player' && playerMoves.length === 0) {
            this.endGame('BOT MENANG!', 'Anda tidak memiliki gerakan yang valid!');
        } else if (this.currentPlayer === 'bot' && botMoves.length === 0) {
            this.endGame('ANDA MENANG!', 'Bot tidak memiliki gerakan yang valid!');
        }
    }

    /**
     * Akhiri permainan dan tampilkan modal
     */
    endGame(title, message) {
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        document.getElementById('gameOverModal').style.display = 'flex';
        
        // Mainkan suara kemenangan atau kekalahan
        if (title.includes('ANDA MENANG')) {
            this.playSound('win');
        } else {
            this.playSound('lose');
        }
    }

    /**
     * Mainkan efek suara retro (tanpa file eksternal)
     */
    playSound(type) {
        if (!this.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            let frequency, duration, waveType;
            
            switch (type) {
                case 'move':
                    frequency = 440;
                    duration = 0.1;
                    waveType = 'square';
                    break;
                case 'select':
                    frequency = 660;
                    duration = 0.05;
                    waveType = 'sine';
                    break;
                case 'capture':
                    frequency = 220;
                    duration = 0.2;
                    waveType = 'sawtooth';
                    break;
                case 'king':
                    frequency = 880;
                    duration = 0.3;
                    waveType = 'triangle';
                    break;
                case 'win':
                    this.playMelody(audioContext, [523, 659, 784, 1047], 0.2);
                    return;
                case 'lose':
                    this.playMelody(audioContext, [392, 330, 262, 196], 0.3);
                    return;
                case 'click':
                    frequency = 800;
                    duration = 0.03;
                    waveType = 'square';
                    break;
                default:
                    return;
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = waveType;
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.log('Audio tidak didukung di browser ini');
        }
    }

    /**
     * Mainkan melodi untuk suara kemenangan/kekalahan
     */
    playMelody(audioContext, frequencies, noteDuration) {
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                try {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noteDuration);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + noteDuration);
                } catch (error) {
                    console.log('Audio tidak didukung di browser ini');
                }
            }, index * noteDuration * 1000);
        });
    }
}

// ===============================================
// FUNGSI GLOBAL UNTUK KONTROL GAME
// ===============================================

// Instance game global
let game;

/**
 * Mulai permainan baru
 */
function startNewGame() {
    game = new RetroCheckersGame();
    document.getElementById('undoBtn').disabled = true;
    closeGameOverModal();
    if (game.soundEnabled) {
        game.playSound('click');
    }
}

/**
 * Batalkan gerakan terakhir
 */
function undoLastMove() {
    if (game && game.gameHistory.length > 0) {
        game.board = game.gameHistory.pop();
        game.currentPlayer = 'player';
        game.clearSelection();
        game.renderBoard();
        game.updateGameInfo();
        game.playSound('click');
        
        if (game.gameHistory.length === 0) {
            document.getElementById('undoBtn').disabled = true;
        }
    }
}

/**
 * Toggle suara on/off
 */
function toggleSound() {
    if (game) {
        game.soundEnabled = !game.soundEnabled;
        const soundBtn = document.getElementById('soundBtn');
        soundBtn.textContent = game.soundEnabled ? '🔊 SUARA: ON' : '🔇 SUARA: OFF';
        if (game.soundEnabled) {
            game.playSound('click');
        }
    }
}

/**
 * Tutup modal game over
 */
function closeGameOverModal() {
    document.getElementById('gameOverModal').style.display = 'none';
}

// ===============================================
// EVENT LISTENERS GLOBAL
// ===============================================

/**
 * Inisialisasi game ketika halaman dimuat
 */
window.addEventListener('load', () => {
    startNewGame();
});

/**
 * Keyboard shortcuts untuk kontrol game
 */
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'n':
            startNewGame();
            break;
        case 'u':
            undoLastMove();
            break;
        case 's':
            toggleSound();
            break;
        case 'escape':
            closeGameOverModal();
            break;
        case 'h':
            // Show help (bisa ditambahkan nanti)
            console.log('Keyboard Shortcuts:\nN - New Game\nU - Undo\nS - Sound Toggle\nESC - Close Modal');
            break;
    }
});

/**
 * Prevent context menu pada papan game
 */
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.game-board')) {
        e.preventDefault();
    }
});

/**
 * Handle window resize untuk responsive
 */
window.addEventListener('resize', () => {
    if (game) {
        // Re-render board jika diperlukan
        setTimeout(() => {
            game.renderBoard();
        }, 100);
    }
});

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Fungsi debugging untuk melihat state game
 */
function debugGame() {
    if (game) {
        console.log('=== GAME DEBUG INFO ===');
        console.log('Current Player:', game.currentPlayer);
        console.log('Selected Square:', game.selectedSquare);
        console.log('Valid Moves:', game.validMoves);
        console.log('Player Pieces:', game.countPieces('player'));
        console.log('Bot Pieces:', game.countPieces('bot'));
        console.log('Difficulty:', game.difficulty);
        console.log('Sound Enabled:', game.soundEnabled);
        console.log('Board State:', game.board);
    }
}

/**
 * Fungsi untuk export/import game state (future feature)
 */
function exportGameState() {
    if (game) {
        const gameState = {
            board: game.board,
            currentPlayer: game.currentPlayer,
            difficulty: game.difficulty,
            gameHistory: game.gameHistory
        };
        return JSON.stringify(gameState);
    }
    return null;
}

function importGameState(gameStateString) {
    try {
        const gameState = JSON.parse(gameStateString);
        if (game) {
            game.board = gameState.board;
            game.currentPlayer = gameState.currentPlayer;
            game.difficulty = gameState.difficulty;
            game.gameHistory = gameState.gameHistory;
            game.clearSelection();
            game.renderBoard();
            game.updateGameInfo();
            document.getElementById('difficultySelect').value = game.difficulty;
        }
    } catch (error) {
        console.error('Invalid game state format');
    }
}

// Expose debug function to global scope untuk testing
window.debugGame = debugGame;
window.exportGameState = exportGameState;
window.importGameState = importGameState;