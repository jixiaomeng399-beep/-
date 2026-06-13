let video;
let handpose;
let artifact;

let predictions = [];
let cameraReady = false;

// =====================================================
// 音频
// =====================================================

let backgroundSound;
let shakeSound;
let winSound;
let loseSound;

// =====================================================
// 游戏参数
// =====================================================

const SHAKE_TARGET = 4;
const CHOICE_HOLD_TARGET = 24;
const RESET_HOLD_TARGET = 28;

// =====================================================
// 文物资料
// =====================================================

const artifactList = [
  {
    name: "후모무정 / 后母戊鼎",
    file: "assets/houmuwuding.glb",
    weight: 1,
    desc:
      "상나라 후기의 대표적인 청동 예기로, 고대 중국 청동기 문화의 권위와 제례적 상징성을 보여주는 문물입니다."
  },
  {
    name: "청화 도자기 인물",
    file: "assets/porcelain.glb",
    weight: 1,
    desc:
      "청화백자의 색채와 장식성을 바탕으로 한 인물형 문물로, 전통 도자기의 장식미와 조형적 아름다움을 보여줍니다."
  },
  {
    name: "도자기 낙타",
    file: "assets/camel.glb",
    weight: 1,
    desc:
      "낙타 형상의 도자기 문물로, 교역로와 이동 문화, 그리고 고대 생활 속 동물 상징을 떠올리게 하는 컬렉션입니다."
  },
  {
    name: "연꽃 캐릭터 문물",
    file: "assets/character.glb",
    weight: 0.45,
    desc:
      "연꽃 이미지를 현대적인 캐릭터 형식으로 재해석한 문물로, 전통 상징과 귀여운 조형미를 결합한 박물관 컬렉션입니다."
  }
];

// =====================================================
// 游戏状态
// =====================================================

let gameStage = "shaking";
let stageFrame = 0;

let selectedArtifact = null;
let lastArtifactFile = null;

// =====================================================
// 摇动识别
// =====================================================

let shakeCount = 0;
let lastShakeX = null;
let shakeCooldown = 0;

// =====================================================
// 三个盲盒
// =====================================================

let roundBoxes = [];

let selectedBoxIndex = 1;
let previousBoxIndex = 1;

let choiceHoldFrames = 0;
let openingProgress = 0;

let selectedRoundItem = null;

// =====================================================
// 粒子
// =====================================================

let particles = [];

// =====================================================
// 3D模型控制
// =====================================================

let theta = 0;
let phi = 75;
let radius = 3;

let targetTheta = 0;
let targetPhi = 75;
let targetRadius = 3;

let lastHandX = null;

// =====================================================
// 文物重力与回弹
// =====================================================

let artifactAnimY = 0;
let artifactVelocityY = 0;
let artifactGravity = 0.68;

let artifactAnimScale = 1;
let artifactSpinVelocity = 0;

let artifactBounceCount = 0;
let artifactAnimSettled = false;

let impactPulse = 0;

// =====================================================
// 空盒纸条
// =====================================================

let dudPaper = null;

// =====================================================
// 重新抽取
// =====================================================

let resetProgress = 0;

let heartHoldFrames = 0;
let resetGestureArmed = false;
let resetReleaseFrames = 0;

let resultGraceFrames = 0;

// =====================================================
// 初始化
// =====================================================

function setup() {
  createCanvas(windowWidth, windowHeight);

  setupAudio();

  artifact = document.getElementById("artifact");

  artifact.setAttribute(
    "camera-orbit",
    "0deg 75deg 3m"
  );

  artifact.style.display = "none";

  video = createCapture(VIDEO, function () {
    console.log("摄像头已经启动");
    cameraReady = true;
  });

  video.size(640, 480);
  video.hide();

  handpose = ml5.handpose(video, modelReady);

  handpose.on("predict", function (results) {
    predictions = results;
  });
}

function modelReady() {
  console.log("ml5 handpose ready");
}

// =====================================================
// 音频
// =====================================================

function setupAudio() {
  backgroundSound = new Audio(
    "assets/audio/background.mp3"
  );

  backgroundSound.loop = true;
  backgroundSound.volume = 0.18;
  backgroundSound.preload = "auto";

  shakeSound = new Audio(
    "assets/audio/shake.mp3"
  );

  shakeSound.volume = 0.6;
  shakeSound.preload = "auto";

  winSound = new Audio(
    "assets/audio/win.mp3"
  );

  winSound.volume = 0.75;
  winSound.preload = "auto";

  loseSound = new Audio(
    "assets/audio/lose.mp3"
  );

  loseSound.volume = 0.82;
  loseSound.preload = "auto";

  startBackgroundMusic();

  window.addEventListener(
    "pointerdown",
    startBackgroundMusic,
    { passive: true }
  );

  window.addEventListener(
    "touchstart",
    startBackgroundMusic,
    { passive: true }
  );

  window.addEventListener(
    "keydown",
    startBackgroundMusic
  );

  document.addEventListener(
    "visibilitychange",
    function () {
      if (!document.hidden) {
        startBackgroundMusic();
      }
    }
  );
}

function startBackgroundMusic() {
  if (
    !backgroundSound ||
    !backgroundSound.paused
  ) {
    return;
  }

  backgroundSound.play().catch(function () {
    console.log("浏览器等待用户点击后播放背景音乐");
  });
}

function playSoundEffect(soundFile, volumeValue) {
  if (!soundFile) {
    return;
  }

  const soundInstance = soundFile.cloneNode(true);

  soundInstance.volume = volumeValue;

  soundInstance.play().catch(function (error) {
    console.warn("音效播放失败：", error);
  });
}

// =====================================================
// 主循环
// =====================================================

function draw() {
  clear();

  stageFrame++;

  if (gameStage === "shaking") {
    drawInterfaceBase();
    drawTitle();
    drawMainBlindBox();
    drawShakeGuide();
    drawProgressPanel();
    drawCameraPanel();
    drawHandSkeleton();
    checkShake();
  } else if (gameStage === "choosing") {
    drawInterfaceBase();
    drawTitle();
    drawChoiceGuide();
    drawChoiceBoxes(0);
    drawCameraPanel();
    drawHandSkeleton();
    updateBoxSelection();
  } else if (gameStage === "opening") {
    drawInterfaceBase();
    drawTitle();
    drawChoiceGuide();
    drawChoiceBoxes(openingProgress);
    drawCameraPanel();
    drawHandSkeleton();
    updateOpeningAnimation();
  } else if (gameStage === "artifactResult") {
    updateArtifactAnimation();
    drawArtifactResultOverlay();
    drawCameraPanel();
    drawHandSkeleton();
    checkHeartReset();
  } else if (gameStage === "dudResult") {
    drawInterfaceBase();
    drawTitle();
    drawDudBackgroundBoxes();
    updateDudPaper();
    drawDudPaper();
    drawDudResultOverlay();
    drawCameraPanel();
    drawHandSkeleton();
    checkHeartReset();
  } else if (gameStage === "resetting") {
    playResetAnimation();
    drawCameraPanel();
    drawHandSkeleton();
  }

  updateParticles();

  if (shakeCooldown > 0) {
    shakeCooldown--;
  }

  if (impactPulse > 0) {
    impactPulse *= 0.88;
  }
}

// =====================================================
// 页面基础布局
// =====================================================

function drawInterfaceBase() {
  noStroke();

  fill(255, 248, 232, 30);

  rect(
    10,
    10,
    width - 20,
    height - 20,
    18
  );

  stroke(86, 62, 42, 55);
  strokeWeight(2);
  noFill();

  rect(
    18,
    18,
    width - 36,
    height - 36,
    18
  );

  noStroke();

  fill(255, 255, 255, 25);

  ellipse(
    getGameCenterX(),
    height / 2 + 38,
    690,
    440
  );

  fill(210, 175, 110, 25);

  ellipse(
    getGameCenterX(),
    height / 2 + 120,
    500,
    185
  );
}

function drawTitle() {
  fill("#2f2318");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(42);

  text(
    "디지털 문물 블라인드 박스",
    width / 2,
    76
  );

  textStyle(NORMAL);
  textSize(16);

  fill("#6b5540");

  text(
    "손동작으로 개봉하는 인터랙티브 박물관 컬렉션",
    width / 2,
    108
  );

  noFill();

  stroke(150, 116, 70, 95);
  strokeWeight(1.5);

  rect(
    width / 2 - 360,
    34,
    720,
    95,
    18
  );
}

// =====================================================
// 摄像头位置
// =====================================================

function getCameraLayout() {
  let camW;
  let camH;

  if (
    width < 1200 ||
    height < 760
  ) {
    camW = 260;
    camH = 195;
  } else {
    camW = 300;
    camH = 225;
  }

  return {
    x: width - camW - 26,
    y: height - camH - 48,
    w: camW,
    h: camH
  };
}

// =====================================================
// 游戏区域
// =====================================================

function getGameBounds() {
  if (width < 900) {
    return {
      left: 20,
      right: width - 20
    };
  }

  const camera = getCameraLayout();

  return {
    left: 270,
    right: camera.x - 48
  };
}

function getGameCenterX() {
  const bounds = getGameBounds();

  return (
    bounds.left +
    bounds.right
  ) / 2;
}

function getBoxPositions() {
  const bounds = getGameBounds();

  const center =
    (
      bounds.left +
      bounds.right
    ) / 2;

  const available =
    bounds.right -
    bounds.left;

  const spacing = constrain(
    available * 0.29,
    145,
    230
  );

  const boxY =
    height / 2 + 45;

  return [
    {
      x: center - spacing,
      y: boxY
    },
    {
      x: center,
      y: boxY
    },
    {
      x: center + spacing,
      y: boxY
    }
  ];
}

function drawPanel(x, y, w, h) {
  noStroke();

  fill(255, 248, 232, 126);

  rect(
    x,
    y,
    w,
    h,
    18
  );

  noFill();

  stroke(139, 104, 58, 110);
  strokeWeight(1.5);

  rect(
    x,
    y,
    w,
    h,
    18
  );
}

// =====================================================
// 初始盲盒
// =====================================================

function drawMainBlindBox() {
  push();

  translate(
    getGameCenterX(),
    height / 2 + 25
  );

  if (
    predictions.length > 0 &&
    shakeCount > 0
  ) {
    rotate(
      sin(frameCount * 0.75) * 0.12
    );
  }

  drawingContext.shadowBlur = 42;
  drawingContext.shadowColor =
    "rgba(88, 58, 28, 0.45)";

  rectMode(CENTER);

  fill(43, 73, 56, 238);
  stroke(204, 164, 88, 235);
  strokeWeight(8);

  rect(
    0,
    0,
    350,
    245,
    32
  );

  noStroke();

  fill(218, 176, 84, 238);

  rect(
    0,
    -49,
    374,
    31,
    16
  );

  fill(255, 232, 150);

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(88);

  text(
    "?",
    0,
    38
  );

  textStyle(NORMAL);
  textSize(13);

  fill(238, 218, 168);

  text(
    "HERITAGE COLLECTION",
    0,
    101
  );

  pop();
}

// =====================================================
// 左侧说明框
// =====================================================

function drawGuideStep(num, title, x, y) {
  noStroke();

  fill("#d7ad52");

  circle(
    x,
    y - 4,
    24
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(13);

  text(
    num,
    x,
    y
  );

  fill("#4c3929");

  textAlign(LEFT);
  textStyle(NORMAL);
  textSize(13);

  text(
    title,
    x + 23,
    y
  );
}

function drawShakeGuide() {
  const x = 28;
  const y = 150;
  const w = 225;
  const h = 240;

  drawPanel(
    x,
    y,
    w,
    h
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(17);

  text(
    "체험 방법",
    x + w / 2,
    y + 34
  );

  drawGuideStep(
    "1",
    "손을 카메라에 넣기",
    x + 42,
    y + 78
  );

  drawGuideStep(
    "2",
    "손을 좌우로 흔들기",
    x + 42,
    y + 126
  );

  drawGuideStep(
    "3",
    "4회 흔들면 상자 등장",
    x + 42,
    y + 174
  );

  textStyle(NORMAL);
  textSize(11);

  fill("#8a6840");

  textAlign(CENTER);

  text(
    "상자 등장 후 하나를 선택하세요",
    x + w / 2,
    y + 215
  );
}

function drawChoiceGuide() {
  const x = 28;
  const y = 150;
  const w = 225;
  const h = 240;

  drawPanel(
    x,
    y,
    w,
    h
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(17);

  text(
    "블라인드 박스 선택",
    x + w / 2,
    y + 34
  );

  drawGuideStep(
    "1",
    "손을 좌우로 이동하기",
    x + 42,
    y + 78
  );

  drawGuideStep(
    "2",
    "빛나는 상자 확인하기",
    x + 42,
    y + 126
  );

  drawGuideStep(
    "3",
    "엄지와 검지를 맞대기",
    x + 42,
    y + 174
  );

  textStyle(NORMAL);
  textSize(11);

  fill("#8a6840");

  textAlign(CENTER);

  text(
    "세 상자 중 하나는 꽝입니다",
    x + w / 2,
    y + 215
  );
}

// =====================================================
// 摇动进度框
// =====================================================

function drawProgressPanel() {
  const x = 28;
  const y = height - 155;
  const w = 225;
  const h = 112;

  drawPanel(
    x,
    y,
    w,
    h
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(14);

  text(
    "개봉 진행도",
    x + w / 2,
    y + 27
  );

  for (
    let i = 0;
    i < SHAKE_TARGET;
    i++
  ) {
    if (i < shakeCount) {
      fill("#d7ad52");
    } else {
      fill(255, 255, 255, 130);
    }

    stroke("#8a6840");
    strokeWeight(1);

    push();

    translate(
      x + 66 + i * 31,
      y + 51
    );

    rotate(PI / 4);
    rectMode(CENTER);

    rect(
      0,
      0,
      14,
      14
    );

    pop();
  }

  noStroke();

  fill("#3b2a1f");
  textSize(22);

  text(
    shakeCount +
    " / " +
    SHAKE_TARGET,
    x + w / 2,
    y + 84
  );

  if (
    predictions.length > 0
  ) {
    textSize(11);
    fill("#8a5d20");

    text(
      "손을 좌우로 흔들어 주세요",
      x + w / 2,
      y + 103
    );
  }
}

// =====================================================
// 右下角摄像头
// =====================================================

function drawCameraPanel() {
  const layout = getCameraLayout();

  const x = layout.x;
  const y = layout.y;
  const camW = layout.w;
  const camH = layout.h;

  drawPanel(
    x - 10,
    y - 36,
    camW + 20,
    camH + 68
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(13);

  text(
    "손 인식 카메라",
    x + camW / 2,
    y - 14
  );

  if (
    cameraReady &&
    video
  ) {
    push();

    translate(
      x + camW,
      y
    );

    scale(-1, 1);

    image(
      video,
      0,
      0,
      camW,
      camH
    );

    pop();
  } else {
    noStroke();

    fill(255, 248, 232, 180);

    rect(
      x,
      y,
      camW,
      camH,
      12
    );

    fill("#5d4937");

    textAlign(CENTER);
    textStyle(NORMAL);
    textSize(13);

    text(
      "카메라 권한을 허용해 주세요",
      x + camW / 2,
      y + camH / 2
    );
  }

  noFill();

  stroke(205, 156, 62, 190);
  strokeWeight(2);

  rect(
    x,
    y,
    camW,
    camH,
    12
  );

  noStroke();

  if (
    predictions.length > 0
  ) {
    fill("#9cff63");
  } else {
    fill("#6b5540");
  }

  circle(
    x + 38,
    y + camH + 22,
    9
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textSize(12);
  textStyle(NORMAL);

  text(
    getCameraStatusText(),
    x + camW / 2,
    y + camH + 27
  );
}

function getCameraStatusText() {
  if (
    predictions.length === 0
  ) {
    return "손을 화면 안에 넣어 주세요";
  }

  if (
    gameStage === "shaking"
  ) {
    return "손 인식 중: 좌우로 4회 흔들기";
  }

  if (
    gameStage === "choosing"
  ) {
    return "좌우 이동 후 손가락을 맞대어 선택";
  }

  if (
    gameStage === "opening"
  ) {
    return "선택한 상자를 개봉하고 있습니다";
  }

  if (
    gameStage === "artifactResult"
  ) {
    if (
      artifactAnimSettled
    ) {
      return "손가락 하트: 다시 뽑기";
    }

    return "문물이 나타나고 있습니다";
  }

  if (
    gameStage === "dudResult"
  ) {
    if (
      dudPaper &&
      dudPaper.settled
    ) {
      return "손가락 하트: 다시 뽑기";
    }

    return "오늘의 운세를 확인하세요";
  }

  return "다시 뽑기를 준비하고 있습니다";
}

// =====================================================
// 手部骨骼
// =====================================================

function drawHandSkeleton() {
  if (
    predictions.length === 0 ||
    !video
  ) {
    return;
  }

  const hand = predictions[0];

  const layout = getCameraLayout();

  const camX = layout.x;
  const camY = layout.y;
  const camW = layout.w;
  const camH = layout.h;

  const pts = hand.landmarks.map(
    function (point) {
      return {
        x: map(
          point[0],
          0,
          video.width,
          camX + camW,
          camX
        ),

        y: map(
          point[1],
          0,
          video.height,
          camY,
          camY + camH
        )
      };
    }
  );

  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],

    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],

    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],

    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],

    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20]
  ];

  stroke(255, 226, 70, 210);
  strokeWeight(2);

  for (
    const connection
    of connections
  ) {
    line(
      pts[connection[0]].x,
      pts[connection[0]].y,
      pts[connection[1]].x,
      pts[connection[1]].y
    );
  }

  noStroke();

  for (
    let i = 0;
    i < pts.length;
    i++
  ) {
    fill(180, 255, 95, 155);

    circle(
      pts[i].x,
      pts[i].y,
      11
    );

    fill(255, 226, 70, 235);

    circle(
      pts[i].x,
      pts[i].y,
      5
    );
  }
}

// =====================================================
// 摇动检测
// =====================================================

function checkShake() {
  if (
    gameStage !== "shaking"
  ) {
    return;
  }

  if (
    predictions.length === 0
  ) {
    lastShakeX = null;
    return;
  }

  const x =
    predictions[0]
      .landmarks[0][0];

  if (
    lastShakeX === null
  ) {
    lastShakeX = x;
    return;
  }

  if (
    shakeCooldown > 0
  ) {
    return;
  }

  const move =
    abs(
      x -
      lastShakeX
    );

  if (
    move > 42
  ) {
    shakeCount++;

    lastShakeX = x;
    shakeCooldown = 10;

    startBackgroundMusic();

    playSoundEffect(
      shakeSound,
      0.6
    );

    for (
      let i = 0;
      i < 22;
      i++
    ) {
      particles.push(
        createParticle(
          getGameCenterX(),
          height / 2 + 30,
          false
        )
      );
    }
  }

  if (
    shakeCount >=
    SHAKE_TARGET
  ) {
    beginBoxSelection();
  }
}

// =====================================================
// 创建三个盲盒
// =====================================================

function beginBoxSelection() {
  gameStage = "choosing";
  stageFrame = 0;

  roundBoxes =
    createRoundBoxes();

  selectedBoxIndex = 1;
  previousBoxIndex = 1;

  choiceHoldFrames = 0;
  openingProgress = 0;

  selectedRoundItem = null;
  lastShakeX = null;

  artifact.style.display = "none";

  const positions =
    getBoxPositions();

  for (
    const position
    of positions
  ) {
    for (
      let i = 0;
      i < 42;
      i++
    ) {
      particles.push(
        createParticle(
          position.x,
          position.y,
          false
        )
      );
    }
  }
}

function createRoundBoxes() {
  const first =
    weightedPickArtifact(
      new Set(),
      true
    );

  const second =
    weightedPickArtifact(
      new Set([
        first.file
      ]),
      false
    );

  const boxes = [
    {
      type: "artifact",
      data: first
    },
    {
      type: "artifact",
      data: second
    },
    {
      type: "dud",
      data: null
    }
  ];

  shuffleArray(boxes);

  return boxes;
}

function weightedPickArtifact(
  excludedFiles,
  avoidLast
) {
  let candidates =
    artifactList.filter(
      function (item) {
        if (
          excludedFiles.has(
            item.file
          )
        ) {
          return false;
        }

        if (
          avoidLast &&
          artifactList.length > 1 &&
          item.file ===
            lastArtifactFile
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    candidates.length === 0
  ) {
    candidates =
      artifactList.filter(
        function (item) {
          return !excludedFiles.has(
            item.file
          );
        }
      );
  }

  const totalWeight =
    candidates.reduce(
      function (sum, item) {
        return (
          sum +
          item.weight
        );
      },
      0
    );

  const randomValue =
    random(totalWeight);

  let running = 0;

  for (
    const item
    of candidates
  ) {
    running += item.weight;

    if (
      randomValue <= running
    ) {
      return item;
    }
  }

  return candidates[
    candidates.length - 1
  ];
}

function shuffleArray(array) {
  for (
    let i =
      array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      floor(
        random(
          i + 1
        )
      );

    const temporary =
      array[i];

    array[i] =
      array[j];

    array[j] =
      temporary;
  }
}

// =====================================================
// 选择盲盒
// =====================================================

function updateBoxSelection() {
  if (
    gameStage !== "choosing"
  ) {
    return;
  }

  if (
    predictions.length === 0 ||
    !video
  ) {
    choiceHoldFrames = 0;
    return;
  }

  const wristX =
    predictions[0]
      .landmarks[0][0];

  const mirroredX =
    video.width -
    wristX;

  let nextIndex;

  if (
    mirroredX <
    video.width * 0.34
  ) {
    nextIndex = 0;
  } else if (
    mirroredX <
    video.width * 0.67
  ) {
    nextIndex = 1;
  } else {
    nextIndex = 2;
  }

  selectedBoxIndex =
    nextIndex;

  if (
    selectedBoxIndex !==
    previousBoxIndex
  ) {
    choiceHoldFrames = 0;

    previousBoxIndex =
      selectedBoxIndex;
  }

  if (
    stageFrame < 18
  ) {
    return;
  }

  if (
    isPinch(
      predictions[0]
    )
  ) {
    choiceHoldFrames++;

    if (
      choiceHoldFrames >=
      CHOICE_HOLD_TARGET
    ) {
      startOpeningSelectedBox();
    }
  } else {
    choiceHoldFrames = 0;
  }
}

// =====================================================
// 绘制三个盲盒
// =====================================================

function drawChoiceBoxes(openAmount) {
  const positions =
    getBoxPositions();

  for (
    let i = 0;
    i < positions.length;
    i++
  ) {
    const isSelected =
      i ===
      selectedBoxIndex;

    let fade = 1;

    if (
      gameStage === "opening" &&
      !isSelected
    ) {
      fade =
        map(
          openAmount,
          0,
          1,
          1,
          0.22
        );
    }

    drawSingleChoiceBox(
      positions[i].x,
      positions[i].y,
      i,
      isSelected,

      gameStage === "opening" &&
      isSelected
        ? openAmount
        : 0,

      fade
    );
  }

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(22);

  if (
    gameStage === "choosing"
  ) {
    text(
      "원하는 상자를 선택하세요",
      getGameCenterX(),
      165
    );
  } else {
    text(
      "선택한 상자를 개봉합니다",
      getGameCenterX(),
      165
    );
  }
}

function drawSingleChoiceBox(
  x,
  y,
  index,
  isSelected,
  openAmount,
  fade
) {
  push();

  translate(
    x,
    y
  );

  if (
    isSelected &&
    gameStage === "choosing"
  ) {
    scale(
      1 +
      sin(
        frameCount * 0.12
      ) * 0.035
    );
  }

  translate(
    0,
    isSelected
      ? -12
      : 0
  );

  drawingContext.shadowBlur =
    isSelected
      ? 36
      : 18;

  drawingContext.shadowColor =
    isSelected
      ? "rgba(226, 180, 76, 0.75)"
      : "rgba(66, 45, 25, 0.32)";

  rectMode(CENTER);

  strokeWeight(
    isSelected
      ? 6
      : 4
  );

  stroke(
    204,
    164,
    88,
    235 * fade
  );

  fill(
    43,
    73,
    56,
    238 * fade
  );

  rect(
    0,
    18,
    164,
    158,
    23
  );

  push();

  translate(
    0,
    -69 -
    openAmount * 108
  );

  rotate(
    -openAmount * 0.45
  );

  stroke(
    204,
    164,
    88,
    235 * fade
  );

  strokeWeight(
    isSelected
      ? 6
      : 4
  );

  fill(
    56,
    91,
    70,
    245 * fade
  );

  rect(
    0,
    0,
    180,
    36,
    13
  );

  pop();

  noStroke();

  fill(
    218,
    176,
    84,
    235 * fade
  );

  rect(
    0,
    -27,
    173,
    21,
    10
  );

  fill(
    255,
    232,
    150,
    255 * fade
  );

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(58);

  text(
    "?",
    0,
    40
  );

  textStyle(NORMAL);
  textSize(11);

  fill(
    238,
    218,
    168,
    255 * fade
  );

  text(
    "HERITAGE",
    0,
    76
  );

  if (
    isSelected &&
    gameStage === "choosing"
  ) {
    noFill();

    stroke(236, 191, 82, 220);
    strokeWeight(3);

    circle(
      0,
      18,
      210 +
      sin(
        frameCount * 0.1
      ) * 8
    );

    noStroke();

    fill("#8a5d20");

    textStyle(BOLD);
    textSize(13);

    text(
      "선택 중",
      0,
      123
    );

    fill(255, 248, 232, 175);

    rect(
      0,
      143,
      138,
      11,
      6
    );

    fill("#d7ad52");

    const progressWidth =
      map(
        choiceHoldFrames,
        0,
        CHOICE_HOLD_TARGET,
        0,
        138
      );

    rectMode(CORNER);

    rect(
      -69,
      137.5,

      constrain(
        progressWidth,
        0,
        138
      ),

      11,
      6
    );

    rectMode(CENTER);
  }

  noStroke();

  fill("#3b2a1f");

  circle(
    -62,
    -88,
    28
  );

  fill("#f4dc9b");

  textStyle(BOLD);
  textSize(14);

  text(
    index + 1,
    -62,
    -83
  );

  pop();
}

// =====================================================
// 打开盲盒
// =====================================================

function startOpeningSelectedBox() {
  if (
    gameStage !== "choosing"
  ) {
    return;
  }

  startBackgroundMusic();

  gameStage = "opening";
  stageFrame = 0;
  openingProgress = 0;

  selectedRoundItem =
    roundBoxes[
      selectedBoxIndex
    ];

  choiceHoldFrames = 0;

  const position =
    getBoxPositions()[
      selectedBoxIndex
    ];

  for (
    let i = 0;
    i < 180;
    i++
  ) {
    particles.push(
      createParticle(
        position.x,
        position.y - 35,
        true
      )
    );
  }
}

function updateOpeningAnimation() {
  if (
    gameStage !== "opening"
  ) {
    return;
  }

  openingProgress += 0.022;

  if (
    openingProgress < 1
  ) {
    return;
  }

  openingProgress = 1;

  if (
    selectedRoundItem.type ===
    "artifact"
  ) {
    startArtifactResult(
      selectedRoundItem.data
    );
  } else {
    startDudResult();
  }
}

// =====================================================
// 文物结果
// =====================================================

function startArtifactResult(item) {
  gameStage =
    "artifactResult";

  stageFrame = 0;

  selectedArtifact = item;
  lastArtifactFile = item.file;

  resultGraceFrames = 0;

  resetGestureArmed = false;
  resetReleaseFrames = 0;
  heartHoldFrames = 0;

  theta = 0;
  phi = 75;
  radius = 3;

  targetTheta = 0;
  targetPhi = 75;
  targetRadius = 3;

  lastHandX = null;

  artifactAnimY = 260;
  artifactVelocityY = -20;
  artifactGravity = 0.68;

  artifactAnimScale = 0.58;
  artifactSpinVelocity = 6.2;

  artifactBounceCount = 0;
  artifactAnimSettled = false;

  impactPulse = 0;

  artifact.setAttribute(
    "src",
    item.file
  );

  artifact.setAttribute(
    "camera-orbit",
    "0deg 75deg 3m"
  );

  artifact.setAttribute(
    "field-of-view",
    "27deg"
  );

  artifact.setAttribute(
    "shadow-intensity",
    "0.9"
  );

  artifact.style.display = "block";
  artifact.style.opacity = "1";

  applyArtifactTransform();

  playSoundEffect(
    winSound,
    0.75
  );

  for (
    let i = 0;
    i < 260;
    i++
  ) {
    particles.push(
      createParticle(
        getGameCenterX(),
        height / 2 + 70,
        true
      )
    );
  }
}

function updateArtifactAnimation() {
  resultGraceFrames++;

  if (
    !artifactAnimSettled
  ) {
    artifactVelocityY +=
      artifactGravity;

    artifactAnimY +=
      artifactVelocityY;

    artifactAnimScale =
      lerp(
        artifactAnimScale,
        1,
        0.055
      );

    theta +=
      artifactSpinVelocity;

    artifactSpinVelocity *=
      0.955;

    if (
      artifactAnimY >= 0
    ) {
      artifactAnimY = 0;
      artifactBounceCount++;
      impactPulse = 1;

      if (
        artifactBounceCount === 1
      ) {
        artifactVelocityY = -4.8;
      } else if (
        artifactBounceCount === 2
      ) {
        artifactVelocityY = -1.8;
      } else {
        artifactVelocityY = 0;
        artifactAnimSettled = true;
        targetTheta = theta;

        artifact.setAttribute(
          "shadow-intensity",
          "0.8"
        );
      }
    }

    artifact.setAttribute(
      "camera-orbit",

      theta +
      "deg " +
      phi +
      "deg " +
      radius +
      "m"
    );

    applyArtifactTransform();
  } else {
    artifactAnimY =
      lerp(
        artifactAnimY,
        0,
        0.2
      );

    artifactAnimScale =
      lerp(
        artifactAnimScale,
        1,
        0.15
      );

    applyArtifactTransform();

    controlModelByHand();
  }
}

function applyArtifactTransform() {
  artifact.style.transform =
    "translate3d(0, " +
    artifactAnimY +
    "px, 0) scale(" +
    artifactAnimScale +
    ")";
}

function controlModelByHand() {
  if (
    !artifactAnimSettled
  ) {
    return;
  }

  if (
    predictions.length === 0 ||
    !video
  ) {
    targetTheta += 0.16;

    theta =
      lerpAngle(
        theta,
        targetTheta,
        0.06
      );

    artifact.setAttribute(
      "camera-orbit",

      theta +
      "deg " +
      phi +
      "deg " +
      radius +
      "m"
    );

    return;
  }

  const hand = predictions[0];

  const wrist =
    hand.landmarks[0];

  const thumb =
    hand.landmarks[4];

  const pinky =
    hand.landmarks[20];

  const handX =
    wrist[0];

  const handY =
    wrist[1];

  if (
    lastHandX === null
  ) {
    lastHandX = handX;
  }

  const differenceX =
    handX -
    lastHandX;

  if (
    abs(
      differenceX
    ) < 0.7
  ) {
    targetTheta += 0.12;
  } else {
    targetTheta +=
      differenceX * 0.65;
  }

  targetTheta =
    (
      (
        targetTheta %
        360
      ) +
      360
    ) %
    360;

  targetPhi =
    constrain(
      map(
        handY,
        60,
        video.height - 60,
        35,
        115
      ),

      35,
      115
    );

  lastHandX = handX;

  const openSize =
    dist(
      thumb[0],
      thumb[1],
      pinky[0],
      pinky[1]
    );

  targetRadius =
    constrain(
      map(
        openSize,
        45,
        230,
        7.8,
        0.42
      ),

      0.42,
      7.8
    );

  theta =
    lerpAngle(
      theta,
      targetTheta,
      0.1
    );

  phi =
    lerp(
      phi,
      targetPhi,
      0.09
    );

  radius =
    lerp(
      radius,
      targetRadius,
      0.12
    );

  artifact.setAttribute(
    "camera-orbit",

    theta +
    "deg " +
    phi +
    "deg " +
    radius +
    "m"
  );
}

// =====================================================
// 缩窄后的左下角文物介绍框
// =====================================================

function drawArtifactResultOverlay() {
  const pulseAlpha =
    impactPulse * 75;

  if (
    pulseAlpha > 1
  ) {
    noStroke();

    fill(
      255,
      231,
      156,
      pulseAlpha
    );

    circle(
      getGameCenterX(),
      height / 2,
      500 +
      impactPulse * 100
    );
  }

  const panelX = 24;
  const panelWidth = 390;
  const panelHeight = 188;

  const panelY =
    height -
    panelHeight -
    28;

  noStroke();

  fill(
    255,
    248,
    232,
    205
  );

  rect(
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    20
  );

  noFill();

  stroke(
    139,
    104,
    58,
    100
  );

  strokeWeight(1.2);

  rect(
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    20
  );

  noStroke();

  fill("#3b2a1f");

  textAlign(LEFT);
  textStyle(BOLD);
  textSize(15);

  if (
    selectedArtifact
  ) {
    text(
      "개봉 완료!  " +
      selectedArtifact.name,

      panelX + 22,
      panelY + 32
    );
  }

  textStyle(NORMAL);
  textSize(12);

  fill("#5d4937");

  if (
    selectedArtifact &&
    selectedArtifact.desc
  ) {
    textWrap(WORD);

    text(
      selectedArtifact.desc,

      panelX + 22,
      panelY + 53,

      panelWidth - 44,
      61
    );
  }

  textSize(11);

  fill("#6b5540");

  text(
    "좌우 이동: 좌우 회전",
    panelX + 22,
    panelY + 123
  );

  text(
    "위아래 이동: 상하 회전",
    panelX + 22,
    panelY + 141
  );

  text(
    "손바닥 펼치기: 확대 / 주먹 쥐기: 축소",
    panelX + 22,
    panelY + 159
  );

  fill("#8a5d20");

  textStyle(BOLD);
  textSize(11);

  if (
    artifactAnimSettled
  ) {
    text(
      "손가락 하트: 다시 뽑기",
      panelX + 22,
      panelY + 178
    );
  } else {
    text(
      "문물이 안정될 때까지 기다려 주세요",
      panelX + 22,
      panelY + 178
    );
  }

  drawResetProgressBar(
    panelX + 190,
    panelY + 171,
    170
  );
}

// =====================================================
// 空盒结果
// =====================================================

function startDudResult() {
  gameStage = "dudResult";
  stageFrame = 0;

  selectedArtifact = null;

  resultGraceFrames = 0;

  resetGestureArmed = false;
  resetReleaseFrames = 0;
  heartHoldFrames = 0;

  artifact.style.display = "none";

  const position =
    getBoxPositions()[
      selectedBoxIndex
    ];

  const targetX =
    getGameCenterX();

  dudPaper = {
    x: position.x,
    y: position.y - 30,

    vx:
      (
        targetX -
        position.x
      ) / 52 +
      random(
        -0.6,
        0.6
      ),

    vy: -17.5,
    gravity: 0.53,

    angle:
      random(
        -0.3,
        0.3
      ),

    angularVelocity:
      random(
        0.13,
        0.19
      ) *
      (
        random() > 0.5
          ? 1
          : -1
      ),

    scale: 0.42,
    bounceCount: 0,

    settled: false,
    soundPlayed: false,

    floorY:
      height / 2 + 55
  };

  for (
    let i = 0;
    i < 110;
    i++
  ) {
    particles.push(
      createParticle(
        position.x,
        position.y - 45,
        true
      )
    );
  }
}

function drawDudBackgroundBoxes() {
  const positions =
    getBoxPositions();

  for (
    let i = 0;
    i < positions.length;
    i++
  ) {
    const isSelected =
      i ===
      selectedBoxIndex;

    drawSingleChoiceBox(
      positions[i].x,
      positions[i].y,
      i,
      isSelected,

      isSelected
        ? 1
        : 0,

      isSelected
        ? 0.82
        : 0.2
    );
  }

  noStroke();

  fill(72, 49, 30, 32);

  rect(
    0,
    130,
    width,
    height - 130
  );
}

function updateDudPaper() {
  resultGraceFrames++;

  if (
    !dudPaper
  ) {
    return;
  }

  if (
    !dudPaper.settled
  ) {
    dudPaper.x +=
      dudPaper.vx;

    dudPaper.y +=
      dudPaper.vy;

    dudPaper.vy +=
      dudPaper.gravity;

    dudPaper.angle +=
      dudPaper.angularVelocity;

    dudPaper.angularVelocity *=
      0.988;

    dudPaper.scale =
      lerp(
        dudPaper.scale,
        0.9,
        0.045
      );

    if (
      dudPaper.y >=
      dudPaper.floorY
    ) {
      dudPaper.y =
        dudPaper.floorY;

      dudPaper.bounceCount++;

      if (
        dudPaper.bounceCount === 1
      ) {
        dudPaper.vy = -5.2;
        dudPaper.vx *= 0.62;

        dudPaper.angularVelocity *=
          -0.36;
      } else if (
        dudPaper.bounceCount === 2
      ) {
        dudPaper.vy = -1.8;
        dudPaper.vx *= 0.45;

        dudPaper.angularVelocity *=
          -0.24;
      } else {
        dudPaper.vy = 0;
        dudPaper.vx = 0;

        dudPaper.settled = true;

        if (
          !dudPaper.soundPlayed
        ) {
          playSoundEffect(
            loseSound,
            0.82
          );

          dudPaper.soundPlayed =
            true;
        }
      }
    }
  } else {
    dudPaper.x =
      lerp(
        dudPaper.x,
        getGameCenterX(),
        0.075
      );

    dudPaper.y =
      lerp(
        dudPaper.y,
        height / 2 + 25,
        0.075
      );

    dudPaper.angle =
      lerp(
        dudPaper.angle,
        0,
        0.1
      );

    dudPaper.scale =
      lerp(
        dudPaper.scale,
        1,
        0.08
      );
  }
}

function drawDudPaper() {
  if (
    !dudPaper
  ) {
    return;
  }

  push();

  translate(
    dudPaper.x,
    dudPaper.y
  );

  rotate(
    dudPaper.angle
  );

  scale(
    dudPaper.scale
  );

  drawingContext.shadowBlur = 32;
  drawingContext.shadowColor =
    "rgba(65, 42, 22, 0.5)";

  rectMode(CENTER);

  stroke(126, 88, 45, 190);
  strokeWeight(2);

  fill(247, 229, 184, 250);

  rect(
    0,
    0,
    176,
    356,
    16
  );

  noStroke();

  fill(225, 196, 131, 240);

  rect(
    0,
    -166,
    192,
    24,
    12
  );

  rect(
    0,
    166,
    192,
    24,
    12
  );

  stroke(143, 103, 55, 105);
  strokeWeight(1);

  line(
    -66,
    -125,
    66,
    -125
  );

  line(
    -66,
    118,
    66,
    118
  );

  noStroke();

  fill("#6b4a2d");

  textAlign(CENTER);
  textStyle(NORMAL);
  textSize(14);

  text(
    "오늘의 뽑기 운세",
    0,
    -138
  );

  fill("#8f2f24");

  textStyle(BOLD);
  textSize(78);

  text(
    "꽝",
    0,
    18
  );

  fill("#5a402b");

  textSize(17);

  text(
    "아쉽지만",
    0,
    78
  );

  text(
    "다시 도전해 보세요",
    0,
    104
  );

  fill("#9a7445");

  circle(
    0,
    138,
    30
  );

  fill(247, 229, 184);

  textSize(13);

  text(
    "運",
    0,
    143
  );

  pop();
}

function drawDudResultOverlay() {
  if (
    !dudPaper ||
    !dudPaper.settled
  ) {
    return;
  }

  noStroke();

  fill(255, 248, 232, 198);

  rect(
    28,
    height - 142,
    350,
    102,
    20
  );

  fill("#3b2a1f");

  textAlign(LEFT);
  textStyle(BOLD);
  textSize(17);

  text(
    "이번 상자는 꽝입니다",
    50,
    height - 105
  );

  fill("#6b5540");

  textStyle(NORMAL);
  textSize(12);

  text(
    "손가락 하트 동작으로 다시 도전할 수 있습니다",
    50,
    height - 78
  );

  fill("#8a5d20");

  textStyle(BOLD);

  text(
    "손가락 하트: 다시 뽑기",
    50,
    height - 53
  );

  drawResetProgressBar(
    50,
    height - 43,
    190
  );
}

// =====================================================
// 捏合与重置
// =====================================================

function isPinch(hand) {
  const thumbTip =
    hand.landmarks[4];

  const indexTip =
    hand.landmarks[8];

  return (
    dist(
      thumbTip[0],
      thumbTip[1],
      indexTip[0],
      indexTip[1]
    ) < 55
  );
}

function checkHeartReset() {
  const resultReady =
    (
      gameStage ===
        "artifactResult" &&
      artifactAnimSettled
    ) ||
    (
      gameStage ===
        "dudResult" &&
      dudPaper &&
      dudPaper.settled
    );

  if (
    !resultReady ||
    resultGraceFrames < 55 ||
    predictions.length === 0
  ) {
    heartHoldFrames = 0;
    return;
  }

  const pinching =
    isPinch(
      predictions[0]
    );

  if (
    !resetGestureArmed
  ) {
    if (
      !pinching
    ) {
      resetReleaseFrames++;

      if (
        resetReleaseFrames >= 12
      ) {
        resetGestureArmed = true;
      }
    } else {
      resetReleaseFrames = 0;
    }

    heartHoldFrames = 0;
    return;
  }

  if (
    pinching
  ) {
    heartHoldFrames++;

    if (
      heartHoldFrames >=
      RESET_HOLD_TARGET
    ) {
      startResetAnimation();
      heartHoldFrames = 0;
    }
  } else {
    heartHoldFrames = 0;
  }
}

function drawResetProgressBar(
  x,
  y,
  maxWidth
) {
  if (
    !resetGestureArmed &&
    resultGraceFrames >= 55
  ) {
    fill(111, 82, 52, 115);

    textStyle(NORMAL);
    textSize(11);
    textAlign(LEFT);

    text(
      "먼저 손가락을 벌려 주세요",
      x,
      y + 2
    );

    return;
  }

  if (
    heartHoldFrames <= 0
  ) {
    return;
  }

  noStroke();

  fill(255, 255, 255, 145);

  rect(
    x,
    y,
    maxWidth,
    7,
    4
  );

  fill("#d7ad52");

  const progressWidth =
    map(
      heartHoldFrames,
      0,
      RESET_HOLD_TARGET,
      0,
      maxWidth
    );

  rect(
    x,
    y,

    constrain(
      progressWidth,
      0,
      maxWidth
    ),

    7,
    4
  );
}

// =====================================================
// 重置动画
// =====================================================

function startResetAnimation() {
  gameStage = "resetting";
  resetProgress = 0;

  particles = [];

  for (
    let i = 0;
    i < 140;
    i++
  ) {
    particles.push(
      createParticle(
        getGameCenterX(),
        height / 2 + 20,
        true
      )
    );
  }
}

function playResetAnimation() {
  resetProgress += 0.018;

  const fade =
    constrain(
      1 - resetProgress,
      0,
      1
    );

  const scaleValue =
    constrain(
      1 -
      resetProgress * 0.18,
      0.82,
      1
    );

  if (
    artifact
  ) {
    artifact.style.opacity =
      fade;

    artifact.style.transform =
      "translate3d(0, " +
      artifactAnimY +
      "px, 0) scale(" +
      scaleValue +
      ")";
  }

  if (
    dudPaper
  ) {
    dudPaper.scale *= 0.985;
  }

  noStroke();

  fill(
    255,
    248,
    232,
    resetProgress * 190
  );

  rect(
    0,
    0,
    width,
    height
  );

  fill("#3b2a1f");

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(28);

  text(
    "다시 뽑기 준비 중...",
    width / 2,
    height / 2 + 15
  );

  if (
    resetProgress >= 1
  ) {
    finishResetBlindBox();
  }
}

function finishResetBlindBox() {
  resetProgress = 0;

  gameStage = "shaking";
  stageFrame = 0;

  shakeCount = 0;
  lastShakeX = null;
  shakeCooldown = 0;

  roundBoxes = [];

  selectedBoxIndex = 1;
  previousBoxIndex = 1;

  choiceHoldFrames = 0;
  openingProgress = 0;

  selectedRoundItem = null;
  selectedArtifact = null;

  heartHoldFrames = 0;

  resetGestureArmed = false;
  resetReleaseFrames = 0;
  resultGraceFrames = 0;

  dudPaper = null;
  particles = [];

  theta = 0;
  phi = 75;
  radius = 3;

  targetTheta = 0;
  targetPhi = 75;
  targetRadius = 3;

  lastHandX = null;

  artifactAnimY = 0;
  artifactVelocityY = 0;
  artifactAnimScale = 1;

  artifactSpinVelocity = 0;
  artifactBounceCount = 0;

  artifactAnimSettled = false;
  impactPulse = 0;

  artifact.style.display = "none";
  artifact.style.opacity = "1";

  artifact.style.transform =
    "translate3d(0, 0, 0) scale(1)";

  artifact.setAttribute(
    "camera-orbit",
    "0deg 75deg 3m"
  );

  artifact.setAttribute(
    "shadow-intensity",
    "0.85"
  );

  startBackgroundMusic();
}

// =====================================================
// 粒子
// =====================================================

function createParticle(
  centerX,
  centerY,
  big
) {
  const angle =
    random(TWO_PI);

  const speed =
    big
      ? random(2.2, 9.2)
      : random(0.8, 2.8);

  return {
    x:
      centerX +
      random(-90, 90),

    y:
      centerY +
      random(-70, 70),

    vx:
      cos(angle) *
      speed,

    vy:
      sin(angle) *
      speed,

    size:
      big
        ? random(3, 9)
        : random(2, 5),

    life:
      big
        ? random(90, 145)
        : random(45, 70),

    alpha:
      big
        ? random(145, 230)
        : random(90, 150)
  };
}

function updateParticles() {
  noStroke();

  for (
    let i =
      particles.length - 1;
    i >= 0;
    i--
  ) {
    const particle =
      particles[i];

    fill(
      255,
      226,
      120,
      particle.alpha
    );

    circle(
      particle.x,
      particle.y,
      particle.size
    );

    particle.x +=
      particle.vx;

    particle.y +=
      particle.vy;

    particle.vx *= 0.976;
    particle.vy *= 0.976;

    particle.life--;
    particle.alpha *= 0.966;

    if (
      particle.life <= 0 ||
      particle.alpha < 4
    ) {
      particles.splice(
        i,
        1
      );
    }
  }
}

// =====================================================
// 工具函数
// =====================================================

function lerpAngle(
  angleA,
  angleB,
  amount
) {
  const difference =
    (
      (
        angleB -
        angleA +
        540
      ) %
      360
    ) -
    180;

  return (
    angleA +
    difference * amount
  );
}

function windowResized() {
  resizeCanvas(
    windowWidth,
    windowHeight
  );

  if (
    dudPaper &&
    dudPaper.settled
  ) {
    dudPaper.x =
      getGameCenterX();

    dudPaper.y =
      height / 2 + 25;

    dudPaper.floorY =
      height / 2 + 55;
  }
}