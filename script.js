const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const btnStart = document.getElementById('start-btn');
const btnRestart = document.getElementById('restart-btn');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');

const charWraps = document.querySelectorAll('.char-wrap');

const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const timerBar = document.getElementById('timer-bar');
const finalScore = document.getElementById('final-score');
const finalLevel = document.getElementById('final-level');

// Game state
let isPlaying = false;
let score = 0;
let level = 1;
let selectedChar = 'blue';

// Timer info
const maxTime = 100;
let currentTime = 100;
let timeDropRate = 12; // units per second
let lastTimeStr = performance.now();

// Camera
let camTargetX = 0;
let camTargetY = 0;
let camX = 0;
let camY = 0;

// Game entities
let stairs = [];
let player = {
    stairIndex: 0,
    x: 0,
    y: 0
};
let particles = [];
let scoreFloaters = [];

// Layout config
const blockDx = 32; // world x offset 
const blockDy = 40; // world y offset

function resizeCanvas() {
    canvas.width = gameScreen.clientWidth;
    canvas.height = gameScreen.clientHeight;
    
    // Update initial camera slightly if needed
    if (!isPlaying && stairs.length > 0) {
        camX = stairs[0].x;
        camY = stairs[0].y;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Ensure initial size is right

// Init particles
for(let i=0; i<30; i++) {
    particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 20 + 20,
        opacity: Math.random() * 0.5 + 0.1
    });
}

// Character selection
charWraps.forEach(wrap => {
    wrap.addEventListener('click', () => {
        charWraps.forEach(w => w.classList.remove('active'));
        wrap.classList.add('active');
        selectedChar = wrap.dataset.char;
    });
});

function initGame() {
    score = 0;
    level = 1;
    currentTime = maxTime;
    timeDropRate = 12; 
    stairs = [];
    scoreFloaters = [];
    
    // Create base platform
    stairs.push({ index: 0, x: 0, y: 0, dir: 1 });
    
    // Generate initial stairs
    for (let i = 1; i <= 30; i++) {
        addStair();
    }
    
    player.stairIndex = 0;
    player.x = stairs[0].x;
    player.y = stairs[0].y;
    
    camTargetX = player.x;
    camTargetY = player.y;
    camX = player.x;
    camY = player.y;

    updateUI();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    isPlaying = true;
    lastTimeStr = performance.now();
    requestAnimationFrame(gameLoop);
}

function addStair() {
    const last = stairs[stairs.length - 1];
    const dir = Math.random() > 0.5 ? 1 : -1;
    stairs.push({
        index: last.index + 1,
        x: last.x + (dir * blockDx),
        y: last.y - blockDy,
        dir: dir
    });
}

function spawnScoreFloater(x, y, text) {
    scoreFloaters.push({
        x: x,
        y: y,
        text: text,
        life: 1.0 // 1 second
    });
}

function handleInput(inputDir) {
    if (!isPlaying) return;
    
    const nextStair = stairs[player.stairIndex + 1];
    
    if (nextStair.dir === inputDir) {
        // Success
        player.stairIndex++;
        
        // Save old position for animation
        player.x = nextStair.x;
        player.y = nextStair.y;
        
        score++;
        
        // Add time
        currentTime = Math.min(maxTime, currentTime + 6);
        
        // Floater effect
        spawnScoreFloater(player.x, player.y - 40, '+1');

        // Check level up (every 30 step)
        if (score % 30 === 0) {
            level++;
            timeDropRate += 4; // Difficulty up
            currentTime = Math.min(maxTime, currentTime + 20); // Extra recover
            spawnScoreFloater(player.x, player.y - 70, '레벨 업!');
        }
        
        // Generate new platform continually
        addStair();
        
        updateUI();
    } else {
        // Failed -> Game Over
        gameOver();
    }
}

// Controls
touchLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(-1); });
touchRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(1); });
touchLeft.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(-1); });
touchRight.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(1); });

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') handleInput(-1);
    else if (e.key === 'ArrowRight') handleInput(1);
});

btnStart.addEventListener('click', () => {
    resizeCanvas();
    initGame();
});

btnRestart.addEventListener('click', () => {
    initGame();
});

function gameOver() {
    isPlaying = false;
    finalScore.textContent = score;
    finalLevel.textContent = level;
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function updateUI() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = `Lv. ${level}`;
}

// Isometric block drawing
function drawIsometricBlock(x, y, isCurrent) {
    const sx = canvas.width / 2 + (x - camX);
    const sy = canvas.height * 0.7 + (y - camY);

    const hw = 32; // half width
    const hh = 16; // half height
    const d  = 24; // depth

    const topColor = isCurrent ? '#f59e0b' : '#334155';
    const leftColor = isCurrent ? '#d97706' : '#1e293b';
    const rightColor = isCurrent ? '#b45309' : '#0f172a';

    // Left face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy - hh);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx, sy + d);
    ctx.lineTo(sx - hw, sy - hh + d);
    ctx.fill();

    // Right face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + hw, sy - hh);
    ctx.lineTo(sx + hw, sy - hh + d);
    ctx.lineTo(sx, sy + d);
    ctx.fill();
    
    // Top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + hw, sy - hh);
    ctx.lineTo(sx, sy - hh * 2);
    ctx.lineTo(sx - hw, sy - hh);
    ctx.fill();
    
    ctx.strokeStyle = isCurrent ? '#fbbf24' : '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Draw the generic character
function drawPlayer(x, y) {
    const sx = canvas.width / 2 + (x - camX);
    const sy = canvas.height * 0.7 + (y - camY) - 32;

    const hoverY = isPlaying ? Math.sin(performance.now() / 150) * 3 : 0;
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    
    if (selectedChar === 'blue') {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(sx - 12, sy - 24 + hoverY, 24, 24);
        ctx.strokeRect(sx - 12, sy - 24 + hoverY, 24, 24);
    } else if (selectedChar === 'red') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(sx, sy - 12 + hoverY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (selectedChar === 'green') {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 24 + hoverY);
        ctx.lineTo(sx + 14, sy + hoverY);
        ctx.lineTo(sx - 14, sy + hoverY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function drawParticles(dt) {
    ctx.fillStyle = '#ffffff';
    particles.forEach(p => {
        p.y -= p.speed * dt;
        if(p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function drawFloaters(dt) {
    for (let i = scoreFloaters.length - 1; i >= 0; i--) {
        let f = scoreFloaters[i];
        f.y -= 40 * dt;
        f.life -= dt;
        
        if (f.life <= 0) {
            scoreFloaters.splice(i, 1);
            continue;
        }
        
        const sx = canvas.width / 2 + (f.x - camX);
        const sy = canvas.height * 0.7 + (f.y - camY);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${f.life})`;
        ctx.font = 'bold 22px Pretendard';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, sx, sy);
    }
}

function gameLoop(timestamp) {
    if (!isPlaying) return;
    
    let dt = (timestamp - lastTimeStr) / 1000;
    if (dt > 0.1) dt = 0.1; // clamp dt to avoid huge jumps on lag
    lastTimeStr = timestamp;
    
    // Timer update
    currentTime -= timeDropRate * dt;
    if (currentTime <= 0) {
        currentTime = 0;
        gameOver();
    }
    
    // Refresh bar layout safely
    const timeRatio = Math.max(0, currentTime / maxTime);
    timerBar.style.width = (timeRatio * 100) + '%';
    
    if (timeRatio < 0.3) {
        timerBar.style.background = '#ef4444';
    } else if (timeRatio < 0.6) {
        timerBar.style.background = '#f59e0b';
    } else {
        timerBar.style.background = '#10b981';
    }
    
    // Camera smooth follow
    camTargetX = player.x;
    camTargetY = player.y;
    
    camX += (camTargetX - camX) * 15 * dt;
    camY += (camTargetY - camY) * 15 * dt;
    
    // Begin Drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawParticles(dt);
    
    // Render stair blocks properly mapped back to front
    const startIdx = Math.max(0, player.stairIndex - 15);
    const endIdx = Math.min(stairs.length, player.stairIndex + 25);
    
    for (let i = startIdx; i < endIdx; i++) {
        const s = stairs[i];
        drawIsometricBlock(s.x, s.y, i === player.stairIndex);
    }
    
    drawPlayer(player.x, player.y);
    drawFloaters(dt);
    
    requestAnimationFrame(gameLoop);
}
