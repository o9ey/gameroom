/**
 * Magic Sort - Application Controller & Visual Coordinator (v1.2.1)
 * Features: Accurate Euclidean pour alignment, non-blocking multi-touch, live scoreboard
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const container = document.getElementById('bottles-container');
  const flyingLayer = document.getElementById('flying-layer');
  const levelTitle = document.getElementById('level-title');
  const levelSubtitle = document.getElementById('level-subtitle');
  const scoreCurrentElem = document.getElementById('score-current');
  const scoreMaxElem = document.getElementById('score-max');
  const scoreTotalElem = document.getElementById('score-total');
  const gameTimerElem = document.getElementById('game-timer');

  const btnUndo = document.getElementById('btn-undo');
  const btnRestart = document.getElementById('btn-restart');
  const btnHint = document.getElementById('btn-hint');
  const btnAddBottle = document.getElementById('btn-add-bottle');
  const btnSound = document.getElementById('btn-sound');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const btnLevels = document.getElementById('btn-levels');
  const modalLevels = document.getElementById('modal-levels');
  const btnCloseLevels = document.getElementById('btn-close-levels');
  const levelsGrid = document.getElementById('levels-grid');

  const modalWin = document.getElementById('modal-win');
  const winBaseScore = document.getElementById('win-base-score');
  const winMovesDetail = document.getElementById('win-moves-detail');
  const winTimeDetail = document.getElementById('win-time-detail');
  const winPenaltyDetail = document.getElementById('win-penalty-detail');
  const winScoreFinal = document.getElementById('win-score-final');
  const winScoreMax = document.getElementById('win-score-max');
  const winScoreTotal = document.getElementById('win-score-total');
  const btnNextLevel = document.getElementById('btn-next-level');
  const btnReplayLevel = document.getElementById('btn-replay-level');

  const tutorialHand = document.getElementById('tutorial-hand');
  const confettiCanvas = document.getElementById('confetti-canvas');

  // Game Engine
  const game = new WaterSortGame(LEVELS_DATA, COLOR_PALETTE);

  // Storage Keys
  const STORAGE_KEY_UNLOCKED = 'magic_sort_unlocked_level';
  const STORAGE_KEY_COMPLETED = 'magic_sort_completed_levels';
  const STORAGE_KEY_CURRENT = 'magic_sort_current_level';
  const STORAGE_KEY_TOTAL_SCORE = 'magic_sort_total_score';

  let unlockedLevel = parseInt(localStorage.getItem(STORAGE_KEY_UNLOCKED) || '1', 10);
  let completedLevels = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLETED) || '[]'));
  let savedCurrentLevel = parseInt(localStorage.getItem(STORAGE_KEY_CURRENT) || '1', 10);
  let totalCumulativeScore = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL_SCORE) || '0', 10);

  let selectedIndex = null;
  let hintTimeout = null;
  let levelStartTime = Date.now();
  let timerInterval = null;
  let currentElapsedSeconds = 0;

  // Sound System UI
  function updateSoundIcons() {
    if (window.soundSystem.isMuted) {
      soundIconOn.style.display = 'none';
      soundIconOff.style.display = 'block';
    } else {
      soundIconOn.style.display = 'block';
      soundIconOff.style.display = 'none';
    }
  }
  updateSoundIcons();

  // Timer & Live Scoreboard
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    levelStartTime = Date.now();
    currentElapsedSeconds = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      if (game.isLevelWon()) return;
      currentElapsedSeconds = Math.floor((Date.now() - levelStartTime) / 1000);
      updateTimerDisplay();
      updateScoreboard();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    if (gameTimerElem) {
      gameTimerElem.textContent = formatTime(currentElapsedSeconds);
    }
  }

  function updateScoreboard() {
    const scoreInfo = game.calculateScore(currentElapsedSeconds);
    scoreCurrentElem.textContent = scoreInfo.currentScore.toLocaleString();
    scoreMaxElem.textContent = scoreInfo.theoreticalMax.toLocaleString();
    scoreTotalElem.textContent = totalCumulativeScore.toLocaleString();
    btnUndo.disabled = !game.getState().canUndo;
    btnAddBottle.disabled = (game.extraBottlesCount >= 2 || game.isLevelWon());
  }

  // Responsive Layout
  function adjustResponsiveLayout(bottleCount) {
    const root = document.documentElement;
    const viewportWidth = window.innerWidth;

    let width = 58;
    let height = 155;
    let gapX = 12;
    let gapY = 20;

    if (bottleCount <= 4) {
      width = Math.min(74, Math.floor(viewportWidth / 5.2));
      height = Math.floor(width * 2.65);
      gapX = 16;
      gapY = 24;
    } else if (bottleCount <= 7) {
      width = Math.min(62, Math.floor(viewportWidth / 4.8));
      height = Math.floor(width * 2.6);
      gapX = 12;
      gapY = 20;
    } else if (bottleCount <= 10) {
      width = Math.min(54, Math.floor(viewportWidth / 5.2));
      height = Math.floor(width * 2.55);
      gapX = 10;
      gapY = 16;
    } else {
      width = Math.min(46, Math.floor(viewportWidth / 5.6));
      height = Math.floor(width * 2.5);
      gapX = 8;
      gapY = 14;
    }

    root.style.setProperty('--bottle-width', `${width}px`);
    root.style.setProperty('--bottle-height', `${height}px`);
    root.style.setProperty('--bottle-gap-x', `${gapX}px`);
    root.style.setProperty('--bottle-gap-y', `${gapY}px`);
  }

  // Create HTML structure for a single bottle graphic
  function createBottleElement(liquidChunks, isCompleted) {
    const bottle = document.createElement('div');
    bottle.className = 'bottle';

    // Neck wrapper
    const neckWrapper = document.createElement('div');
    neckWrapper.className = 'bottle-neck-wrapper';
    neckWrapper.innerHTML = `
      <div class="bottle-lip"></div>
      <div class="bottle-neck"></div>
    `;

    // Cork
    const cork = document.createElement('div');
    cork.className = `cork-stopper ${isCompleted ? 'popped' : ''}`;

    // Sparkle
    const sparkle = document.createElement('div');
    sparkle.className = 'cork-sparkle';
    sparkle.innerHTML = `
      <svg viewBox="0 0 32 32">
        <polygon points="16,2 19,12 29,16 19,20 16,30 13,20 3,16 13,12" fill="#ffeb3b" />
      </svg>
    `;
    neckWrapper.appendChild(cork);
    neckWrapper.appendChild(sparkle);

    // Body
    const body = document.createElement('div');
    body.className = 'bottle-body';

    const shine = document.createElement('div');
    shine.className = 'bottle-shine';
    body.appendChild(shine);

    // Chunks
    liquidChunks.forEach((chunk, idx) => {
      const chunkElem = document.createElement('div');
      const isTop = (idx === liquidChunks.length - 1);
      chunkElem.className = `liquid-chunk ${isTop ? 'top-chunk' : ''}`;
      chunkElem.style.height = `${chunk.count * 25}%`;

      const colorData = COLOR_PALETTE[chunk.color] || { hex: '#cccccc', darkHex: '#999999' };
      const inner = document.createElement('div');
      inner.className = 'liquid-inner';
      inner.style.background = `linear-gradient(to right, ${colorData.darkHex} 0%, ${colorData.hex} 40%, ${colorData.hex} 80%, ${colorData.darkHex} 100%)`;

      chunkElem.appendChild(inner);

      if (chunk.count >= 2) {
        const badge = document.createElement('span');
        badge.className = 'chunk-badge';
        badge.textContent = `×${chunk.count}`;
        chunkElem.appendChild(badge);
      }

      body.appendChild(chunkElem);
    });

    bottle.appendChild(neckWrapper);
    bottle.appendChild(body);
    return bottle;
  }

  // Render or update specific bottle slot in place
  function updateBottleSlot(bIdx) {
    const slots = container.querySelectorAll('.bottle-slot');
    const slot = slots[bIdx];
    if (!slot) return;

    const isCompleted = game.isBottleCompleted(bIdx);
    const isSelected = (selectedIndex === bIdx);
    const isBusy = game.isBottleBusy(bIdx);
    const chunks = game.getBottleChunks(bIdx);

    slot.className = `bottle-slot ${isSelected ? 'selected' : ''} ${isBusy ? 'busy' : ''}`;

    const oldBottle = slot.querySelector('.bottle');
    if (oldBottle) oldBottle.remove();

    const newBottle = createBottleElement(chunks, isCompleted);
    slot.appendChild(newBottle);
  }

  // Full Board Render
  function renderBoard() {
    container.innerHTML = '';
    const state = game.getState(currentElapsedSeconds);
    const count = state.bottles.length;
    adjustResponsiveLayout(count);

    state.bottles.forEach((_, bIdx) => {
      const isCompleted = game.isBottleCompleted(bIdx);
      const isSelected = (selectedIndex === bIdx);
      const isBusy = game.isBottleBusy(bIdx);
      const chunks = game.getBottleChunks(bIdx);

      const slot = document.createElement('div');
      slot.className = `bottle-slot ${isSelected ? 'selected' : ''} ${isBusy ? 'busy' : ''}`;
      slot.dataset.index = bIdx;

      const bottle = createBottleElement(chunks, isCompleted);
      slot.appendChild(bottle);

      // Multi-touch Pointer Events
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleBottleTap(bIdx);
      });

      container.appendChild(slot);
    });

    levelTitle.textContent = `Level ${state.levelNumber}`;
    levelSubtitle.textContent = state.levelNumber <= 3 ? "同じ色を揃えて栓をしよう！" : "Harder than you think";
    updateScoreboard();

    if (state.levelNumber === 1 && state.movesCount === 0 && selectedIndex === null) {
      showTutorialGuide();
    } else {
      hideTutorialGuide();
    }
  }

  function showTutorialGuide() {
    const slots = container.querySelectorAll('.bottle-slot');
    if (slots.length >= 3) {
      const firstSlot = slots[0];
      const rect = firstSlot.getBoundingClientRect();
      const boardRect = document.getElementById('game-board-wrapper').getBoundingClientRect();

      tutorialHand.style.display = 'block';
      tutorialHand.style.left = `${rect.left - boardRect.left + rect.width / 2 - 10}px`;
      tutorialHand.style.top = `${rect.top - boardRect.top + rect.height / 2}px`;
    }
  }

  function hideTutorialGuide() {
    tutorialHand.style.display = 'none';
  }

  // Handle Bottle Tap (Non-blocking, supports multi-touch)
  function handleBottleTap(index) {
    if (game.isBottleBusy(index)) {
      return;
    }
    clearHints();

    if (selectedIndex === null) {
      if (game.canSelect(index)) {
        selectedIndex = index;
        window.soundSystem.playSelect();
        updateBottleSlot(index);
      } else {
        shakeBottle(index);
        window.soundSystem.playInvalid();
      }
    } else if (selectedIndex === index) {
      selectedIndex = null;
      window.soundSystem.playDeselect();
      updateBottleSlot(index);
    } else {
      const fromIdx = selectedIndex;
      const toIdx = index;

      if (game.canPour(fromIdx, toIdx)) {
        selectedIndex = null;
        updateBottleSlot(fromIdx);
        startConcurrentPour(fromIdx, toIdx);
      } else {
        if (game.canSelect(toIdx)) {
          const prevSelected = selectedIndex;
          selectedIndex = toIdx;
          window.soundSystem.playSelect();
          if (prevSelected !== null) updateBottleSlot(prevSelected);
          updateBottleSlot(toIdx);
        } else {
          shakeBottle(toIdx);
          window.soundSystem.playInvalid();
        }
      }
    }
  }

  function shakeBottle(index) {
    const slots = container.querySelectorAll('.bottle-slot');
    if (slots[index]) {
      slots[index].classList.add('shake');
      setTimeout(() => slots[index].classList.remove('shake'), 450);
    }
  }

  // Accurately Aligned Pour Animation & Liquid Transfer (v1.2.1)
  function startConcurrentPour(fromIdx, toIdx) {
    // 1. Execute state transfer first so logic and data update reliably
    const pourResult = game.executePour(fromIdx, toIdx);
    if (!pourResult) {
      return;
    }

    // 2. Lock both bottles so other taps won't conflict with them during flight
    game.lockBottles(fromIdx, toIdx);

    const slots = container.querySelectorAll('.bottle-slot');
    const fromSlot = slots[fromIdx];
    const toSlot = slots[toIdx];
    if (!fromSlot || !toSlot) {
      game.unlockBottles(fromIdx, toIdx);
      return;
    }

    const layerRect = flyingLayer.getBoundingClientRect();
    const fromRect = fromSlot.getBoundingClientRect();
    const toRect = toSlot.getBoundingClientRect();

    // Reconstruct the flying clone's initial chunks before pour
    const currentSourceChunks = game.getBottleChunks(fromIdx);
    const cloneChunks = currentSourceChunks.map(c => ({ ...c }));
    if (cloneChunks.length > 0 && cloneChunks[cloneChunks.length - 1].color === pourResult.color) {
      cloneChunks[cloneChunks.length - 1].count += pourResult.count;
    } else {
      cloneChunks.push({ color: pourResult.color, count: pourResult.count });
    }

    const colorKey = pourResult.color;
    const colorHex = (COLOR_PALETTE[colorKey] && COLOR_PALETTE[colorKey].hex) || '#e66025';

    // 3. Mark static slots
    fromSlot.classList.add('busy-source');
    toSlot.classList.add('busy-target');

    // 4. Create independent flying clone on #flying-layer
    const flyingBottle = document.createElement('div');
    flyingBottle.className = 'flying-bottle';
    const cloneGraphic = createBottleElement(cloneChunks, false);
    flyingBottle.appendChild(cloneGraphic);

    const initialX = fromRect.left - layerRect.left;
    const initialY = fromRect.top - layerRect.top;
    flyingBottle.style.left = `${initialX}px`;
    flyingBottle.style.top = `${initialY}px`;
    flyingBottle.style.width = `${fromRect.width}px`;
    flyingBottle.style.height = `${fromRect.height}px`;
    flyingBottle.style.transform = 'translate(0px, 0px) rotate(0deg)';
    flyingLayer.appendChild(flyingBottle);

    updateScoreboard();

    // 5. Geometry calculation (transform-origin is 50% 10px, the lip!)
    const sourceLipX = initialX + fromRect.width / 2;
    const sourceLipY = initialY + 10;
    const targetLipX = toRect.left - layerRect.left + toRect.width / 2;
    const targetLipY = toRect.top - layerRect.top + 10;

    const isPouringRight = (targetLipX >= sourceLipX);
    const targetOffsetX = isPouringRight ? -6 : 6;
    const targetOffsetY = -14;

    const translateX = (targetLipX + targetOffsetX) - sourceLipX;
    const translateY = (targetLipY + targetOffsetY) - sourceLipY;
    const tiltAngle = isPouringRight ? 76 : -76;

    // Phase 1: Smooth arc flight and tilt towards target mouth (320ms)
    requestAnimationFrame(() => {
      flyingBottle.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${tiltAngle}deg)`;
    });

    // Phase 2: Water stream pours from rotated mouth into recipient
    setTimeout(() => {
      const stream = document.createElement('div');
      stream.className = 'flying-stream';

      const streamX = targetLipX + (isPouringRight ? -3 : 3);
      const streamTop = targetLipY - 3;
      const streamHeight = 36;

      stream.style.left = `${streamX}px`;
      stream.style.top = `${streamTop}px`;
      stream.style.height = `${streamHeight}px`;
      stream.style.background = `linear-gradient(to bottom, ${colorHex}, #ffffff 20%, ${colorHex} 40%)`;
      flyingLayer.appendChild(stream);

      window.soundSystem.playPour(0.42);

      // Drain liquid in flying bottle clone
      const flyingTopChunk = cloneGraphic.querySelector('.liquid-chunk.top-chunk');
      if (flyingTopChunk) {
        flyingTopChunk.style.height = '0%';
        flyingTopChunk.style.opacity = '0.3';
      }

      // Update destination slot with rising liquid and ripples
      updateBottleSlot(toIdx);
      toSlot.classList.add('busy-target');
      const targetTopLiquid = toSlot.querySelector('.liquid-chunk.top-chunk');
      if (targetTopLiquid) targetTopLiquid.classList.add('rippling');

      // Phase 3: Un-tilt and smooth return flight (300ms)
      setTimeout(() => {
        stream.remove();

        flyingBottle.style.transition = 'transform 0.28s cubic-bezier(0.33, 1, 0.68, 1)';
        flyingBottle.style.transform = 'translate(0px, 0px) rotate(0deg)';

        // Phase 4: Settle & unlock
        setTimeout(() => {
          flyingBottle.remove();
          fromSlot.classList.remove('busy-source', 'busy');
          toSlot.classList.remove('busy-target', 'busy');
          game.unlockBottles(fromIdx, toIdx);

          // Update static source slot with remaining liquid
          updateBottleSlot(fromIdx);
          updateBottleSlot(toIdx);

          // Cork pop check
          if (pourResult.justCorked !== null) {
            handleBottleCorked(pourResult.justCorked);
          }

          // Win condition check
          if (game.isLevelWon()) {
            handleLevelWin();
          }
        }, 290);
      }, 360);
    }, 320);
  }

  function handleBottleCorked(bottleIndex) {
    window.soundSystem.playCorkPop();
    const slots = container.querySelectorAll('.bottle-slot');
    const slot = slots[bottleIndex];
    if (slot) {
      const cork = slot.querySelector('.cork-stopper');
      const sparkle = slot.querySelector('.cork-sparkle');
      if (cork) cork.classList.add('popped');
      if (sparkle) {
        sparkle.classList.remove('active');
        void sparkle.offsetWidth;
        sparkle.classList.add('active');
      }
    }
  }

  // Level Win
  function handleLevelWin() {
    stopTimer();
    const current = game.currentLevelNumber;
    completedLevels.add(current);
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...completedLevels]));

    if (current + 1 > unlockedLevel && current < game.totalLevels) {
      unlockedLevel = current + 1;
      localStorage.setItem(STORAGE_KEY_UNLOCKED, unlockedLevel);
    }

    const scoreInfo = game.calculateScore(currentElapsedSeconds);
    totalCumulativeScore += scoreInfo.currentScore;
    localStorage.setItem(STORAGE_KEY_TOTAL_SCORE, totalCumulativeScore);

    setTimeout(() => {
      window.soundSystem.playWin();
      triggerConfetti();

      winBaseScore.textContent = `${scoreInfo.baseScore.toLocaleString()} 点`;
      winMovesDetail.textContent = `${game.movesCount} 手 (基準: ${game.minMoves}手 / ${scoreInfo.perfectBonus > 0 ? 'パーフェクト +' + scoreInfo.perfectBonus : '-' + scoreInfo.movesPenalty + '点'})`;
      winTimeDetail.textContent = `+${scoreInfo.timeBonus.toLocaleString()} 点 (${formatTime(currentElapsedSeconds)})`;
      winPenaltyDetail.textContent = `-${scoreInfo.hintPenalty + scoreInfo.bottlePenalty} 点 (ヒント${game.hintsUsed} / 瓶+${game.extraBottlesCount})`;
      winScoreFinal.textContent = `${scoreInfo.currentScore.toLocaleString()} 点`;
      winScoreMax.textContent = `${scoreInfo.theoreticalMax.toLocaleString()} 点`;
      winScoreTotal.textContent = `${totalCumulativeScore.toLocaleString()} 点`;

      btnNextLevel.style.display = (current >= game.totalLevels) ? 'none' : 'block';
      modalWin.classList.add('active');
    }, 600);
  }

  // Confetti
  function triggerConfetti() {
    const ctx = confettiCanvas.getContext('2d');
    const width = confettiCanvas.width = window.innerWidth;
    const height = confettiCanvas.height = window.innerHeight;

    const colors = ['#f5b316', '#e66025', '#1d72b8', '#27ae60', '#e84393', '#9b59b6', '#00cec9', '#ffffff'];
    const particles = [];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 60,
        y: height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 15,
        opacity: 1
      });
    }

    let animationId = null;
    let frames = 0;

    function renderConfetti() {
      ctx.clearRect(0, 0, width, height);
      let activeCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rotation += p.vRot;
        if (frames > 40) p.opacity -= 0.015;

        if (p.opacity > 0 && p.y < height + 50) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      frames++;
      if (activeCount > 0 && frames < 140) {
        animationId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationId);
      }
    }

    renderConfetti();
  }

  // Hints
  function clearHints() {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
    const slots = container.querySelectorAll('.bottle-slot');
    slots.forEach(s => s.classList.remove('hint-source', 'hint-target'));
  }

  btnHint.addEventListener('click', () => {
    clearHints();
    const move = GameSolver.findNextMove(game.bottles);
    if (!move) {
      window.soundSystem.playInvalid();
      alert("現在の状態からのヒントが見つかりませんでした。「やり直す」か「+1 瓶」をお試しください。");
      return;
    }

    game.useHint();
    updateScoreboard();
    window.soundSystem.playSelect();

    const slots = container.querySelectorAll('.bottle-slot');
    if (slots[move.from] && slots[move.to]) {
      slots[move.from].classList.add('hint-source');
      slots[move.to].classList.add('hint-target');

      hintTimeout = setTimeout(() => {
        clearHints();
      }, 4000);
    }
  });

  // Controls
  btnUndo.addEventListener('click', () => {
    clearHints();
    const state = game.undo();
    if (state) {
      window.soundSystem.playUndo();
      selectedIndex = null;
      renderBoard();
    }
  });

  btnRestart.addEventListener('click', () => {
    clearHints();
    selectedIndex = null;
    flyingLayer.innerHTML = '';
    game.restart();
    startTimer();
    window.soundSystem.playDeselect();
    renderBoard();
  });

  btnAddBottle.addEventListener('click', () => {
    clearHints();
    if (game.addExtraBottle()) {
      window.soundSystem.playSelect();
      updateScoreboard();
      renderBoard();
    } else {
      window.soundSystem.playInvalid();
    }
  });

  btnSound.addEventListener('click', () => {
    window.soundSystem.toggleMute();
    updateSoundIcons();
  });

  // Level Select Modal
  function renderLevelsGrid() {
    levelsGrid.innerHTML = '';
    for (let lv = 1; lv <= game.totalLevels; lv++) {
      const item = document.createElement('div');
      const isCompleted = completedLevels.has(lv);
      const isUnlocked = lv <= unlockedLevel;
      const isCurrent = lv === game.currentLevelNumber;

      item.className = `level-grid-item ${isCompleted ? 'completed' : ''} ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;
      item.textContent = lv;

      if (isUnlocked) {
        item.addEventListener('click', () => {
          modalLevels.classList.remove('active');
          loadLevel(lv);
        });
      }

      levelsGrid.appendChild(item);
    }
  }

  btnLevels.addEventListener('click', () => {
    renderLevelsGrid();
    modalLevels.classList.add('active');
  });

  btnCloseLevels.addEventListener('click', () => {
    modalLevels.classList.remove('active');
  });

  // Win Modal Actions
  btnNextLevel.addEventListener('click', () => {
    modalLevels.classList.remove('active');
    modalWin.classList.remove('active');
    const next = game.currentLevelNumber + 1;
    if (next <= game.totalLevels) {
      loadLevel(next);
    }
  });

  btnReplayLevel.addEventListener('click', () => {
    modalWin.classList.remove('active');
    game.restart();
    startTimer();
    renderBoard();
  });

  function loadLevel(num) {
    clearHints();
    selectedIndex = null;
    flyingLayer.innerHTML = '';
    game.loadLevel(num);
    startTimer();
    localStorage.setItem(STORAGE_KEY_CURRENT, num);
    renderBoard();
  }

  window.addEventListener('resize', () => {
    adjustResponsiveLayout(game.bottles.length);
  });

  // Initial Load
  const startLevel = Math.min(Math.max(1, savedCurrentLevel), unlockedLevel);
  loadLevel(startLevel);
});
