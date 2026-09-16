/**
 * Magic Sort - In-game BFS Hint Solver (v1.1.0)
 * Updated to respect the indivisible chunk move rule:
 * Destination must have available space >= chunk_size.
 */

class GameSolver {
  static getTopChunk(bottle) {
    if (!bottle || bottle.length === 0) return null;
    const color = bottle[bottle.length - 1];
    let count = 0;
    for (let k = bottle.length - 1; k >= 0; k--) {
      if (bottle[k] === color) count++;
      else break;
    }
    return { color, count };
  }

  static getValidMoves(bottles, capacity = 4) {
    const moves = [];
    const n = bottles.length;

    for (let i = 0; i < n; i++) {
      const bFrom = bottles[i];
      if (bFrom.length === 0) continue;
      // Skip completed bottles
      if (bFrom.length === capacity && bFrom.every(c => c === bFrom[0])) continue;

      const topChunk = this.getTopChunk(bFrom);
      if (!topChunk) continue;

      const isPure = (topChunk.count === bFrom.length);

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const bTo = bottles[j];
        const space = capacity - bTo.length;

        // Strict chunk rule: Target must have space >= chunk.count!
        if (space < topChunk.count) continue;

        // Don't pour pure stack into empty bottle (redundant)
        if (bTo.length === 0 && isPure) continue;

        if (bTo.length === 0 || bTo[bTo.length - 1] === topChunk.color) {
          moves.push({ from: i, to: j, count: topChunk.count, color: topChunk.color });
        }
      }
    }
    return moves;
  }

  static applyMove(bottles, move) {
    const nextBottles = bottles.map(b => [...b]);
    const { from, to, count } = move;
    const color = nextBottles[from][nextBottles[from].length - 1];
    for (let i = 0; i < count; i++) {
      nextBottles[from].pop();
      nextBottles[to].push(color);
    }
    return nextBottles;
  }

  static isSolved(bottles, capacity = 4) {
    for (const b of bottles) {
      if (b.length === 0) continue;
      if (b.length !== capacity || !b.every(c => c === b[0])) return false;
    }
    return true;
  }

  static stateKey(bottles) {
    return bottles.map(b => b.join(',')).sort().join('|');
  }

  static findNextMove(currentBottles, capacity = 4, maxExplored = 25000) {
    if (this.isSolved(currentBottles, capacity)) return null;

    const queue = [{ state: currentBottles, firstMove: null, depth: 0 }];
    const visited = new Set();
    visited.add(this.stateKey(currentBottles));

    while (queue.length > 0) {
      if (visited.size > maxExplored) break;
      const { state, firstMove, depth } = queue.shift();

      if (this.isSolved(state, capacity)) {
        return firstMove;
      }

      if (depth >= 35) continue;

      const validMoves = this.getValidMoves(state, capacity);
      for (const move of validMoves) {
        const nextState = this.applyMove(state, move);
        const key = this.stateKey(nextState);

        if (this.isSolved(nextState, capacity)) {
          return firstMove || move;
        }

        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            state: nextState,
            firstMove: firstMove || move,
            depth: depth + 1
          });
        }
      }
    }

    const moves = this.getValidMoves(currentBottles, capacity);
    return moves.length > 0 ? moves[0] : null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameSolver };
}
