(() => {
  "use strict";

  const titleScreen = document.querySelector("#titleScreen");
  const gameScreen = document.querySelector("#gameScreen");
  const startButton = document.querySelector("#startButton");
  const backButton = document.querySelector("#backButton");
  const resetButton = document.querySelector("#resetButton");
  const cancelButton = document.querySelector("#cancelButton");
  const nextButton = document.querySelector("#nextButton");
  const canvas = document.querySelector("#drawingCanvas");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const ctx = canvas.getContext("2d");
  const canvasMessage = document.querySelector("#canvasMessage");
  const timerValue = document.querySelector("#timerValue");
  const drawState = document.querySelector("#drawState");
  const goldValue = document.querySelector("#goldValue");
  const qualityLabel = document.querySelector("#qualityLabel");
  const qualityMeterFill = document.querySelector("#qualityMeterFill");
  const accuracyValue = document.querySelector("#accuracyValue");
  const speedValue = document.querySelector("#speedValue");
  const resultCard = document.querySelector("#resultCard");
  const resultTitle = document.querySelector("#resultTitle");
  const resultMessage = document.querySelector("#resultMessage");
  const rewardValue = document.querySelector("#rewardValue");

  const LOGICAL_WIDTH = 720;
  const LOGICAL_HEIGHT = 460;
  const TIME_LIMIT = 5;
  const GUIDE_TOLERANCE = 42;
  const GUIDE_POINTS = buildDropletGuide();

  let gold = 0;
  let drawing = false;
  let hasStarted = false;
  let points = [];
  let startedAt = 0;
  let elapsed = 0;
  let lastPointerId = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function cubicPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
    };
  }

  function buildDropletGuide() {
    const segments = [
      [{ x: 360, y: 66 }, { x: 325, y: 118 }, { x: 244, y: 202 }, { x: 248, y: 300 }],
      [{ x: 248, y: 300 }, { x: 248, y: 376 }, { x: 302, y: 414 }, { x: 360, y: 414 }],
      [{ x: 360, y: 414 }, { x: 418, y: 414 }, { x: 472, y: 376 }, { x: 472, y: 300 }],
      [{ x: 472, y: 300 }, { x: 476, y: 202 }, { x: 395, y: 118 }, { x: 360, y: 66 }],
    ];
    const points = [];
    segments.forEach((segment, segmentIndex) => {
      for (let i = 0; i <= 38; i += 1) {
        if (segmentIndex > 0 && i === 0) continue;
        points.push(cubicPoint(...segment, i / 38));
      }
    });
    return points;
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_WIDTH * dpr;
    canvas.height = LOGICAL_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function drawPaperTexture() {
    const gradient = ctx.createRadialGradient(360, 210, 10, 360, 230, 420);
    gradient.addColorStop(0, "rgba(255,255,255,.20)");
    gradient.addColorStop(1, "rgba(185,155,105,.06)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.13;
    for (let x = 0; x < LOGICAL_WIDTH; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, LOGICAL_HEIGHT);
      ctx.strokeStyle = "#a68d6b";
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGuide() {
    ctx.save();
    ctx.beginPath();
    GUIDE_POINTS.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 25;
    ctx.strokeStyle = "rgba(107, 104, 98, .23)";
    ctx.stroke();
    ctx.lineWidth = 16;
    ctx.strokeStyle = "rgba(125, 124, 117, .70)";
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(245, 238, 216, .44)";
    ctx.stroke();

    const top = GUIDE_POINTS[0];
    ctx.beginPath();
    ctx.arc(top.x, top.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(196, 77, 50, .12)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(top.x, top.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(174, 83, 58, .75)";
    ctx.fill();
    ctx.restore();
  }

  function drawUserLine() {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(177, 68, 42, .17)";
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#e0653d";
    ctx.shadowColor = "rgba(191, 65, 40, .28)";
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff0c1";
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    drawPaperTexture();
    drawGuide();
    drawUserLine();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * LOGICAL_WIDTH / rect.width, 0, LOGICAL_WIDTH),
      y: clamp((event.clientY - rect.top) * LOGICAL_HEIGHT / rect.height, 0, LOGICAL_HEIGHT),
    };
  }

  function setGold(amount) {
    gold = Math.max(0, Math.round(amount));
    goldValue.textContent = gold.toLocaleString("ko-KR");
  }

  function setQuality(score, accuracy, speed) {
    const roundedScore = Math.round(score);
    let label = "실패";
    let labelClass = "quality-label--fail";
    if (roundedScore >= 90) {
      label = "걸작";
      labelClass = "quality-label--master";
    } else if (roundedScore >= 70) {
      label = "우수";
      labelClass = "quality-label--good";
    } else if (roundedScore >= 40) {
      label = "일반";
      labelClass = "quality-label--normal";
    }
    qualityLabel.textContent = label;
    qualityLabel.className = `quality-label ${labelClass}`;
    qualityMeterFill.style.width = `${roundedScore}%`;
    accuracyValue.textContent = `${Math.round(accuracy)}%`;
    speedValue.textContent = `${Math.round(speed)}%`;
    return label;
  }

  function resetQuality() {
    qualityLabel.textContent = "대기 중";
    qualityLabel.className = "quality-label quality-label--ready";
    qualityMeterFill.style.width = "0%";
    accuracyValue.textContent = "—";
    speedValue.textContent = "—";
  }

  function setScreen(showGame) {
    document.activeElement?.blur();
    titleScreen.hidden = showGame;
    gameScreen.hidden = !showGame;
    window.scrollTo(0, 0);
    if (showGame) {
      requestAnimationFrame(() => {
        gameScreen.scrollIntoView({ block: "start", inline: "nearest" });
        window.scrollTo(0, 0);
        resizeCanvas();
        resetDrawing();
      });
    }
  }

  function resetDrawing() {
    drawing = false;
    hasStarted = false;
    points = [];
    startedAt = 0;
    elapsed = 0;
    lastPointerId = null;
    timerValue.textContent = TIME_LIMIT.toFixed(1);
    drawState.textContent = "준비";
    canvasMessage.classList.remove("is-hidden");
    resultCard.hidden = true;
    resetQuality();
    render();
  }

  function beginDrawing(event) {
    if (resultCard.hidden === false) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    drawing = true;
    hasStarted = true;
    points = [pointerPosition(event)];
    startedAt = performance.now();
    lastPointerId = event.pointerId;
    drawState.textContent = "필사 중";
    canvasMessage.classList.add("is-hidden");
    canvas.setPointerCapture?.(event.pointerId);
    render();
  }

  function continueDrawing(event) {
    if (!drawing || event.pointerId !== lastPointerId) return;
    event.preventDefault();
    const nextPoint = pointerPosition(event);
    const previous = points[points.length - 1];
    if (!previous || distance(previous, nextPoint) >= 4) {
      points.push(nextPoint);
      render();
    }
  }

  function endDrawing(event) {
    if (!drawing || event.pointerId !== lastPointerId) return;
    event.preventDefault();
    drawing = false;
    elapsed = clamp((performance.now() - startedAt) / 1000, 0, TIME_LIMIT);
    drawState.textContent = "판정 중";
    releasePointer(event.pointerId);
    evaluateDrawing();
  }

  function releasePointer(pointerId) {
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    lastPointerId = null;
  }

  function pointToSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(point, start);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
  }

  function nearestDistance(point, path) {
    let nearest = Infinity;
    for (let i = 1; i < path.length; i += 1) {
      nearest = Math.min(nearest, pointToSegmentDistance(point, path[i - 1], path[i]));
    }
    return nearest;
  }

  function averageInputDeviation() {
    if (points.length < 2) return GUIDE_TOLERANCE * 2;
    const sample = points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 90)) === 0);
    const total = sample.reduce((sum, point) => sum + nearestDistance(point, GUIDE_POINTS), 0);
    return total / sample.length;
  }

  function guideCoverage() {
    if (points.length < 2) return 0;
    const sample = GUIDE_POINTS.filter((_, index) => index % 4 === 0);
    const covered = sample.filter((point) => nearestDistance(point, points) <= GUIDE_TOLERANCE).length;
    return covered / sample.length;
  }

  function evaluateDrawing() {
    const startDistance = distance(points[0] || { x: 0, y: 0 }, GUIDE_POINTS[0]);
    const deviation = averageInputDeviation();
    const coverage = guideCoverage();
    const proximityScore = clamp(1 - deviation / 75, 0, 1);
    const startScore = clamp(1 - startDistance / 95, 0, 1);
    const accuracy = clamp((proximityScore * 0.72 + coverage * 0.2 + startScore * 0.08) * 100, 0, 100);
    const speed = clamp(100 - ((elapsed - 1.2) / (TIME_LIMIT - 1.2)) * 100, 0, 100);
    const finalScore = clamp(accuracy * 0.7 + speed * 0.3, 0, 100);
    const quality = setQuality(finalScore, accuracy, speed);
    const rewardMap = { 실패: 0, 일반: 10, 우수: 14, 걸작: 20 };
    const reward = rewardMap[quality];
    setGold(gold + reward);
    showResult(quality, reward, finalScore);
  }

  function showResult(quality, reward, score) {
    const messages = {
      실패: "마법진의 흐름이 끊겼습니다. 다시 필사해 보세요.",
      일반: "작은 불꽃이 양피지 위에서 안정적으로 타오릅니다.",
      우수: "매끄러운 필사입니다. 의뢰인이 좋아할 만한 품질입니다.",
      걸작: "완벽에 가까운 필사입니다. 불꽃이 당신의 의지를 기억합니다.",
    };
    resultTitle.textContent = `${quality} 품질 Torch`;
    resultMessage.textContent = `${messages[quality]} · 최종 점수 ${Math.round(score)}점`;
    rewardValue.textContent = reward;
    resultCard.hidden = false;
    drawState.textContent = "제작 완료";
  }

  function updateTimer(now) {
    if (hasStarted && drawing) {
      elapsed = clamp((now - startedAt) / 1000, 0, TIME_LIMIT);
      timerValue.textContent = Math.max(0, TIME_LIMIT - elapsed).toFixed(1);
      if (elapsed >= TIME_LIMIT) {
        drawing = false;
        releasePointer(lastPointerId);
        drawState.textContent = "시간 초과";
        evaluateDrawing();
      }
    }
    requestAnimationFrame(updateTimer);
  }

  startButton.addEventListener("click", () => setScreen(true));
  backButton.addEventListener("click", () => setScreen(false));
  cancelButton.addEventListener("click", resetDrawing);
  resetButton.addEventListener("click", resetDrawing);
  nextButton.addEventListener("click", resetDrawing);
  canvas.addEventListener("pointerdown", beginDrawing);
  canvas.addEventListener("pointermove", continueDrawing);
  canvas.addEventListener("pointerup", endDrawing);
  canvas.addEventListener("pointercancel", endDrawing);
  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  setGold(0);
  requestAnimationFrame(updateTimer);
})();
