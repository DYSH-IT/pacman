const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const TILE_SIZE = 20;
const ROWS = 21;
const COLS = 19;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

// Game board layout (0: wall, 1: path, 2: dot, 3: power pellet)
const map = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,2,2,2,2,2,2,2,0,2,2,2,2,2,2,2,2,0],
    [0,3,0,0,2,0,0,0,2,0,2,0,0,0,2,0,0,3,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,2,0,0,2,0,2,0,0,0,0,0,2,0,2,0,0,2,0],
    [0,2,2,2,2,0,2,2,2,0,2,2,2,0,2,2,2,2,0],
    [0,0,0,0,2,0,0,2,0,0,0,2,0,0,2,0,0,0,0],
    [0,0,0,0,2,0,2,2,2,2,2,2,2,0,2,0,0,0,0],
    [0,0,0,0,2,0,2,0,0,1,0,0,2,0,2,0,0,0,0],
    [1,1,1,1,2,2,2,0,1,1,1,0,2,2,2,1,1,1,1],
    [0,0,0,0,2,0,2,0,0,1,0,0,2,0,2,0,0,0,0],
    [0,0,0,0,2,0,2,2,2,2,2,2,2,0,2,0,0,0,0],
    [0,0,0,0,2,0,2,0,0,0,0,0,2,0,2,0,0,0,0],
    [0,2,2,2,2,2,2,2,2,0,2,2,2,2,2,2,2,2,0],
    [0,3,0,0,2,0,0,0,2,0,2,0,0,0,2,0,0,3,0],
    [0,2,2,2,2,0,2,2,2,2,2,2,2,0,2,2,2,2,0],
    [0,0,2,0,2,0,2,0,0,0,0,0,2,0,2,0,2,0,0],
    [0,2,2,2,2,2,2,2,2,0,2,2,2,2,2,2,2,2,0],
    [0,2,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,2,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

let score = 0;
let lives = 3;
let dots = 0;
let isGameOver = false;
let frightenedTimer = 0;

const playerStart = { x: 9, y: 15 };
const ghostStart = { x: 9, y: 9 };

// Player
const player = {
    x: playerStart.x,
    y: playerStart.y,
    dx: 0,
    dy: 0,
    nextDx: 0,
    nextDy: 0,
    radius: TILE_SIZE / 2 - 2,
    speed: 1/8, // tiles per frame
};

// Ghosts
const ghosts = [
    { x: 8, y: 9, dx: 1, dy: 0, color: 'red', isFrightened: false },
    { x: 9, y: 9, dx: -1, dy: 0, color: 'pink', isFrightened: false },
    { x: 10, y: 9, dx: 1, dy: 0, color: 'cyan', isFrightened: false },
    { x: 9, y: 8, dx: -1, dy: 0, color: 'orange', isFrightened: false },
];

function isWall(x, y) {
    return map[y] && map[y][x] === 0;
}

function resetPlayer() {
    player.x = playerStart.x;
    player.y = playerStart.y;
    player.dx = 0;
    player.dy = 0;
    player.nextDx = 0;
    player.nextDy = 0;
}

function resetGhosts() {
    ghosts.forEach(ghost => {
        ghost.x = ghostStart.x;
        ghost.y = ghostStart.y;
        ghost.isFrightened = false;
    });
}

function updatePlayer() {
    // Check if player is on a grid intersection to allow direction change
    const onGrid = Math.abs(player.x - Math.round(player.x)) < player.speed && Math.abs(player.y - Math.round(player.y)) < player.speed;

    if (onGrid) {
        const gridX = Math.round(player.x);
        const gridY = Math.round(player.y);

        // Snap to grid to correct floating point inaccuracies
        player.x = gridX;
        player.y = gridY;

        // Try to apply the next intended direction
        if (player.nextDx !== 0 || player.nextDy !== 0) {
            if (!isWall(gridX + player.nextDx, gridY + player.nextDy)) {
                player.dx = player.nextDx;
                player.dy = player.nextDy;
                player.nextDx = 0;
                player.nextDy = 0;
            }
        }

        // If the way ahead is a wall, stop
        if (isWall(gridX + player.dx, gridY + player.dy)) {
            player.dx = 0;
            player.dy = 0;
        }
    }

    // Move player
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // Tunnel
    if (player.x < -0.5) player.x = COLS - 0.51;
    if (player.x > COLS - 0.5) player.x = -0.49;

    // Eat dots
    const playerGridX = Math.round(player.x);
    const playerGridY = Math.round(player.y);
    if (map[playerGridY][playerGridX] === 2) {
        map[playerGridY][playerGridX] = 1;
        score += 10;
        dots--;
    } else if (map[playerGridY][playerGridX] === 3) {
        map[playerGridY][playerGridX] = 1;
        score += 50;
        frightenedTimer = 300; // 5 seconds at 60fps
        ghosts.forEach(g => g.isFrightened = true);
    }
}

function updateGhosts() {
    if (frightenedTimer > 0) {
        frightenedTimer--;
        if (frightenedTimer === 0) {
            ghosts.forEach(g => g.isFrightened = false);
        }
    }

    ghosts.forEach(ghost => {
        const speed = ghost.isFrightened ? 1/16 : 1/10;
        const onGrid = Math.abs(ghost.x - Math.round(ghost.x)) < speed && Math.abs(ghost.y - Math.round(ghost.y)) < speed;

        if (onGrid) {
            const gridX = Math.round(ghost.x);
            const gridY = Math.round(ghost.y);
            ghost.x = gridX;
            ghost.y = gridY;

            const isPathAheadBlocked = isWall(gridX + ghost.dx, gridY + ghost.dy);

            const directions = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
            const validTurns = [];
            for (const dir of directions) {
                if (dir.dx === -ghost.dx && dir.dy === -ghost.dy) continue; // Don't consider turning back
                if (!isWall(gridX + dir.dx, gridY + dir.dy)) {
                    validTurns.push(dir);
                }
            }

            // Must turn if path is blocked, or sometimes at intersections
            if (isPathAheadBlocked || (validTurns.length > 0 && Math.random() < 0.5)) {
                if (validTurns.length > 0) {
                    const newDir = validTurns[Math.floor(Math.random() * validTurns.length)];
                    ghost.dx = newDir.dx;
                    ghost.dy = newDir.dy;
                } else { // Dead end, must turn back
                    if (!isWall(gridX - ghost.dx, gridY - ghost.dy)) {
                        ghost.dx = -ghost.dx;
                        ghost.dy = -ghost.dy;
                    }
                }
            }
        }

        ghost.x += ghost.dx * speed;
        ghost.y += ghost.dy * speed;
    });
}

function checkCollisions() {
    ghosts.forEach(ghost => {
        const dx = player.x - ghost.x;
        const dy = player.y - ghost.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.8) {
            if (ghost.isFrightened) {
                score += 200;
                ghost.x = ghostStart.x;
                ghost.y = ghostStart.y;
            } else {
                lives--;
                if (lives > 0) {
                    resetPlayer();
                } else {
                    isGameOver = true;
                }
            }
        }
    });
}

function checkWin() {
    if (dots === 0) {
        isGameOver = true;
    }
}

function drawMap() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] === 0) { // Wall
                ctx.fillStyle = 'blue';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (map[y][x] === 2) { // Dot
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (map[y][x] === 3) { // Power Pellet
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE + TILE_SIZE / 2, player.radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawGhosts() {
    ghosts.forEach(ghost => {
        ctx.fillStyle = ghost.isFrightened ? 'darkblue' : ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x * TILE_SIZE + TILE_SIZE / 2, ghost.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawUI() {
    ctx.fillStyle = 'yellow';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, TILE_SIZE * (ROWS) - 5);
    ctx.fillText('Lives: ' + lives, canvas.width - 80, TILE_SIZE * (ROWS) - 5);

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        if (dots === 0) {
            ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2);
        } else {
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        }
    }
}

function update() {
    if (isGameOver) return;

    updatePlayer();
    updateGhosts();
    checkCollisions();
    checkWin();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawPlayer();
    drawGhosts();
    drawUI();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial count of dots
for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
        if (map[y][x] === 2) {
            dots++;
        }
    }
}

// Keyboard input
document.addEventListener('keydown', e => {
    if (isGameOver) return;
    switch (e.key) {
        case 'ArrowUp': player.nextDx = 0; player.nextDy = -1; break;
        case 'ArrowDown': player.nextDx = 0; player.nextDy = 1; break;
        case 'ArrowLeft': player.nextDx = -1; player.nextDy = 0; break;
        case 'ArrowRight': player.nextDx = 1; player.nextDy = 0; break;
    }
});

// Start the game loop
requestAnimationFrame(gameLoop);
