/*
  minimum number of required tiles of the same type in a tilechain,
  in order to make them disappear
 */
const CRITERION = 3;
/* Lower than 10 means diagonal moves. */
const DIAGONAL_MOVE_THRESHOLD = 10;
const TILE_SIZE = 12;
const TILE_SIZE_MOD = 4;
const UPDATED_TILE_SIZE = TILE_SIZE * TILE_SIZE_MOD;
const COLUMN_LENGTH = 12;
const ROW_LENGTH = 8;
const MAX_TURN = 3;
const SHOW_GRID = false;
const SHOW_ID = false;
const DELAY = 250; // ms
const MAX_SCORE_LOG = 3;
const TILE_TYPES = [
  {
    id: 1,
    color: '#dc2626'
  },
  {
    id: 2,
    color: '#16a34a'
  },
  {
    id: 3,
    color: '#2563eb'
  },
  {
    id: 4,
    color: '#facc15'
  },
  {
    id: 5,
    color: '#67e8f9'
  },
  {
    id: 6,
    color: '#c084fc'
  }
];

const board = {
  remainingTurn: document.getElementById('remainingTurn'),
  score: document.getElementById('score'),
  canvas: document.getElementById('canvas'),
  init: function () {
    this.canvas.width = UPDATED_TILE_SIZE * COLUMN_LENGTH;
    this.canvas.height = UPDATED_TILE_SIZE * ROW_LENGTH;
    this.context = this.canvas.getContext('2d');
  },
  on: function (event, listener) {
    this.canvas.addEventListener(event, listener);
  },
  off: function (event, listener) {
    this.canvas.removeEventListener(event, listener);
  },
  drawTile: function ({ x, y, type = {}, id }) {
    const size = UPDATED_TILE_SIZE;

    this.context.fillStyle = type.color;
    this.context.fillRect(x, y, size, size);

    if (SHOW_GRID) {
      this.context.fillStyle = type.color;
      this.context.strokeRect(x, y, size, size);
    }

    if (!id || !SHOW_ID) return;

    this.context.fillStyle = 'black';
    this.context.font = '14px Arial';
    this.context.fillText(id, x, y + 14);
  },
  show: function () {
    this.canvas.style.display = 'block';
  },
  forEachRow: function (callback) {
    if (!callback) return;
    for (let row = 0; row < ROW_LENGTH; row++) {
      callback(row);
    }
  },
  forEachColumn: function (callback) {
    if (!callback) return;
    for (let col = 0; col < COLUMN_LENGTH; col++) {
      callback(col);
    }
  },
  forEachCell: function (callback) {
    if (!callback) return;
    this.forEachRow((row) => {
      this.forEachColumn((col) => {
        callback(col, row);
      });
    });
  },
  clear: function (x = 0, y = 0, w, h) {
    const width = w || this.canvas.width;
    const height = h || this.canvas.height;

    this.context.clearRect(x, y, width, height);
  },
  deactivate: function (confirmed) {
    if (confirmed) {
      board.canvas.style.opacity = 0.6;
    } else {
      board.canvas.style.opacity = 1;
    }
  },
  update: function (chains, updateType) {
    if (!chains.length) return;

    let score = stateManager.get('score') || 0;

    chains.forEach((chain) => {
      const xs = [];
      const ys = [];

      chain.forEach((tile) => {
        updateType(tile);

        xs.push(tile.x);
        ys.push(tile.y);

        score++;
      });

      const chainX = Math.min(...xs);
      const chainY = Math.min(...ys);
      const chainW = Math.max(...xs) - Math.min(...xs) + UPDATED_TILE_SIZE;
      const chainH = Math.max(...ys) - Math.min(...ys) + UPDATED_TILE_SIZE;

      this.clear(chainX, chainY, chainW, chainH);
    });

    stateManager.set('score', score);

    setTimeout(draw, DELAY);
  },
  draw: function () {
    this.remainingTurn.innerHTML = stateManager.get('remainingTurn') || 0;
    this.score.innerHTML = stateManager.get('score') || 0;

    if (this.remainingTurn.innerHTML === '0')
      this.remainingTurn.style.color = 'red';
  }
};

const stateManager = {
  defaultState: {
    score: 0,
    remainingTurn: MAX_TURN, // seconds
    clickedTile: undefined,
    mouseToClickedTileDistance: { x: 0, y: 0 },
    mousePosition: { x: 0, y: 0 },
    mouseAnchorPoint: { x: 0, y: 0 },
    playerAction: undefined,
    isOver: false
  },
  state: {
    highscores: [],
    round: 0
  },
  watcher: {},
  init: function () {
    this.state.remainingTurn = this.defaultState.remainingTurn;
  },
  get: function (key) {
    return this.state[key];
  },
  set: function (key, value) {
    this.state[key] = value;
    if (this.watcher[key]) this.watcher[key](this.state[key]);
  },
  update: function (key, setter) {
    this.state[key] = setter(this.state[key]);
    if (this.watcher[key]) this.watcher[key](this.state[key]);
  },
  reset: function (key) {
    this.state[key] = this.defaultState[key];
  },
  watch: function (key, fn) {
    this.watcher[key] = fn;
  }
};

const matchManager = {
  benchmark: 0,
  chain: [],
  chains: [],

  init: function (firstTile) {
    this.benchmark = firstTile.type.id;
    this.chain = [firstTile];
  },
  addToChain: function (tile) {
    this.chain.push(tile);
  },
  proceedChain: function () {
    if (this.chain.length >= CRITERION) {
      this.chains.push(this.chain);
    }
  },
  getBenchmark: function () {
    return this.benchmark;
  },
  reset: function () {
    this.benchmark = 0;
    this.chain = [];
    this.chains = [];
  },
  isEmpty: function () {
    return this.chains.length === 0;
  }
};

const tileManager = {
  tiles: [],
  generateTiles: function () {
    this.tiles = [];
    let count = 0;

    board.forEachCell((col, row) => {
      count++;

      this.tiles.push({
        id: count,
        x: col * UPDATED_TILE_SIZE,
        initialX: col * UPDATED_TILE_SIZE,
        y: row * UPDATED_TILE_SIZE,
        initialY: row * UPDATED_TILE_SIZE,
        type: this.getRandomTileType()
      });
    });
  },
  getTile: function (index) {
    return this.tiles[index];
  },
  getTileById: function (id) {
    return this.tiles.find((t) => t.id === id);
  },
  getTileByOrigin: function (x, y) {
    let tile = undefined;
    let index = undefined;

    this.forEachTile((t, i) => {
      if (t.x === x && t.y === y) {
        tile = t;
        index = i;
      }
    });

    if (tile === undefined || index === undefined)
      console.warn('something went wrong');

    return {
      data: tile,
      index
    };
  },
  getTileIndexByXY: function (x, y) {
    return this.getTileByOrigin(x, y).index;
  },
  updateTile: function (index, tile) {
    this.tiles[index] = {
      ...this.tiles[index],
      ...tile
    };
  },
  replaceByIndex: function (index, tile) {
    this.tiles[index] = tile;
  },
  updateTileById: function (id, updatedTile) {
    for (let index = 0; index < this.tiles.length; index++) {
      const tile = this.tiles[index];
      if (tile.id === id) {
        this.tiles[index] = {
          ...tile,
          ...updatedTile
        };
      }
    }
  },
  getClickedTile: function (x, y) {
    return this.tiles.find(
      (tile) =>
        tile.x < x && // on the right of left side
        tile.x + UPDATED_TILE_SIZE > x && // on the left of right side
        tile.y < y && // below top side
        tile.y + UPDATED_TILE_SIZE > y // above bottom side
    );
  },
  forEachTile: function (callback) {
    if (!callback) return;
    for (let index = 0; index < this.tiles.length; index++) {
      const tile = this.tiles[index];
      callback(tile, index);
    }
  },
  getRandomTileType: function () {
    return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
  },
  getNeighbourIndex: function (direction) {
    const clickedTile = stateManager.get('clickedTile');

    const neighbourMap = {
      left: {
        x: clickedTile.initialX - UPDATED_TILE_SIZE,
        y: clickedTile.initialY
      },
      right: {
        x: clickedTile.initialX + UPDATED_TILE_SIZE,
        y: clickedTile.initialY
      },
      up: {
        x: clickedTile.initialX,
        y: clickedTile.initialY - UPDATED_TILE_SIZE
      },
      down: {
        x: clickedTile.initialX,
        y: clickedTile.initialY + UPDATED_TILE_SIZE
      }
    };

    const target = neighbourMap[direction];

    if (!target) return;

    let index = this.getTileByOrigin(target.x, target.y).index;

    return index;
  },
  swapTiles: function (direction, callback) {
    const tile = stateManager.get('clickedTile');
    if (!tile) return;

    const tileIndex = this.getTileIndexByXY(tile.initialX, tile.initialY);
    const neighbourIndex = this.getNeighbourIndex(direction);

    if (tileIndex === undefined || neighbourIndex === undefined) return;

    const neighbour = this.getTile(neighbourIndex);

    if (!neighbour) return;

    /* swap */
    const temp = Object.assign(
      {},
      { x: tile.x, y: tile.y, initialX: tile.initialX, initialY: tile.initialY }
    );

    tile.x = neighbour.initialX;
    tile.y = neighbour.initialY;
    tile.initialX = neighbour.initialX;
    tile.initialY = neighbour.initialY;
    this.replaceByIndex(neighbourIndex, tile);

    neighbour.x = temp.initialX;
    neighbour.y = temp.initialY;
    neighbour.initialX = temp.initialX;
    neighbour.initialY = temp.initialY;
    this.replaceByIndex(tileIndex, neighbour);

    if (callback) callback();
  },
  updateType: function (tile) {
    /* Change tile's type */
    this.updateTileById(tile.id, {
      type: this.getRandomTileType()
    });
  },
  checkMatches: function () {
    stateManager.set('isProcessing', true);

    let index = 0;

    /* Horizontal check */
    board.forEachRow((row) => {
      const rowFirstTile = this.tiles[row * COLUMN_LENGTH];
      matchManager.init(rowFirstTile);

      /* Skip first tile */
      index++;

      /* Notice: col === 1, not 0 */
      for (let col = 1; col < COLUMN_LENGTH; col++) {
        const tile = this.tiles[index];
        const isMatched = tile.type.id === matchManager.getBenchmark();

        if (isMatched) {
          matchManager.addToChain(tile);
        } else {
          /* If the chain long enough, store it */
          matchManager.proceedChain();

          /* Reinit */
          matchManager.init(tile);
        }

        index++;
      }

      /* Check again before move to next row */
      matchManager.proceedChain();
    });

    /* Vertical check */
    board.forEachColumn((col) => {
      const colFirstTile = this.tiles[col];
      matchManager.init(colFirstTile);

      /* Skip first tile */
      index = col + COLUMN_LENGTH;

      /* Notice: row === 1, not 0 */
      for (let row = 1; row < ROW_LENGTH; row++) {
        const tile = this.tiles[index];
        const isMatched = tile.type.id === matchManager.getBenchmark();

        if (isMatched) {
          matchManager.addToChain(tile);
        } else {
          /* If the chain long enough, store it */
          matchManager.proceedChain();

          /* Reinit */
          matchManager.init(tile);
        }

        index += COLUMN_LENGTH;
      }

      /* Check again before move to next column */
      matchManager.proceedChain();
    });

    setTimeout(() => {
      if (matchManager.isEmpty()) {
        stateManager.set('isProcessing', false);

        /* Handle no more remaining turn */
        if (stateManager.get('remainingTurn') <= 0) {
          stateManager.set('isOver', true);

          /* save score */
          stateManager.update('highscores', (h) => {
            const newHighscores = [
              ...h,
              {
                score: stateManager.get('score'),
                round: stateManager.get('round')
              }
            ];
            const sorted = newHighscores.sort((a, b) => b.score - a.score);
            if (sorted.length > MAX_SCORE_LOG) sorted.pop()

            return sorted;
          });

          deinit();
        }

        return;
      }

      board.update(matchManager.chains, (tile) => this.updateType(tile));
      matchManager.reset();

      /* ! RECURSION */
      this.checkMatches();
    }, DELAY);
  }
};

const inputManager = {
  getDirection: function (startPoint, endPoint) {
    const distanceX = Math.abs(endPoint.x - startPoint.x);
    const distanceY = Math.abs(endPoint.y - startPoint.y);

    const isRight = startPoint.x < endPoint.x;
    const isLeft = startPoint.x > endPoint.x;
    const isDown = startPoint.y < endPoint.y;
    const isUp = startPoint.y > endPoint.y;

    let directionX = isRight ? 'right' : isLeft ? 'left' : undefined;
    let directionY = isUp ? 'up' : isDown ? 'down' : undefined;

    const diagonalScore = Math.abs(distanceX - distanceY);
    const isDiagonalDirection = diagonalScore < DIAGONAL_MOVE_THRESHOLD;

    /* Returns valid single axis direction */
    if (isDiagonalDirection) return;
    return distanceX > distanceY ? directionX : directionY;
  },
  handleMouseDown: function (e) {
    if (stateManager.get('isProcessing') || stateManager.get('isOver')) return;
    const { offsetX: x, offsetY: y } = e;
    stateManager.set('mousePosition', { x, y });
    stateManager.set('playerAction', 'CLICK');

    update();
  },
  handleMouseMove: function (e) {
    if (stateManager.get('isProcessing') || stateManager.get('isOver')) return;
    if (
      stateManager.get('playerAction') === 'CLICK' ||
      stateManager.get('playerAction') === 'DRAG'
    ) {
      const { offsetX: x, offsetY: y } = e;
      stateManager.set('mousePosition', { x, y });
      stateManager.set('playerAction', 'DRAG');

      update();
    }
  },
  handleMouseUp: function (e) {
    if (stateManager.get('isProcessing') || stateManager.get('isOver')) return;
    const { offsetX: x, offsetY: y } = e;
    stateManager.set('mousePosition', { x, y });
    stateManager.set('playerAction', 'DROP');

    update();
  },
  handleMouseLeave: function (e) {
    if (stateManager.get('isProcessing') || stateManager.get('isOver')) return;
    if (stateManager.get('playerAction') === 'DRAG') {
      stateManager.set('playerAction', 'LEAVE');

      update();
    }
  }
};

function init() {
  board.init();

  /* Connect board and input manager */
  board.on('mousedown', inputManager.handleMouseDown);
  board.on('mousemove', inputManager.handleMouseMove);
  board.on('mouseup', inputManager.handleMouseUp);
  // Prevents tile get stuck when mouse leave game area
  board.on('mouseleave', inputManager.handleMouseLeave);

  /* Set initial state & output */
  tileManager.generateTiles();
  tileManager.checkMatches();

  stateManager.init();
  stateManager.watch('isOver', board.deactivate);
  stateManager.watch('isProcessing', board.deactivate);

  board.remainingTurn.style.color = 'inherit';
  board.score.innerHTML = 0;

  document.getElementById('highscore').innerHTML = '';
  for (let index = 0; index < stateManager.get('highscores').length; index++) {
    const {round, score} = stateManager.get('highscores')[index];
    const $score = document.createElement('li');
    $score.innerHTML = `${score} - Round #${round}`;
    document.getElementById('highscore').appendChild($score);
  }

  stateManager.update('round', (r) => r + 1);

  document.getElementById('start').style.display = 'none';
  document.getElementById('restart').onclick = () => reinit();
  document.getElementById('restart').style.display = 'none';
  document.getElementById('round').innerHTML = stateManager.get('round');

  draw();
  board.show();
}

function reinit() {
  stateManager.reset('remainingTurn');
  stateManager.reset('score');
  stateManager.reset('isOver');
  init();
}

function update() {
  const { x: mx, y: my } = stateManager.get('mousePosition');
  let clickedTile = stateManager.get('clickedTile');

  switch (stateManager.get('playerAction')) {
    case 'CLICK':
      clickedTile = tileManager.getClickedTile(mx, my);
      if (!clickedTile) return;

      stateManager.set('clickedTile', clickedTile);
      stateManager.set('mouseAnchorPoint', { x: mx, y: my });

      const dx = mx - clickedTile.x;
      const dy = my - clickedTile.y;
      stateManager.set('mouseToClickedTileDistance', { x: dx, y: dy });
      break;

    case 'DRAG':
      if (!clickedTile) return;

      const d = stateManager.get('mouseToClickedTileDistance');

      stateManager.update('clickedTile', (lastData) => ({
        ...lastData,
        x: mx - d.x,
        y: my - d.y
      }));

      draw();
      break;

    case 'DROP':
      if (!clickedTile) return;

      const direction = inputManager.getDirection(
        stateManager.get('mouseAnchorPoint'),
        { x: mx, y: my }
      );

      const droppedOnSameTile =
        mx >= clickedTile.initialX &&
        mx <= clickedTile.initialX + UPDATED_TILE_SIZE &&
        my >= clickedTile.initialY &&
        my <= clickedTile.initialY + UPDATED_TILE_SIZE;

      if (droppedOnSameTile) {
        stateManager.reset('clickedTile');
        draw();
        return;
      }

      if (direction) {
        tileManager.swapTiles(direction, () => {
          stateManager.reset('clickedTile');
          tileManager.checkMatches();
        });
      } else {
        stateManager.reset('clickedTile');
        if (stateManager.get('remainingTurn') === 0) {
          stateManager.set('isOver', true);
        }
      }

      stateManager.update('remainingTurn', (t = MAX_TURN) => t - 1);

      draw();
      break;

    case 'LEAVE':
      stateManager.reset('clickedTile');
      draw();
  }
}

function draw() {
  board.clear();
  board.draw();

  const clickedTile = stateManager.get('clickedTile') || {};

  tileManager.forEachTile((tile) => {
    // Skip clicked tile
    if (clickedTile.id === tile.id) return;

    board.drawTile(tile);
  });

  if (!clickedTile.id) return;
  board.drawTile(clickedTile);
}

function deinit() {
  /* Disconnect all events */
  board.off('mousedown', inputManager.handleMouseDown);
  board.off('mousemove', inputManager.handleMouseMove);
  board.off('mouseup', inputManager.handleMouseUp);
  board.off('mouseleave', inputManager.handleMouseLeave);

  draw();

  document.getElementById('restart').style.display = 'inline';
}

document.getElementById('start').onclick = init;
