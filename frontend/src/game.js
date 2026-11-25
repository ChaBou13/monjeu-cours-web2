export const WIDTH = 640;
export const HEIGHT = 400;
const MAX_AIR_JUMPS = 1; // 1 = double saut, 2 = triple saut
const START_LIVES = 1;
const MAX_LIVES = 5;
const INVINCIBLE_TIME = 1.5; // secondes

export function newGame() {
  return {
    player: {
      x: 80,
      y: 310,
      w: 40,
      h: 50,
      velocityY: 0,
      grounded: true,
      airJumps: MAX_AIR_JUMPS,
    },
    jumpHeld: false,
    monsters: [],
    arrows: [],
    apples: [],
    missiles: [],
    explosions: [], 
    arrowStock: 2,
    redArrowStock: 0,
    rechargedMilestones: 0,
    score: 0,
    lives: START_LIVES,
    invincible: 0,
    redMonstersKilled: 0,
    blueMonstersKilled: 0,
    goldenApples: 0,
    elapsed: 0,
    fireFrequency: 1,
    spawnCooldown: 0,
    monsterSequence: 0,
    cooldown: 0,
    speed: 150,
    status: 'playing',
  };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

// Pure function: the same state, input and dt produce the same next state.
export function advance(previous, input, seconds) {
  if (previous.status !== 'playing') return previous;
  const dt = Math.max(0, Math.min(seconds, 0.05));
  const state = {
    ...previous,
    player: {...previous.player},
    monsters: previous.monsters.map(monster => ({...monster})),
    arrows: previous.arrows.map(arrow => ({...arrow})),
    apples: previous.apples.map(apple => ({...apple})),
    missiles: previous.missiles.map(missile => ({...missile})),
    explosions: previous.explosions.map(explosion => ({...explosion})),
  };

  const groundY = HEIGHT - 90;

  const jumpPressed = input.jump && !previous.jumpHeld;
state.jumpHeld = input.jump;

if (input.jump && state.player.grounded) {
  state.player.velocityY = -520;
  state.player.grounded = false;
} else if (jumpPressed && !state.player.grounded && state.player.airJumps > 0) {
  state.player.velocityY = -520;
  state.player.airJumps -= 1;
}

  state.player.velocityY += 1250 * dt;
  state.player.y += state.player.velocityY * dt;

  if (state.player.y >= groundY - state.player.h) {
  state.player.y = groundY - state.player.h;
  state.player.velocityY = 0;
  state.player.grounded = true;
  state.player.airJumps = MAX_AIR_JUMPS;   // <- nouveau
}

  state.elapsed += dt;
  if (state.elapsed >= 120) {
    state.status = 'won';
  }
  state.speed = 150 + state.elapsed * 4;
  const monsterFireInterval = Math.max(0.6, 1.5 - state.elapsed * 0.02); // en secondes
  const missileSpeed = 280 + state.elapsed * 3; // en px/s
  state.fireFrequency = Math.pow(1.2, Math.floor(state.elapsed / 60));
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.invincible = Math.max(0, state.invincible - dt);
  const hurt = () => {
  state.lives -= 1;
  state.invincible = INVINCIBLE_TIME;
  if (state.lives <= 0) state.status = 'lost';
};
  state.spawnCooldown -= dt;

  if (input.fire && state.cooldown === 0 &&
    (state.arrowStock > 0 || state.redArrowStock > 0)) {
    const red = state.redArrowStock > 0;
    state.arrows.push({
      x: state.player.x + state.player.w,
      y: state.player.y + 18,
      w: 24,
      h: 5,
      red,
      golden: red,
    });
    if (red) state.redArrowStock -= 1;
    else state.arrowStock -= 1;
    state.cooldown = 0.35 / state.fireFrequency;
  }

  if (state.spawnCooldown <= 0) {
    const blue = state.monsterSequence % 5 === 4;
    const red = !blue && state.monsterSequence % 2 === 1;
    const orbitApples = blue ? [
      {x: WIDTH + 12, y: groundY - 58 - 40, w: 12, h: 12, collected: false},
      {x: WIDTH + 12, y: groundY - 58 + 40, w: 12, h: 12, collected: false},
      {x: WIDTH - 28, y: groundY - 58, w: 12, h: 12, collected: false},
      {x: WIDTH + 52, y: groundY - 58, w: 12, h: 12, collected: false},
    ] : null;
    state.monsters.push({
      id: state.elapsed,
      x: WIDTH,
      y: blue ? groundY - 100 : groundY - 40,
      w: 35,
      h: 40,
      passed: false,
      red,
      blue,
      baseY: blue ? groundY - 100 : groundY - 40,
      levitationPhase: 0,
      hp: red ? 2 : 1,
      missileCooldown: 0,
      apple: red ? {x: WIDTH + 12, y: groundY - 58, w: 12, h: 12, collected: false} : null,
      orbitApples,
    });
    state.monsterSequence += 1;
    const spacing = Math.max(180, 270 - state.elapsed * 0.75); // en pixels
    state.spawnCooldown = spacing / state.speed;
  }

  for (const monster of state.monsters) {
    monster.x -= state.speed * dt;
    if (monster.blue) {
      monster.levitationPhase += dt * 3;
      monster.y = monster.baseY + Math.sin(monster.levitationPhase) * 55;
    }
    if (monster.red) {
      monster.missileCooldown -= dt;
      if (monster.missileCooldown <= 0) {
        state.missiles.push({
          x: monster.x,
          y: monster.y + 18,
          w: 18,
          h: 8,
          color: 'blue',
        });
        monster.missileCooldown = monsterFireInterval;
      }
    }
    if (monster.blue) {
      monster.missileCooldown -= dt;
      if (monster.missileCooldown <= 0) {
        state.missiles.push({
          x: monster.x,
          y: monster.y + 18,
          w: 18,
          h: 8,
          color: 'pink',
        });
        monster.missileCooldown = monsterFireInterval;
      }
    }
    if (monster.apple) {
      monster.apple.x = monster.x + 12;
      monster.apple.y = monster.y - monster.h - 18;
    }
    if (monster.orbitApples) {
      const offsets = [
        {x: 12, y: -58},
        {x: 12, y: 52},
        {x: -28, y: 0},
        {x: 52, y: 0},
      ];
      monster.orbitApples.forEach((apple, index) => {
        if (!apple.collected) {
          apple.x = monster.x + offsets[index].x;
          apple.y = monster.y + offsets[index].y;
        }
      });
    }
    const fullyLeftOfPlayer = monster.x + monster.w < state.player.x;
    const jumpedOverMonster =
      state.player.y + state.player.h <= monster.y;

    if (!monster.passed && fullyLeftOfPlayer && jumpedOverMonster) {
      monster.passed = true;
      state.score += 5;
    }

    if (monster.apple && !monster.apple.collected &&
      overlaps(state.player, monster.apple)) {
      monster.apple.collected = true;
      state.goldenApples += 1;
      state.redArrowStock += 1;
    }
    for (const apple of monster.orbitApples || []) {
      if (!apple.collected && overlaps(state.player, apple)) {
        apple.collected = true;
        state.goldenApples += 1;
        state.redArrowStock += 1;
      }
    }
  }

  for (const arrow of state.arrows) {
    arrow.x += 550 * dt;
  }

  for (const apple of state.apples) {
    apple.x -= state.speed * dt;
  }

  for (const missile of state.missiles) {
    missile.x -= missileSpeed * dt;
  }

  const remainingMissiles = [];
  for (const missile of state.missiles) {
    if (state.invincible === 0 && overlaps(state.player, missile)) {
  hurt();
} else if (missile.x + missile.w >= 0) {
      remainingMissiles.push(missile);
    }
  }
  state.missiles = remainingMissiles;

  const remainingApples = [];
  for (const apple of state.apples) {
    if (!overlaps(state.player, apple)) {
      if (apple.x + apple.w >= 0) remainingApples.push(apple);
    } else {
      state.goldenApples += 1;
      state.redArrowStock += 1;
    }
  }
  state.apples = remainingApples;

  const remainingArrows = [];
  for (const arrow of state.arrows) {
    const hit = state.monsters.findIndex(monster => overlaps(arrow, monster));
    if (hit !== -1) {
      const monster = state.monsters[hit];
      if (arrow.red) {
        monster.hp = 0;
      } else {
        monster.hp = (monster.hp ?? (monster.red ? 2 : 1)) - 1;
      }
      if (monster.hp <= 0) {
        state.monsters.splice(hit, 1);
        if (monster.blue) state.lives = Math.min(MAX_LIVES, state.lives + 1);
        state.explosions.push({
            x: monster.x + monster.w / 2,
            y: monster.y + monster.h / 2,
            age: 0,
            duration: 0.5,
            kind: monster.blue ? 'blue' : monster.red ? 'red' : 'green',
            size: monster.blue ? 60 : 40,
            });
        if (monster.red) {
          state.score += 20;
          state.redMonstersKilled += 1;
          state.apples.push({
            x: monster.x + 12,
            y: groundY - 12,
            w: 12,
            h: 12,
          });
        } else if (monster.blue) {
          state.score += 40;
          state.blueMonstersKilled += 1;
          for (const apple of monster.orbitApples || []) {
            if (!apple.collected) {
              state.apples.push({
                x: apple.x,
                y: groundY - 12,
                w: 12,
                h: 12,
              });
            }
          }
        } else {
          state.score += 10;
        }
      }
    } else if (arrow.x < WIDTH) {
      remainingArrows.push(arrow);
    }
  }
  state.arrows = remainingArrows;
  state.monsters = state.monsters.filter(monster => monster.x + monster.w >= 0);


  for (const explosion of state.explosions) {
  explosion.age += dt;
  explosion.x -= state.speed * dt * 0.5; // optionnel : dérive avec le décor
}
state.explosions = state.explosions.filter(e => e.age < e.duration);
  const scoreMilestones = Math.floor(state.score / 15);
  if (scoreMilestones > state.rechargedMilestones) {
    state.arrowStock += scoreMilestones - state.rechargedMilestones;
    state.rechargedMilestones = scoreMilestones;
  }

  if (state.invincible === 0) {
  const hit = state.monsters.findIndex(monster => overlaps(state.player, monster));
  if (hit !== -1) {
    state.monsters.splice(hit, 1);
    hurt();
  }
}

  return state;
}
