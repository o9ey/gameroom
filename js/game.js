/**
 * Magic Sort - Core Game Engine
 * Version: 1.2.1
 * Bugfix: Separated caller busy checks from executePour execution logic so pours never fail
 */

const BOTTLE_CAPACITY = 4;

class WaterSortGame {
  constructor(levelsData, palette) {
    this.levelsData = levelsData;
    this.palette = palette;
    this.currentLevelIndex = 0;
    this.bottles = [];
    this.completedBottles = new Set();
    this.busyBottles = new Set(); // Bottles actively involved in an animation
    this.history = [];
    this.selectedBottleIndex = null;
    this.movesCount = 0;
    this.extraBottlesCount = 0;
    this.hintsUsed = 0;
    this.minMoves = 3;
    this.theoreticalMaxScore = 2400;
  }

  get totalLevels() {
    return this.levelsData.length;
  }

  get currentLevelNumber() {
    return this.currentLevelIndex + 1;
  }

  loadLevel(levelNumber) {
    const idx = Math.max(0, Math.min(levelNumber - 1, this.levelsData.length - 1));
    this.currentLevelIndex = idx;
    const level = this.levelsData[idx];

    this.bottles = level.bottles.map(b => [...b]);
    this.completedBottles = new Set();
    this.busyBottles = new Set();
    this.history = [];
    this.selectedBottleIndex = null;
    this.movesCount = 0;
    this.extraBottlesCount = 0;
    this.hintsUsed = 0;
    this.minMoves = level.minMoves || 3;
    this.theoreticalMaxScore = level.maxScore || this.calcTheoreticalMax(this.currentLevelNumber, this.minMoves);

    this.checkInitialCompleted();
    return this.getState();
  }

  calcTheoreticalMax(levelNum, minMoves) {
    const base = 1000 + levelNum * 250;
    const perfectBonus = 500 + levelNum * 100;
    const maxTimeBonus = 500 + levelNum * 50;
    return base + perfectBonus + maxTimeBonus;
  }

  checkInitialCompleted() {
    this.bottles.forEach((b, idx) => {
      if (b.length === BOTTLE_CAPACITY && b.every(c => c === b[0])) {
        this.completedBottles.add(idx);
      }
    });
  }

  isBottleBusy(index) {
    return this.busyBottles.has(index);
  }

  lockBottles(fromIdx, toIdx) {
    this.busyBottles.add(fromIdx);
    this.busyBottles.add(toIdx);
  }

  unlockBottles(fromIdx, toIdx) {
    this.busyBottles.delete(fromIdx);
    this.busyBottles.delete(toIdx);
  }

  getBottleChunks(bottleIndex) {
    const b = this.bottles[bottleIndex];
    if (!b || b.length === 0) return [];

    const chunks = [];
    let currColor = b[0];
    let currCount = 1;

    for (let i = 1; i < b.length; i++) {
      if (b[i] === currColor) {
        currCount++;
      } else {
        chunks.push({ color: currColor, count: currCount });
        currColor = b[i];
        currCount = 1;
      }
    }
    chunks.push({ color: currColor, count: currCount });
    return chunks;
  }

  getTopChunk(bottleIndex) {
    const b = this.bottles[bottleIndex];
    if (!b || b.length === 0) return null;
    const color = b[b.length - 1];
    let count = 0;
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i] === color) count++;
      else break;
    }
    return { color, count };
  }

  canSelect(index) {
    if (index < 0 || index >= this.bottles.length) return false;
    if (this.completedBottles.has(index)) return false;
    if (this.busyBottles.has(index)) return false;
    return this.bottles[index].length > 0;
  }

  canPour(fromIndex, toIndex, ignoreBusy = false) {
    if (fromIndex === toIndex) return false;
    if (fromIndex < 0 || fromIndex >= this.bottles.length) return false;
    if (toIndex < 0 || toIndex >= this.bottles.length) return false;

    // Check busy lock only if ignoreBusy is false
    if (!ignoreBusy) {
      if (this.busyBottles.has(fromIndex) || this.busyBottles.has(toIndex)) return false;
    }

    const from = this.bottles[fromIndex];
    const to = this.bottles[toIndex];

    if (!from || from.length === 0) return false;
    if (this.completedBottles.has(fromIndex) || this.completedBottles.has(toIndex)) return false;

    const topChunk = this.getTopChunk(fromIndex);
    if (!topChunk) return false;

    const availableSpace = BOTTLE_CAPACITY - to.length;
    if (availableSpace < topChunk.count) {
      return false;
    }

    if (to.length === 0) {
      if (topChunk.count === from.length) {
        return false;
      }
      return true;
    }

    const targetTop = to[to.length - 1];
    return targetTop === topChunk.color;
  }

  executePour(fromIndex, toIndex) {
    // Check pour legality with ignoreBusy = true so active lock doesn't reject it
    if (!this.canPour(fromIndex, toIndex, true)) return null;

    const topChunk = this.getTopChunk(fromIndex);
    if (!topChunk) return null;

    // Save history
    this.history.push({
      bottles: this.bottles.map(b => [...b]),
      completedBottles: new Set(this.completedBottles),
      movesCount: this.movesCount
    });

    const { color, count } = topChunk;
    for (let i = 0; i < count; i++) {
      this.bottles[fromIndex].pop();
      this.bottles[toIndex].push(color);
    }

    this.movesCount++;
    if (this.selectedBottleIndex === fromIndex) {
      this.selectedBottleIndex = null;
    }

    let justCorked = null;
    if (this.isBottleMonochromeFull(toIndex)) {
      this.completedBottles.add(toIndex);
      justCorked = toIndex;
    }

    const isWon = this.isLevelWon();

    return {
      success: true,
      fromIndex,
      toIndex,
      color,
      count,
      justCorked,
      isWon
    };
  }

  isBottleCompleted(index) {
    return this.completedBottles.has(index);
  }

  isBottleMonochromeFull(index) {
    const b = this.bottles[index];
    return b && b.length === BOTTLE_CAPACITY && b.every(c => c === b[0]);
  }

  undo() {
    if (this.history.length === 0 || this.busyBottles.size > 0) return null;
    const last = this.history.pop();
    this.bottles = last.bottles.map(b => [...b]);
    this.completedBottles = new Set(last.completedBottles);
    this.movesCount = last.movesCount;
    this.selectedBottleIndex = null;
    return this.getState();
  }

  restart() {
    if (this.busyBottles.size > 0) {
      this.busyBottles.clear();
    }
    return this.loadLevel(this.currentLevelNumber);
  }

  addExtraBottle() {
    if (this.extraBottlesCount >= 2) return false;
    this.extraBottlesCount++;
    this.bottles.push([]);
    return true;
  }

  useHint() {
    this.hintsUsed++;
  }

  isLevelWon() {
    if (this.busyBottles.size > 0) return false;

    let coloredBottlesCount = 0;
    for (let i = 0; i < this.bottles.length; i++) {
      const b = this.bottles[i];
      if (b.length > 0) {
        coloredBottlesCount++;
        if (b.length !== BOTTLE_CAPACITY || !b.every(c => c === b[0])) {
          return false;
        }
      }
    }
    return coloredBottlesCount > 0;
  }

  calculateScore(elapsedSeconds = 0) {
    const L = this.currentLevelNumber;
    const baseScore = 1000 + L * 250;
    const perfectBonusMax = 500 + L * 100;
    const maxTimeBonus = 500 + L * 50;

    const isPerfectMoves = (this.movesCount <= this.minMoves);
    const perfectBonus = isPerfectMoves ? perfectBonusMax : 0;
    const extraMoves = Math.max(0, this.movesCount - this.minMoves);
    const movesPenalty = extraMoves * 50;
    const moveScore = Math.max(baseScore * 0.25, baseScore + perfectBonus - movesPenalty);

    const parTime = Math.max(15, this.minMoves * 3);
    const overtime = Math.max(0, elapsedSeconds - parTime);
    const timeBonus = Math.max(0, maxTimeBonus - overtime * 15);

    const hintPenalty = this.hintsUsed * 200;
    const bottlePenalty = this.extraBottlesCount * 400;

    const totalScore = Math.max(100, Math.round(moveScore + timeBonus - hintPenalty - bottlePenalty));

    return {
      currentScore: totalScore,
      theoreticalMax: this.theoreticalMaxScore,
      baseScore,
      perfectBonus,
      movesPenalty,
      timeBonus,
      hintPenalty,
      bottlePenalty,
      isPerfectMoves,
      parTime
    };
  }

  getState(elapsedSeconds = 0) {
    const scoreInfo = this.calculateScore(elapsedSeconds);
    return {
      levelNumber: this.currentLevelNumber,
      totalLevels: this.totalLevels,
      bottles: this.bottles.map(b => [...b]),
      completedBottles: new Set(this.completedBottles),
      busyBottles: new Set(this.busyBottles),
      selectedBottleIndex: this.selectedBottleIndex,
      movesCount: this.movesCount,
      minMoves: this.minMoves,
      hintsUsed: this.hintsUsed,
      canUndo: this.history.length > 0 && this.busyBottles.size === 0,
      isWon: this.isLevelWon(),
      extraBottlesCount: this.extraBottlesCount,
      scoreInfo
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaterSortGame, BOTTLE_CAPACITY };
}
