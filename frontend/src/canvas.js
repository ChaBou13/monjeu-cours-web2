import {advance, newGame, WIDTH, HEIGHT} from './game.js';

const playerSvg = new Image();
playerSvg.src = new URL('./player.svg', import.meta.url).href;
const goldenPlayerSvg = new Image();
goldenPlayerSvg.src = new URL('./player-gold.svg', import.meta.url).href;
const yellowMonsterSvg = new Image();
yellowMonsterSvg.src = new URL('./stormtrooper.svg', import.meta.url).href;
const redMonsterSvg = new Image();
redMonsterSvg.src = new URL('./stormtrooper-black.svg', import.meta.url).href;
const blueMonsterSvg = new Image();
blueMonsterSvg.src = new URL('./dark-lord.svg', import.meta.url).href;
const millenniumFalconSvg = new Image();
millenniumFalconSvg.src = new URL('./millennium-falcon.svg', import.meta.url).href;

export function draw(context, state) {
  context.fillStyle = '#efc68a';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = '#fff1c2';
  context.beginPath();
  context.arc(540 - (state.elapsed * 8 % 620), 65, 22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#c99555';
  context.beginPath();
  context.moveTo(0, 310);
  context.lineTo(130, 260);
  context.lineTo(260, 310);
  context.lineTo(390, 245);
  context.lineTo(520, 310);
  context.closePath();
  context.fill();

  context.fillStyle = '#d9a85f';
  context.fillRect(0, 310, WIDTH, HEIGHT - 310);

  context.fillStyle = '#b87a3d';
  context.fillRect(0, HEIGHT - 90, WIDTH, 90);
  let shake = 0;
  for (const e of state.explosions) {
    if (e.kind === 'blue') shake = Math.max(shake, 1 - e.age / e.duration);
  }
  context.save();
  context.translate(
    (Math.random() - 0.5) * 12 * shake,
    (Math.random() - 0.5) * 12 * shake,
  );
  context.globalAlpha = state.invincible > 0 && Math.floor(state.elapsed * 10) % 2 === 0 ? 0.35 : 1;
  const player = state.player;
  const currentPlayerSvg = state.elapsed >= 120
    ? millenniumFalconSvg
    : state.redArrowStock > 0 ? goldenPlayerSvg : playerSvg;
  if (currentPlayerSvg.complete && currentPlayerSvg.naturalWidth > 0) {
    context.drawImage(currentPlayerSvg, player.x, player.y, player.w, player.h);
  } else {
    context.fillStyle = '#a8e4c4';
    context.fillRect(player.x, player.y, player.w, player.h);
  }
  context.globalAlpha = 1;

  for (const monster of state.monsters) {
    const monsterSvg = monster.red ? redMonsterSvg : monster.blue ? blueMonsterSvg : yellowMonsterSvg;
    if (monsterSvg.complete && monsterSvg.naturalWidth > 0) {
      context.drawImage(monsterSvg, monster.x, monster.y, monster.w, monster.h);
    } else {
      context.fillStyle = monster.red ? '#d95c5c' : monster.blue ? '#4a90d9' : '#f4be70';
      context.fillRect(monster.x, monster.y, monster.w, monster.h);
      context.fillStyle = '#ffffff';
      context.fillRect(monster.x + 7, monster.y + 9, 5, 5);
      context.fillRect(monster.x + 23, monster.y + 9, 5, 5);
    }
    if (monster.apple && !monster.apple.collected) {
      context.fillStyle = '#ffd84d';
      context.fillRect(monster.apple.x, monster.apple.y, monster.apple.w, monster.apple.h);
    }
    if (monster.orbitApples) {
      context.fillStyle = '#ffd84d';
      for (const apple of monster.orbitApples) {
        if (!apple.collected) {
          context.fillRect(apple.x, apple.y, apple.w, apple.h);
        }
      }
    }
  }
  for (const e of state.explosions) {
    const t = e.age / e.duration;          // 0 -> 1
    const radius = e.size * (0.3 + t * 0.9);
    context.save();
    context.globalAlpha = 1 - t;
    context.fillStyle = {green: '#ffb703', red: '#e63946', blue: '#4cc9f0'}[e.kind];
    context.beginPath();
    context.arc(e.x, e.y, radius, 0, Math.PI * 2);
    context.fill();
    // petites étincelles
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      context.fillRect(e.x + Math.cos(a) * radius * 1.2, e.y + Math.sin(a) * radius * 1.2, 4, 4);
    }
    context.restore();
  }
  for (const arrow of state.arrows) {
    context.fillStyle = arrow.golden ? '#ffd84d' : '#d94b4b';
    context.fillRect(arrow.x, arrow.y, arrow.w, arrow.h);
  }

  context.fillStyle = '#ffd84d';
  for (const apple of state.apples) {
    context.fillRect(apple.x, apple.y, apple.w, apple.h);
  }

  for (const missile of state.missiles) {
    context.fillStyle = missile.color === 'pink' ? '#ff69b4' : '#4ca6ff';
    context.fillRect(missile.x, missile.y, missile.w, missile.h);
  }
  context.restore();
  context.fillStyle = '#203c36';
  context.font = '16px Arial';
  context.fillText('Flèches', 18, 25);
  context.fillStyle = '#ffffff';
  for (let i = 0; i < state.arrowStock; i++) {
    context.fillRect(85 + i * 16, 14, 12, 5);
  }
  context.fillStyle = '#ffd84d';
  for (let i = 0; i < state.redArrowStock; i++) {
    context.fillRect(85 + (state.arrowStock + i) * 16, 14, 12, 5);
  }
  context.fillStyle = '#203c36';
  context.fillText(`${state.score} points`, 18, 50);
  context.fillText(`Vies: ${state.lives}`, 18, 75);
  context.fillText(`Pommes: ${state.goldenApples}`, 18, 100);
  context.fillText(`${Math.floor(state.elapsed)} s`, WIDTH - 65, 25);

  if (state.status !== 'playing') {
    context.fillStyle = '#102b29e8';
    context.fillRect(0, 130, WIDTH, 120);
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.font = 'bold 30px Arial';
    context.fillText(state.status === 'won' ? 'Victoire' : 'Partie terminée', WIDTH / 2, 183);
    context.font = '18px Arial';
    context.fillText(`${state.score} points · Rejouer pour recommencer`, WIDTH / 2, 220);
    context.textAlign = 'left';
  }
}

export function mountGame(canvas, onState = () => {}, render = null) {
  const context = render ? null : canvas.getContext('2d');
  let state = newGame();
  let previous = null;
  let frameId;
  let paused = false;
  let fireQueued = false;
  let jumpQueued = false;
  let lastStatus = '';
  const input = {jump: false, fire: false};
  const keyboard = {jump: false, fire: false};
  const keys = {ArrowUp: 'jump', ' ': 'fire'};
  const paint = render || (state => draw(context, state));
  function clearInput() {
    input.jump = input.fire = false;
    fireQueued = false;
    jumpQueued = false;
    clearKeyboard();
  }
  function clearKeyboard() {
    keyboard.jump = keyboard.fire = false;
  }
  function keydown(event) {
    if (keys[event.key]) {
      event.preventDefault();
      keyboard[keys[event.key]] = true;
      if (event.key === ' ') fireQueued = true;
      if (event.key === 'ArrowUp') jumpQueued = true;
    }
  }
  function keyup(event) {
    if (keys[event.key]) { event.preventDefault(); keyboard[keys[event.key]] = false; }
  }
  function blur() { clearInput(); paused = true; previous = null; }
  function frame(now) {
    const dt = previous === null ? 0 : (now - previous) / 1000;
    previous = now;
    if (!paused) {
      state = advance(state, {
        jump: input.jump || keyboard.jump || jumpQueued,
        fire: input.fire || keyboard.fire || fireQueued,
      }, dt);
      fireQueued = false;
      jumpQueued = false;
    }
    paint(state);
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      onState({...state});
    }
    frameId = requestAnimationFrame(frame);
  }
  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('keyup', keyup);
  canvas.addEventListener('blur', clearKeyboard);
  window.addEventListener('blur', blur);
  frameId = requestAnimationFrame(frame);
  return {
    setInput(key, value) {
      input[key] = value;
      if (key === 'fire' && value) fireQueued = true;
    },
    pause() { paused = true; clearInput(); },
    resume() { paused = false; previous = null; canvas.focus(); },
    restart() { state = newGame(); lastStatus = ''; clearInput(); paused = false; previous = null; canvas.focus(); },
    destroy() {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('keyup', keyup);
      canvas.removeEventListener('blur', clearKeyboard);
      window.removeEventListener('blur', blur);
    },
  };
}
