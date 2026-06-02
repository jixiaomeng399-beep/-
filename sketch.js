let video, handpose, artifact;
let predictions = [];

// 当前抽中的模型
let selectedArtifact = null;
let lastArtifactFile = null;

// 4 个盲盒模型：原来的 1 个 + 新加的 3 个
// weight 越小，被抽中的概率越低
const artifactList = [
  {
    name: "후모무정 / 后母戊鼎",
    file: "assets/houmuwuding.glb",
    weight: 1,
    desc: "상나라 후기의 대표적인 청동 예기로, 고대 중국 청동기 문화의 권위와 제례적 상징성을 보여주는 문물입니다."
  },
  {
    name: "청화 도자기 인물",
    file: "assets/porcelain.glb",
    weight: 1,
    desc: "청화백자의 색채와 장식성을 바탕으로 한 인물형 문물로, 전통 도자기의 장식미와 조형적 아름다움을 보여줍니다."
  },
  {
    name: "도자기 낙타",
    file: "assets/camel.glb",
    weight: 1,
    desc: "낙타 형상의 도자기 문물로, 교역로와 이동 문화, 그리고 고대 생활 속 동물 상징을 떠올리게 하는 컬렉션입니다."
  },
  {
    name: "연꽃 캐릭터 문물",
    file: "assets/character.glb",
    weight: 0.45,
    desc: "연꽃 이미지를 현대적인 캐릭터 형식으로 재해석한 문물로, 전통 상징과 귀여운 조형미를 결합한 박물관 컬렉션입니다."
  }
];

let opened = false;
let opening = false;

let shakeCount = 0;
let lastShakeX = null;
let shakeCooldown = 0;
let openProgress = 0;

let particles = [];

let theta = 0;
let phi = 75;
let radius = 3;
let targetTheta = 0;
let targetPhi = 75;
let targetRadius = 3;
let lastHandX = null;

let cameraReady = false;

// 다시 뽑기 전환 애니메이션
let resetAnimation = false;
let resetProgress = 0;

// 손가락 하트 유지 시간
let heartHoldFrames = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  artifact = document.getElementById("artifact");
  artifact.setAttribute("camera-orbit", "0deg 75deg 3m");

  // 摄像头
  video = createCapture(VIDEO, function () {
    console.log("摄像头已经启动");
    cameraReady = true;
  });

  video.size(640, 480);
  video.hide();

  // 手势识别
  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", function(results) {
    predictions = results;
  });
}

function modelReady() {
  console.log("ml5 handpose ready");
}

function draw() {
  clear();

  if (resetAnimation) {
    playResetAnimation();
    drawCameraPanel();
    drawHandSkeleton();
    updateParticles();
    return;
  }

  if (!opened) {
    drawInterfaceBase();
    drawTitle();
    drawBoxObject();
    drawLeftGuide();
    drawProgressPanel();
    drawCameraPanel();
    drawHandSkeleton();

    // 不需要按空格，直接检测摇手
    checkShake();
  } else {
    artifact.style.display = "block";
    controlModelByHand();
    drawOpenedOverlay();
    drawCameraPanel();
    drawHandSkeleton();

    // 开盒后检测手指比心
    checkHeartReset();
  }

  updateParticles();

  if (opening) {
    playOpenParticles();
  }

  if (shakeCooldown > 0) {
    shakeCooldown--;
  }
}

function drawInterfaceBase() {
  clear();

  noStroke();
  fill(255, 248, 232, 48);
  rect(10, 10, width - 20, height - 20, 18);

  stroke(86, 62, 42, 70);
  strokeWeight(2);
  noFill();
  rect(18, 18, width - 36, height - 36, 18);

  noStroke();
  fill(255, 255, 255, 42);
  ellipse(width / 2, height / 2 + 38, 780, 490);

  fill(210, 175, 110, 38);
  ellipse(width / 2, height / 2 + 120, 560, 210);
}

function drawTitle() {
  fill("#2f2318");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(42);
  text("디지털 문물 블라인드 박스", width / 2, 76);

  textStyle(NORMAL);
  textSize(16);
  fill("#6b5540");
  text("손동작으로 개봉하는 인터랙티브 박물관 컬렉션", width / 2, 108);

  noFill();
  stroke(150, 116, 70, 95);
  strokeWeight(1.5);
  rect(width / 2 - 360, 34, 720, 95, 18);
}

function drawBoxObject() {
  push();
  translate(width / 2, height / 2 + 35);

  if (predictions.length > 0 && shakeCount > 0) {
    rotate(sin(frameCount * 0.75) * 0.12);
  }

  drawingContext.shadowBlur = 42;
  drawingContext.shadowColor = "rgba(88, 58, 28, 0.45)";

  rectMode(CENTER);
  fill(43, 73, 56, 238);
  stroke(204, 164, 88, 235);
  strokeWeight(8);
  rect(0, 0, 380, 270, 34);

  noStroke();
  fill(218, 176, 84, 238);
  rect(0, -54, 405, 34, 17);

  fill(255, 232, 150);
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(96);
  text("?", 0, 40);

  textStyle(NORMAL);
  textSize(14);
  fill(238, 218, 168);
  text("HERITAGE COLLECTION", 0, 112);

  pop();
}

function drawGuideStep(num, title, x, y) {
  noStroke();

  fill("#d7ad52");
  circle(x, y - 5, 28);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(15);
  text(num, x, y);

  fill("#4c3929");
  textAlign(LEFT);
  textStyle(NORMAL);
  textSize(15);
  text(title, x + 28, y);
}

function drawLeftGuide() {
  let x = 44;
  let y = 155;
  let w = 270;
  let h = 285;

  drawPanel(x, y, w, h);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(19);
  text("체험 방법", x + w / 2, y + 42);

  drawGuideStep("1", "손을 카메라 안에 넣기", x + 55, y + 96);
  drawGuideStep("2", "손을 좌우로 흔들기", x + 55, y + 154);
  drawGuideStep("3", "8회 흔들면 박스 개봉", x + 55, y + 212);

  textStyle(NORMAL);
  textSize(12);
  fill("#8a6840");
  textAlign(CENTER);
  text("개봉 후 손가락 하트 동작으로 다시 뽑기", x + w / 2, y + 255);
}

function drawProgressPanel() {
  let x = 44;
  let y = height - 245;
  let w = 270;
  let h = 135;

  drawPanel(x, y, w, h);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(16);
  text("개봉 진행도", x + w / 2, y + 34);

  for (let i = 0; i < 8; i++) {
    if (i < shakeCount) fill("#d7ad52");
    else fill(255, 255, 255, 130);

    stroke("#8a6840");
    strokeWeight(1);
    push();
    translate(x + 54 + i * 24, y + 65);
    rotate(PI / 4);
    rectMode(CENTER);
    rect(0, 0, 12, 12);
    pop();
  }

  noStroke();
  fill("#3b2a1f");
  textSize(28);
  text(shakeCount + " / 8", x + w / 2, y + 106);

  if (predictions.length > 0 && !opened) {
    textSize(13);
    fill("#8a5d20");
    text("손을 좌우로 흔들어 주세요", x + w / 2, y + 126);
  }
}

function drawPanel(x, y, w, h) {
  noStroke();
  fill(255, 248, 232, 112);
  rect(x, y, w, h, 20);

  noFill();
  stroke(139, 104, 58, 110);
  strokeWeight(1.5);
  rect(x, y, w, h, 20);
}

function drawCameraPanel() {
  let camW = 340;
  let camH = 255;
  let x = width - camW - 42;
  let y = 180;

  drawPanel(x - 14, y - 48, camW + 28, camH + 88);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(15);
  text("손 인식 카메라", x + camW / 2, y - 20);

  if (cameraReady && video) {
    push();
    translate(x + camW, y);
    scale(-1, 1);
    image(video, 0, 0, camW, camH);
    pop();
  } else {
    noStroke();
    fill(255, 248, 232, 180);
    rect(x, y, camW, camH, 14);

    fill("#5d4937");
    textAlign(CENTER);
    textStyle(NORMAL);
    textSize(15);
    text("카메라 권한을 허용해 주세요", x + camW / 2, y + camH / 2);
  }

  noFill();
  stroke(205, 156, 62, 190);
  strokeWeight(2);
  rect(x, y, camW, camH, 14);

  noStroke();
  fill(predictions.length > 0 ? "#9cff63" : "#6b5540");
  circle(x + 70, y + camH + 28, 10);

  fill("#3b2a1f");
  textSize(14);

  if (!opened) {
    text(
      predictions.length > 0 ? "손 인식 중: 좌우로 흔들어 주세요" : "손을 화면 안에 넣어 주세요",
      x + camW / 2,
      y + camH + 33
    );
  } else {
    text(
      predictions.length > 0 ? "손가락 하트: 다시 뽑기" : "손을 화면 안에 넣어 주세요",
      x + camW / 2,
      y + camH + 33
    );
  }
}

function drawHandSkeleton() {
  if (predictions.length === 0 || !video) return;

  let hand = predictions[0];

  let camW = 340;
  let camH = 255;
  let camX = width - camW - 42;
  let camY = 180;

  let pts = hand.landmarks.map(function(p) {
    return {
      x: map(p[0], 0, video.width, camX + camW, camX),
      y: map(p[1], 0, video.height, camY, camY + camH)
    };
  });

  let connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20]
  ];

  stroke(255, 226, 70, 210);
  strokeWeight(2);

  for (let c of connections) {
    line(pts[c[0]].x, pts[c[0]].y, pts[c[1]].x, pts[c[1]].y);
  }

  noStroke();

  for (let i = 0; i < pts.length; i++) {
    fill(180, 255, 95, 155);
    circle(pts[i].x, pts[i].y, 14);

    fill(255, 226, 70, 235);
    circle(pts[i].x, pts[i].y, 6);
  }
}

function checkShake() {
  if (opened || opening || resetAnimation) return;

  if (predictions.length === 0) {
    lastShakeX = null;
    return;
  }

  let x = predictions[0].landmarks[0][0];

  if (lastShakeX === null) {
    lastShakeX = x;
    return;
  }

  if (shakeCooldown > 0) {
    return;
  }

  let move = abs(x - lastShakeX);

  if (move > 42) {
    shakeCount++;
    lastShakeX = x;
    shakeCooldown = 10;

    for (let i = 0; i < 22; i++) {
      particles.push(createParticle(width / 2, height / 2 + 30, false));
    }
  }

  if (shakeCount >= 8) {
    opening = true;
    openProgress = 0;
    particles = [];

    for (let i = 0; i < 360; i++) {
      particles.push(createParticle(width / 2, height / 2 + 20, true));
    }
  }
}

function createParticle(cx, cy, big) {
  let a = random(TWO_PI);
  let spd = big ? random(2.2, 9.2) : random(0.8, 2.8);

  return {
    x: cx + random(-90, 90),
    y: cy + random(-70, 70),
    vx: cos(a) * spd,
    vy: sin(a) * spd,
    size: big ? random(3, 9) : random(2, 5),
    life: big ? random(90, 145) : random(45, 70),
    alpha: big ? random(145, 230) : random(90, 150)
  };
}

// 加权随机抽取模型，并尽量避免连续抽到同一个
function chooseRandomArtifact() {
  let picked = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    let totalWeight = 0;

    for (let item of artifactList) {
      totalWeight += item.weight;
    }

    let r = random(totalWeight);
    let sum = 0;

    for (let item of artifactList) {
      sum += item.weight;

      if (r <= sum) {
        picked = item;
        break;
      }
    }

    if (picked && picked.file !== lastArtifactFile) {
      break;
    }
  }

  selectedArtifact = picked;
  lastArtifactFile = selectedArtifact.file;

  artifact.setAttribute("src", selectedArtifact.file);
  artifact.setAttribute("camera-orbit", "0deg 75deg 3m");
  artifact.setAttribute("field-of-view", "27deg");
  artifact.style.display = "block";
  artifact.style.opacity = "1";
  artifact.style.transform = "scale(1)";
  artifact.style.transformOrigin = "center center";

  console.log("抽中的模型：", selectedArtifact.name);
}

function playOpenParticles() {
  openProgress += 0.022;

  if (openProgress >= 1) {
    opened = true;
    opening = false;

    chooseRandomArtifact();

    theta = 0;
    phi = 75;
    radius = 3;
    targetTheta = 0;
    targetPhi = 75;
    targetRadius = 3;
    lastHandX = null;
    heartHoldFrames = 0;

    artifact.setAttribute("camera-orbit", "0deg 75deg 3m");
  }
}

function updateParticles() {
  noStroke();

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    fill(255, 226, 120, p.alpha);
    circle(p.x, p.y, p.size);

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.976;
    p.vy *= 0.976;

    p.life--;
    p.alpha *= 0.966;

    if (p.life <= 0 || p.alpha < 4) {
      particles.splice(i, 1);
    }
  }
}

function controlModelByHand() {
  if (predictions.length === 0 || !video) return;

  let hand = predictions[0];
  let wrist = hand.landmarks[0];
  let thumb = hand.landmarks[4];
  let pinky = hand.landmarks[20];

  let handX = wrist[0];
  let handY = wrist[1];

  if (lastHandX === null) {
    lastHandX = handX;
  }

  let dx = handX - lastHandX;

  targetTheta += dx * 0.65;
  targetTheta = ((targetTheta % 360) + 360) % 360;

  targetPhi = map(handY, 60, video.height - 60, 35, 115);
  targetPhi = constrain(targetPhi, 35, 115);

  lastHandX = handX;

  let openSize = dist(thumb[0], thumb[1], pinky[0], pinky[1]);

  targetRadius = map(openSize, 45, 230, 7.8, 0.42);
  targetRadius = constrain(targetRadius, 0.42, 7.8);

  theta = lerpAngle(theta, targetTheta, 0.1);
  phi = lerp(phi, targetPhi, 0.09);
  radius = lerp(radius, targetRadius, 0.12);

  artifact.setAttribute(
    "camera-orbit",
    theta + "deg " + phi + "deg " + radius + "m"
  );
}

function drawOpenedOverlay() {
  noStroke();
  fill(255, 248, 232, 188);
  rect(36, height - 260, 545, 220, 24);

  fill("#3b2a1f");
  textAlign(LEFT);
  textStyle(BOLD);
  textSize(18);

  if (selectedArtifact) {
    text("개봉 완료!  " + selectedArtifact.name, 62, height - 218);
  } else {
    text("개봉 완료!", 62, height - 218);
  }

  textStyle(NORMAL);
  textSize(14);
  fill("#5d4937");

  if (selectedArtifact && selectedArtifact.desc) {
    textWrap(WORD);
    text(selectedArtifact.desc, 62, height - 190, 480);
  }

  textSize(13);
  fill("#6b5540");
  text("좌우 이동: 좌우 회전", 62, height - 96);
  text("위아래 이동: 상하 회전", 62, height - 74);
  text("손바닥 펼치기: 확대 / 주먹 쥐기: 축소", 62, height - 52);

  fill("#8a5d20");
  textStyle(BOLD);
  text("손가락 하트: 부드럽게 다시 뽑기", 62, height - 28);

  if (heartHoldFrames > 0) {
    fill("#d7ad52");
    noStroke();
    let w = map(heartHoldFrames, 0, 28, 0, 220);
    rect(62, height - 18, w, 6, 4);
  }
}

// 检测“手指比心”：拇指尖和食指尖靠近
function isFingerHeart(hand) {
  let thumbTip = hand.landmarks[4];
  let indexTip = hand.landmarks[8];

  let d = dist(
    thumbTip[0],
    thumbTip[1],
    indexTip[0],
    indexTip[1]
  );

  return d < 55;
}

function checkHeartReset() {
  if (!opened || resetAnimation || predictions.length === 0) {
    heartHoldFrames = 0;
    return;
  }

  let hand = predictions[0];

  if (isFingerHeart(hand)) {
    heartHoldFrames++;

    if (heartHoldFrames >= 28) {
      startResetAnimation();
      heartHoldFrames = 0;
    }
  } else {
    heartHoldFrames = 0;
  }
}

// 开始播放重新抽取过渡动画
function startResetAnimation() {
  resetAnimation = true;
  resetProgress = 0;
  particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push(createParticle(width / 2, height / 2 + 20, true));
  }
}

// 播放重新抽取过渡动画
function playResetAnimation() {
  resetProgress += 0.018;

  let fade = constrain(1 - resetProgress, 0, 1);
  let scaleValue = constrain(1 - resetProgress * 0.18, 0.82, 1);

  artifact.style.opacity = fade;
  artifact.style.transform = "scale(" + scaleValue + ")";
  artifact.style.transformOrigin = "center center";

  noStroke();
  fill(255, 248, 232, resetProgress * 175);
  rect(0, 0, width, height);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(28);
  text("다시 뽑기 준비 중...", width / 2, height / 2 + 15);

  if (resetProgress >= 1) {
    finishResetBlindBox();
  }
}

// 动画结束后回到盲盒状态
function finishResetBlindBox() {
  resetAnimation = false;
  resetProgress = 0;

  opened = false;
  opening = false;

  shakeCount = 0;
  lastShakeX = null;
  shakeCooldown = 0;
  openProgress = 0;
  particles = [];

  selectedArtifact = null;
  lastHandX = null;
  heartHoldFrames = 0;

  theta = 0;
  phi = 75;
  radius = 3;
  targetTheta = 0;
  targetPhi = 75;
  targetRadius = 3;

  artifact.style.display = "none";
  artifact.style.opacity = "1";
  artifact.style.transform = "scale(1)";
  artifact.setAttribute("camera-orbit", "0deg 75deg 3m");
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}