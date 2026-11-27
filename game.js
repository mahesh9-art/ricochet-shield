const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    angle: 0
};

let enemies = [];
let bullets = [];
let spawnTimer = 0;

const keys = {};
let mouse = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

function spawnEnemy() {
    const x = Math.random() * canvas.width;
    const y = Math.random() < 0.5 ? 20 : canvas.height - 20;
    enemies.push({
        x: x,
        y: y,
        radius: 16,
        shootTimer: 90
    });
}

function update() {
    // Player movement
    if (keys['w'] && player.y > player.radius) player.y -= player.speed;
    if (keys['s'] && player.y < canvas.height - player.radius) player.y += player.speed;
    if (keys['a'] && player.x > player.radius) player.x -= player.speed;
    if (keys['d'] && player.x < canvas.width - player.radius) player.x += player.speed;

    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    // Spawn enemy every ~2 seconds
    spawnTimer++;
    if (spawnTimer > 120 && enemies.length < 4) {
        spawnEnemy();
        spawnTimer = 0;
    }

    // Enemies shoot at player
    enemies.forEach(enemy => {
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            bullets.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                deflected: false
            });
            enemy.shootTimer = 120;
        }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Remove if off screen
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }

        // Shield bounce check
        const dist = Math.hypot(b.x - player.x, b.y - player.y);
        if (!b.deflected && dist < 42 && dist > 25) {
            const bAngle = Math.atan2(b.y - player.y, b.x - player.x);
            const diff = Math.atan2(Math.sin(bAngle - player.angle), Math.cos(bAngle - player.angle));
            if (Math.abs(diff) < 0.7) {
                b.deflected = true;
                b.vx = Math.cos(player.angle) * 7;
                b.vy = Math.sin(player.angle) * 7;
            }
        }

        // Deflected bullet hits enemy
        if (b.deflected) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 6) {
                    enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw enemies
    ctx.fillStyle = '#ff0055';
    enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.deflected ? '#39ff14' : '#ff9900';
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
    ctx.arc(player.x, player.y, 35, player.angle - 0.6, player.angle + 0.6);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 6;
    ctx.stroke();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
