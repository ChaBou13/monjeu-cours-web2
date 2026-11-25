import test from 'node:test';
import assert from 'node:assert/strict';
import {advance, newGame, overlaps} from './game.js';

test('monsters alternate normal and red with two-hit red monsters', () => {
  let state = newGame();
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.monsters[0].red, false);
  assert.equal(state.monsters[0].hp, 1);

  state.elapsed = 1.75;
  state.spawnCooldown = 0;
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.monsters[1].red, true);
  assert.equal(state.monsters[1].hp, 2);

  const monster = {...state.monsters[1]};
  state = {...state, arrows: [{x: monster.x - 20, y: monster.y, w: 24, h: 5}], monsters: [monster]};
  assert.equal(overlaps(state.arrows[0], state.monsters[0]), true);

  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.monsters[0].hp, 1);
  assert.equal(state.score, 0);

  state = {...state, arrows: [{x: state.monsters[0].x - 20, y: state.monsters[0].y, w: 24, h: 5}]};
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.monsters.length, 0);
  assert.equal(state.score, 20);
  assert.equal(state.redMonstersKilled, 1);
});

test('collecting a golden apple above a red monster increments the counter', () => {
  let state = newGame();
  state = {
    ...state,
    player: {...state.player, x: 100, y: 202},
    monsters: [{
      id: 1,
      x: 105,
      y: 270,
      w: 35,
      h: 40,
      passed: false,
      red: true,
      hp: 2,
      apple: {x: 117, y: 212, w: 12, h: 12, collected: false},
    }],
  };
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.goldenApples, 1);
  assert.equal(state.monsters[0].apple.collected, true);
});

test('killing a red monster drops a golden apple at ground level', () => {
  let state = newGame();
  state = {
    ...state,
    player: {...state.player, x: 500, y: 310},
    spawnCooldown: 10,
    monsters: [{
      id: 1,
      x: 100,
      y: 270,
      w: 35,
      h: 40,
      passed: false,
      red: true,
      hp: 1,
      apple: {x: 112, y: 212, w: 12, h: 12, collected: false},
    }],
    arrows: [{x: 70, y: 270, w: 24, h: 5}],
  };
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.apples.length, 1);
  assert.equal(state.apples[0].y, 298);
  assert.ok(state.apples[0].x >= 104 && state.apples[0].x <= 105);
});

test('a red monster fires a blue missile every 1.5 seconds', () => {
  let state = newGame();
  state = {
    ...state,
    monsters: [{
      id: 1,
      x: 500,
      y: 270,
      w: 35,
      h: 40,
      passed: false,
      red: true,
      hp: 2,
      missileCooldown: 0.05,
      apple: null,
    }],
  };
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.missiles.length, 1);
  assert.equal(state.missiles[0].w, 18);

  state.missiles = [];
  state.monsters[0].missileCooldown = 0.05;
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.missiles.length, 1);
  assert.equal(state.monsters[0].missileCooldown, 1.5);
});

test('every fifth monster is blue, levitates, fires pink missiles and carries four apples', () => {
  let state = newGame();
  state.spawnCooldown = 0;
  state.monsterSequence = 4;
  state.elapsed = 1.75;
  state = advance(state, {jump: false, fire: false}, 0.05);
  const blue = state.monsters.find(monster => monster.blue);
  assert.ok(blue);
  assert.equal(blue.orbitApples.length, 4);

  const storedBlue = state.monsters.find(monster => monster.blue);
  storedBlue.missileCooldown = 0.05;
  state = advance(state, {jump: false, fire: false}, 0.05);
  const pink = state.missiles.find(missile => missile.color === 'pink');
  const updatedBlue = state.monsters.find(monster => monster.blue);
  assert.ok(pink);
  assert.equal(updatedBlue.missileCooldown, 1.5);
  assert.notEqual(updatedBlue.y, updatedBlue.baseY);
});

test('firing frequency increases every minute', () => {
  let state = newGame();
  state.elapsed = 59.90;
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.fireFrequency, 1);

  state.elapsed = 59.90;
  state.spawnCooldown = 10;
  state = advance(state, {jump: false, fire: true}, 0.05);
  assert.equal(state.fireFrequency, 1);

  state.elapsed = 60;
  state.cooldown = 0;
  state = advance(state, {jump: false, fire: true}, 0.05);
  assert.equal(state.fireFrequency, 1.2);
  assert.ok(Math.abs(state.cooldown - (0.35 / 1.2)) < 0.0001);
});

test('killing a blue monster drops its uncollected apples at ground level', () => {
  let state = newGame();
  state = {
    ...state,
    player: {...state.player, x: 500},
    spawnCooldown: 10,
    monsters: [{
      id: 1,
      x: 100,
      y: 210,
      w: 35,
      h: 40,
      passed: false,
      red: false,
      blue: true,
      baseY: 210,
      levitationPhase: 0,
      missileCooldown: 1.5,
      hp: 1,
      apple: null,
      orbitApples: [
        {x: 112, y: 152, w: 12, h: 12, collected: false},
        {x: 112, y: 262, w: 12, h: 12, collected: false},
        {x: 72, y: 210, w: 12, h: 12, collected: false},
        {x: 152, y: 210, w: 12, h: 12, collected: false},
      ],
    }],
    arrows: [{x: 100, y: 210, w: 24, h: 5, red: true}],
  };
  state = advance(state, {jump: false, fire: false}, 0);
  assert.equal(state.apples.length, 4);
  assert.ok(state.apples.every(apple => apple.y === 298));
  assert.equal(state.score, 40);
});

test('a pink missile keeps moving after its blue monster is killed', () => {
  let state = newGame();
  state = {
    ...state,
    spawnCooldown: 10,
    monsters: [{
      id: 1,
      x: 300,
      y: 210,
      w: 35,
      h: 40,
      passed: false,
      red: false,
      blue: true,
      baseY: 210,
      levitationPhase: 0,
      missileCooldown: 1.5,
      hp: 1,
      apple: null,
      orbitApples: [],
    }],
    missiles: [{x: 300, y: 228, w: 18, h: 8, color: 'pink'}],
    arrows: [{x: 280, y: 228, w: 24, h: 5, red: true}],
  };
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.monsters.length, 0);
  assert.equal(state.missiles.length, 1);
  assert.equal(state.missiles[0].color, 'pink');
  assert.equal(state.missiles[0].y, 228);
  assert.equal(state.missiles[0].x, 286);
});

test('a golden apple adds a red arrow that kills any monster in one hit', () => {
  let state = newGame();
  state.spawnCooldown = 10;
  state = {
    ...state,
    spawnCooldown: 10,
    player: {x: 100, y: 202, w: 40, h: 50, velocityY: 0, grounded: false},
    monsters: [{id: 1, x: 105, y: 270, w: 35, h: 40, red: true, hp: 2, passed: false, apple: null}],
  };
  const apple = {x: 117, y: 212, w: 12, h: 12, collected: false};
  state.monsters[0].apple = apple;
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.goldenApples, 1);
  assert.equal(state.redArrowStock, 1);

  state = advance(state, {jump: false, fire: true}, 0.05);
  assert.equal(state.redArrowStock, 0);
  assert.equal(state.arrows[0].red, true);
  assert.equal(state.arrows[0].golden, true);

  state = {...state, arrows: [{x: state.monsters[0].x, y: state.monsters[0].y, w: 24, h: 5, red: true, golden: true}], spawnCooldown: 10};
  state = advance(state, {jump: false, fire: false}, 0);
  assert.equal(state.monsters.length, 0);
  assert.equal(state.score, 20);
});

test('the game becomes won after two minutes and reaches the Millennium Falcon', () => {
  let state = newGame();
  state.elapsed = 119.95;
  state.spawnCooldown = 10;
  state = advance(state, {jump: false, fire: false}, 0.05);
  assert.equal(state.status, 'won');
  assert.ok(state.elapsed >= 120);
});
