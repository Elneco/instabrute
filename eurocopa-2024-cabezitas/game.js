const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const teamSelect = document.getElementById('teamSelect');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const leftTeamEl = document.getElementById('leftTeam');
const rightTeamEl = document.getElementById('rightTeam');

const euroTeams = [
  'Alemania',
  'Albania',
  'Austria',
  'Bélgica',
  'Croacia',
  'Dinamarca',
  'Escocia',
  'Eslovaquia',
  'Eslovenia',
  'España',
  'Francia',
  'Georgia',
  'Hungría',
  'Inglaterra',
  'Italia',
  'Países Bajos',
  'Polonia',
  'Portugal',
  'República Checa',
  'Rumanía',
  'Serbia',
  'Suiza',
  'Turquía',
  'Ucrania',
];

const keys = {};
const gravity = 0.42;
const floorY = canvas.height - 56;
const goalHeight = 180;
const goalWidth = 28;
let lastTime = 0;

const match = {
  scoreLeft: 0,
  scoreRight: 0,
  isGoalPause: false,
  pauseTimer: 0,
};

const player = {
  x: 200,
  y: floorY - 45,
  r: 45,
  vx: 0,
  vy: 0,
  speed: 4.4,
  jumpForce: -11.2,
  kickCooldown: 0,
  color: '#f5c53a',
};

const cpu = {
  x: canvas.width - 200,
  y: floorY - 45,
  r: 45,
  vx: 0,
  vy: 0,
  speed: 3.7,
  jumpForce: -10.5,
  kickCooldown: 0,
  color: '#64b5f6',
};

const ball = {
  x: canvas.width / 2,
  y: floorY - 175,
  r: 20,
  vx: (Math.random() - 0.5) * 6,
  vy: -2,
};

function populateTeams() {
  euroTeams.forEach((team) => {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    if (team === 'España') option.selected = true;
    teamSelect.appendChild(option);
  });
  leftTeamEl.textContent = teamSelect.value;
  rightTeamEl.textContent = `${pickCpuTeam(teamSelect.value)} (CPU)`;
}

function pickCpuTeam(playerTeam) {
  const candidates = euroTeams.filter((name) => name !== playerTeam);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function setScore() {
  scoreEl.textContent = `${match.scoreLeft} - ${match.scoreRight}`;
}

function resetPositions(afterGoal = false) {
  player.x = 200;
  player.y = floorY - player.r;
  player.vx = 0;
  player.vy = 0;

  cpu.x = canvas.width - 200;
  cpu.y = floorY - cpu.r;
  cpu.vx = 0;
  cpu.vy = 0;

  ball.x = canvas.width / 2;
  ball.y = floorY - 180;
  ball.vx = (Math.random() - 0.5) * 7;
  ball.vy = afterGoal ? -7.5 : -3.5;
}

function clamp(entity, minX, maxX) {
  if (entity.x < minX) {
    entity.x = minX;
    entity.vx *= -0.45;
  }
  if (entity.x > maxX) {
    entity.x = maxX;
    entity.vx *= -0.45;
  }
}

function circleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = a.r + b.r;

  if (distance < minDistance) {
    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    const overlap = minDistance - distance;

    b.x += nx * overlap;
    b.y += ny * overlap;

    const impulse = 1.15;
    b.vx += nx * impulse + a.vx * 0.12;
    b.vy += ny * impulse + a.vy * 0.17;
  }
}

function updateActor(actor, delta) {
  actor.vy += gravity;
  actor.x += actor.vx * delta;
  actor.y += actor.vy * delta;

  if (actor.y > floorY - actor.r) {
    actor.y = floorY - actor.r;
    actor.vy = 0;
  }

  actor.vx *= 0.9;
  actor.kickCooldown = Math.max(0, actor.kickCooldown - delta * 16.66);
}

function controls() {
  if (keys.KeyA) player.vx -= player.speed;
  if (keys.KeyD) player.vx += player.speed;

  if (keys.KeyW && player.y >= floorY - player.r - 0.5) {
    player.vy = player.jumpForce;
  }

  if (keys.Space && player.kickCooldown <= 0) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < player.r + ball.r + 30) {
      ball.vx += Math.sign(dx || 1) * 9;
      ball.vy -= 4.5;
      player.kickCooldown = 240;
    }
  }
}

function cpuAi() {
  const defendLine = canvas.width * 0.68;
  const targetX = ball.x > defendLine ? ball.x : defendLine;
  const move = targetX - cpu.x;

  if (Math.abs(move) > 6) {
    cpu.vx += Math.sign(move) * cpu.speed;
  }

  if (ball.y < cpu.y - 70 && cpu.y >= floorY - cpu.r - 0.5) {
    cpu.vy = cpu.jumpForce;
  }

  const distance = Math.hypot(ball.x - cpu.x, ball.y - cpu.y);
  if (distance < cpu.r + ball.r + 28 && cpu.kickCooldown <= 0) {
    ball.vx -= 8.3;
    ball.vy -= 4.2;
    cpu.kickCooldown = 300;
  }
}

function updateBall(delta) {
  ball.vy += gravity;
  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  if (ball.y > floorY - ball.r) {
    ball.y = floorY - ball.r;
    ball.vy *= -0.78;
    ball.vx *= 0.97;
  }

  if (ball.y < ball.r) {
    ball.y = ball.r;
    ball.vy *= -0.8;
  }

  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.vx *= -0.88;
  }

  if (ball.x > canvas.width - ball.r) {
    ball.x = canvas.width - ball.r;
    ball.vx *= -0.88;
  }

  ball.vx *= 0.998;
}

function checkGoal() {
  const inGoalY = ball.y > floorY - goalHeight && ball.y < floorY;

  if (ball.x - ball.r <= goalWidth && inGoalY) {
    match.scoreRight += 1;
    triggerGoal();
  } else if (ball.x + ball.r >= canvas.width - goalWidth && inGoalY) {
    match.scoreLeft += 1;
    triggerGoal();
  }
}

function triggerGoal() {
  setScore();
  match.isGoalPause = true;
  match.pauseTimer = 1100;
}

function drawField() {
  ctx.fillStyle = '#21953c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, floorY - 2);

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, floorY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, floorY / 2, 72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e9f5ff';
  ctx.fillRect(0, floorY - goalHeight, goalWidth, goalHeight);
  ctx.fillRect(canvas.width - goalWidth, floorY - goalHeight, goalWidth, goalHeight);
}

function drawHead(character, name) {
  ctx.beginPath();
  ctx.fillStyle = character.color;
  ctx.arc(character.x, character.y, character.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(character.x - 14, character.y - 8, 5, 0, Math.PI * 2);
  ctx.arc(character.x + 14, character.y - 8, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(character.x, character.y + 5, 15, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, character.x, character.y - character.r - 16);
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGoalBanner() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(canvas.width / 2 - 140, canvas.height / 2 - 45, 280, 90);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('¡GOOOL!', canvas.width / 2, canvas.height / 2 + 15);
}

function gameLoop(ts) {
  const delta = Math.min(1.4, (ts - lastTime) / 16.66 || 1);
  lastTime = ts;

  drawField();

  if (!match.isGoalPause) {
    controls();
    cpuAi();

    updateActor(player, delta);
    updateActor(cpu, delta);

    clamp(player, player.r, canvas.width * 0.5 - player.r - 8);
    clamp(cpu, canvas.width * 0.5 + cpu.r + 8, canvas.width - cpu.r);

    updateBall(delta);
    circleCollision(player, ball);
    circleCollision(cpu, ball);
    checkGoal();
  } else {
    match.pauseTimer -= delta * 16.66;
    drawGoalBanner();
    if (match.pauseTimer <= 0) {
      match.isGoalPause = false;
      resetPositions(true);
    }
  }

  drawHead(player, leftTeamEl.textContent);
  drawHead(cpu, rightTeamEl.textContent.replace(' (CPU)', ''));
  drawBall();

  requestAnimationFrame(gameLoop);
}

teamSelect.addEventListener('change', () => {
  leftTeamEl.textContent = teamSelect.value;
  rightTeamEl.textContent = `${pickCpuTeam(teamSelect.value)} (CPU)`;
  match.scoreLeft = 0;
  match.scoreRight = 0;
  setScore();
  resetPositions();
});

restartBtn.addEventListener('click', () => {
  match.scoreLeft = 0;
  match.scoreRight = 0;
  setScore();
  resetPositions();
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

populateTeams();
setScore();
resetPositions();
requestAnimationFrame(gameLoop);
