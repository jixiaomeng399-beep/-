let video, handpose, artifact;
let predictions = [];

let opened = false;
let opening = false;
let holding = false;

let shakeCount = 0;
let lastShakeX = null;
let openProgress = 0;

let particles = [];

let theta = 0;       // 좌우 회전
let phi = 75;        // 상하 회전
let radius = 3;      // 거리
let targetTheta = 0;
let targetPhi = 75;
let targetRadius = 3;
let lastHandX = null;

function setup() {
  createCanvas(windowWidth, windowHeight);

  artifact = document.getElementById("artifact");
  artifact.setAttribute("camera-orbit", "0deg 75deg 3m");

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", results => predictions = results);
}

function modelReady() {
  console.log("ml5 handpose ready");
}

function draw() {
  clear();

  if (!opened) {
    drawInterfaceBase();
    drawTitle();
    drawBoxObject();
    drawLeftGuide();
    drawProgressPanel();
    drawCameraPanel();
    drawHandSkeleton();
    checkShake();
  } else {
    artifact.style.display = "block";
    controlModelByHand();
    drawOpenedOverlay();
    drawCameraPanel();
    drawHandSkeleton();
  }

  updateParticles();

  if (opening) {
    playOpenParticles();
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

  if (holding) {
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

function drawLeftGuide() {
  let x = 44;
  let y = 155;
  let w = 230;
  let h = 260;

  drawPanel(x, y, w, h);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(18);
  text("체험 방법", x + w / 2, y + 38);

  textStyle(NORMAL);
  textSize(14);
  fill("#4c3929");

  text("① 스페이스바를 누르기", x + w / 2, y + 88);
  text("② 손을 좌우로 흔들기", x + w / 2, y + 145);
  text("③ 8회 흔들면 박스 개봉", x + w / 2, y + 202);

  textSize(28);
  text("⌨", x + 44, y + 93);
  text("👋", x + 44, y + 150);
  text("▣", x + 44, y + 207);
}

function drawProgressPanel() {
  let x = 44;
  let y = height - 245;
  let w = 230;
  let h = 135;

  drawPanel(x, y, w, h);

  fill("#3b2a1f");
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(16);
  text("개봉 진행도", x + w / 2, y + 34);

  let p = constrain(shakeCount / 8, 0, 1);

  for (let i = 0; i < 8; i++) {
    if (i < shakeCount) fill("#d7ad52");
    else fill(255, 255, 255, 130);

    stroke("#8a6840");
    strokeWeight(1);
    push();
    translate(x + 42 + i * 22, y + 65);
    rotate(PI / 4);
    rectMode(CENTER);
    rect(0, 0, 12, 12);
    pop();
  }

  noStroke();
  fill("#3b2a1f");
  textSize(28);
  text(shakeCount + " / 8", x + w / 2, y + 106);

  if (holding) {
    textSize(13);
    fill("#8a5d20");
    text("흔드는 중", x + w / 2, y + 126);
  }
}

function drawPanel(x, y, w, h) {
  noStroke();
  fill(255, 248, 232, 98);
  rect(x, y, w, h, 18);

  noFill();
  stroke(139, 104, 58, 100);
  strokeWeight(1.5);
  rect(x, y, w, h, 18);
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

  push();
  translate(x + camW, y);
  scale(-1, 1);
  image(video, 0, 0, camW, camH);
  pop();

  noFill();
  stroke(205, 156, 62, 190);
  strokeWeight(2);
  rect(x, y, camW, camH, 14);

  noStroke();
  fill(predictions.length > 0 ? "#9cff63" : "#6b5540");
  circle(x + 70, y + camH + 28, 10);

  fill("#3b2a1f");
  textSize(14);
  text(predictions.length > 0 ? "손 인식 중" : "손을 화면 안에 넣어 주세요", x + camW / 2, y + camH + 33);
}

function drawHandSkeleton() {
  if (predictions.length === 0) return;

  let hand = predictions[0];

  let camW = 340;
  let camH = 255;
  let camX = width - camW - 42;
  let camY = 180;

  let pts = hand.landmarks.map(p => {
    return {
      x: map(p[0], 0, video.width, camX + camW, camX),
      y: map(p[1], 0, video.height, camY, camY + camH)
    };
  });

  let connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20]
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
  if (!holding || predictions.length === 0 || opening) return;

  let x = predictions[0].landmarks[0][0];

  if (lastShakeX === null) {
    lastShakeX = x;
    return;
  }

  let move = abs(x - lastShakeX);

  if (move > 38) {
    shakeCount++;
    lastShakeX = x;

    for (let i = 0; i < 22; i++) {
      particles.push(createParticle(width / 2, height / 2 + 30, false));
    }
  }

  if (shakeCount >= 8) {
    opening = true;
    holding = false;
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

function playOpenParticles() {
  openProgress += 0.022;

  if (openProgress >= 1) {
    opened = true;
    opening = false;

    artifact.style.display = "block";

    theta = 0;
    phi = 75;
    radius = 3;
    targetTheta = 0;
    targetPhi = 75;
    targetRadius = 3;
    lastHandX = null;

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

    if (p.life <= 0 || p.alpha < 4) particles.splice(i, 1);
  }
}

function controlModelByHand() {
  if (predictions.length === 0) return;

  let hand = predictions[0];
  let wrist = hand.landmarks[0];
  let thumb = hand.landmarks[4];
  let pinky = hand.landmarks[20];

  let handX = wrist[0];
  let handY = wrist[1];

  if (lastHandX === null) lastHandX = handX;

  let dx = handX - lastHandX;

  targetTheta += dx * 0.65;
  targetTheta = ((targetTheta % 360) + 360) % 360;

  targetPhi = map(handY, 60, video.height - 60, 35, 115);
  targetPhi = constrain(targetPhi, 35, 115);

  lastHandX = handX;

  let openSize = dist(thumb[0], thumb[1], pinky[0], pinky[1]);

  // 손바닥 펼치기: 확대 / 주먹 쥐기: 축소
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
  fill(255, 248, 232, 112);
  rect(36, height - 170, 430, 128, 20);

  fill("#3b2a1f");
  textAlign(LEFT);
  textStyle(BOLD);
  textSize(18);
  text("개봉 완료!", 58, height - 132);

  textStyle(NORMAL);
  textSize(14);
  fill("#5d4937");
  text("좌우 이동: 좌우 회전", 58, height - 102);
  text("위아래 이동: 상하 회전", 58, height - 78);
  text("손바닥 펼치기: 확대 / 주먹 쥐기: 축소", 58, height - 54);
}

function keyPressed() {
  if (key === " " && !opened && !opening) {
    holding = true;
    shakeCount = 0;
    lastShakeX = null;
  }
}

function keyReleased() {
  if (key === " ") holding = false;
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}