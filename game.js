const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game State & Difficulty Settings
let gameState = 'MENU'; // 'MENU', 'PLAYING', 'GAMEOVER'
let currentDifficulty = 'MEDIUM';

const DIFFICULTIES = {
    EASY:   { maxEnemies: 3, instantAt: 1, after5MinDelay: 1800, bulletSpeed: 3.5, color: '#39ff14', label: 'EASY (3 Enemies)' },
    MEDIUM: { maxEnemies: 5, instantAt: 3, after5MinDelay: 1500, bulletSpeed: 4.5, color: '#ffae00', label: 'MEDIUM (5 Enemies)' },
    HARD:   { maxEnemies: 6, instantAt: 4, after5MinDelay: 1200, bulletSpeed: 5.5, color: '#ff0055', label: 'HARD (6 Enemies)' }
};

// Menu Buttons
const menuButtons = [
    { key: 'EASY',   x: 250, y: 270, w: 300, h: 55 },
    { key: 'MEDIUM', x: 250, y: 345, w: 300, h: 55 },
    { key: 'HARD',   x: 250, y: 420, w: 300, h: 55 }
];

let score = 0;
let hp = 5;
let gameStartTime = 0;
let lastSpawnTime = 0;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    angle: 0
};

let enemies = [];
let bullets = [];

const keys = {};
let mouse = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (gameState === 'MENU') {
        if (k === '1') startGame('EASY');
        if (k === '2') startGame('MEDIUM');
        if (k === '3') startGame('HARD');
    } else if (gameState === 'GAMEOVER') {
        if (k === 'r') startGame(currentDifficulty);
        if (k === 'm') gameState = 'MENU';
    }
});

window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (gameState !== 'MENU') return;
    menuButtons.forEach(btn => {
        if (mouse.x >= btn.x && mouse.x <= btn.x + btn.w &&
            mouse.y >= btn.y && mouse.y <= btn.y + btn.h) {
            startGame(btn.key);
        }
    });
});

function startGame(diffKey) {
    currentDifficulty = diffKey;
    score = 0;
    hp = 5;
    enemies = [];
    bullets = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    gameStartTime = Date.now();
    lastSpawnTime = Date.now();

    // Start hote hi full enemies screen par aa jayenge (3, 5, ya 6)
    const settings = DIFFICULTIES[currentDifficulty];
    for (let i = 0; i < settings.maxEnemies; i++) {
        spawnEnemy();
    }

    gameState = 'PLAYING';
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = 20; }
    else if (side === 1) { x = canvas.width - 20; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height - 20; }
    else { x = 20; y = Math.random() * canvas.height; }

    const colors = ['#ff0055', '#bd00ff', '#ff6600'];
    enemies.push({
        x: x,
        y: y,
        radius: 16,
        color: colors[Math.floor(Math.random() * colors.length)],
        shootTimer: 60 + Math.random() * 90
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    const settings = DIFFICULTIES[currentDifficulty];
    const now = Date.now();

    // Player movement
    if (keys['w'] && player.y > player.radius) player.y -= player.speed;
    if (keys['s'] && player.y < canvas.height - player.radius) player.y += player.speed;
    if (keys['a'] && player.x > player.radius) player.x -= player.speed;
    if (keys['d'] && player.x < canvas.width - player.radius) player.x += player.speed;

    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    // Enemy Respawn Logic
    const isFirst5Mins = (now - gameStartTime) < 5 * 60 * 1000;
    const normalDelay = isFirst5Mins ? 3000 : settings.after5MinDelay;

    if (enemies.length < settings.maxEnemies) {
        if (enemies.length <= settings.instantAt) {
            // Threshold se kam ya barabar hone par turant respawn
            spawnEnemy();
            lastSpawnTime = now;
        } else if ((now - lastSpawnTime) >= normalDelay) {
            // Baaki normally 3 second baad respawn (first 5 mins mein)
            spawnEnemy();
            lastSpawnTime = now;
        }
    }

    // Enemies shoot at player
    enemies.forEach(enemy => {
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            bullets.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * settings.bulletSpeed,
                vy: Math.sin(angle) * settings.bulletSpeed,
                deflected: false,
                bounces: 0,
                color: enemy.color
            });
            enemy.shootTimer = 95 + Math.random() * 45;
        }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Wall Bounce for deflected bullets
        if (b.deflected) {
            if (b.x <= 6 || b.x >= canvas.width - 6) {
                b.vx *= -1;
                b.bounces++;
            }
            if (b.y <= 6 || b.y >= canvas.height - 6) {
                b.vy *= -1;
                b.bounces++;
            }
            if (b.bounces > 3) {
                bullets.splice(i, 1);
                continue;
            }
        } else {
            if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
                bullets.splice(i, 1);
                continue;
            }
        }

        // Shield bounce check
        const dist = Math.hypot(b.x - player.x, b.y - player.y);
        if (!b.deflected && dist < 42 && dist > 25) {
            const bAngle = Math.atan2(b.y - player.y, b.x - player.x);
            const diff = Math.atan2(Math.sin(bAngle - player.angle), Math.cos(bAngle - player.angle));
            if (Math.abs(diff) < 0.75) {
                b.deflected = true;
                b.color = '#39ff14';
                b.vx = Math.cos(player.angle) * 8;
                b.vy = Math.sin(player.angle) * 8;
                continue;
            }
        }

        // Player hit check
        if (!b.deflected && dist < player.radius + 6) {
            hp--;
            bullets.splice(i, 1);
            if (hp <= 0) gameState = 'GAMEOVER';
            continue;
        }

        // Deflected bullet hits enemy
        if (b.deflected) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 6) {
                    score += 100 * (b.bounces + 1);
                    // Agar full count se kam hua toh 3-sec timer yahin se start hoga
                    if (enemies.length === settings.maxEnemies) {
                        lastSpawnTime = now;
                    }
                    enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
}

function drawMenu() {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('RICOCHET SHIELD', canvas.width / 2, 130);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText('SELECT DIFFICULTY TO START', canvas.width / 2, 220);

    menuButtons.forEach(btn => {
        const diff = DIFFICULTIES[btn.key];
        const isHover = mouse.x >= btn.x && mouse.x <= btn.x + btn.w &&
                        mouse.y >= btn.y && mouse.y <= btn.y + btn.h;

        ctx.fillStyle = isHover ? diff.color : 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = diff.color;
        ctx.lineWidth = 3;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        ctx.fillStyle = isHover ? '#000000' : '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(diff.label, btn.x + btn.w / 2, btn.y + 35);
    });

    ctx.fillStyle = '#cccccc';
    ctx.font = '15px monospace';
    ctx.fillText('WASD: Move  |  Mouse: Aim Shield  |  Or press 1, 2, 3', canvas.width / 2, 535);
    ctx.textAlign = 'left';
}

function draw() {
    if (gameState === 'MENU') {
        drawMenu();
        return;
    }

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw shield
    ctx.beginPath();
    ctx.arc(player.x, player.y, 35, player.angle - 0.65, player.angle + 0.65);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 6;
    ctx.stroke();

    // HUD: Score, Difficulty, HP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`SCORE: ${score}`, 20, 30);

    ctx.fillStyle = DIFFICULTIES[currentDifficulty].color;
    ctx.textAlign = 'center';
    ctx.fillText(currentDifficulty, canvas.width / 2, 30);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#ff0055';
    ctx.fillText(`HP: ${hp}`, canvas.width - 90, 30);

    // Game Over Screen
    if (gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '22px monospace';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
        ctx.fillStyle = '#00f3ff';
        ctx.font = '18px monospace';
        ctx.fillText("Press 'R' to Restart  |  Press 'M' for Menu", canvas.width / 2, canvas.height / 2 + 55);
        ctx.textAlign = 'left';
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();