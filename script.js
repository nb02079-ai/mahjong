/* =========================================================
   SOLO MAHJONG
   1인용 마작 게임
========================================================= */


/* =========================================================
   1. 게임 설정
========================================================= */

const BASE_MAX_TURNS = 30;

let MAX_TURNS = BASE_MAX_TURNS;

const WILD_COUNT = 2;
const DEAD_WALL_SIZE = 5;

/*
    스테이지 모드 설정
*/

const TOTAL_STAGES = 5;

const SHOP_ITEMS = [
    {
        id: "extraTurns",
        name: "턴 수 증가권",
        desc: "다음 스테이지 제한 턴 +10",
        cost: 3,
        maxPurchase: Infinity
    },
    {
        id: "extraDoraReveal",
        name: "시작 도라 추가 공개권",
        desc: "다음 스테이지 시작 시 도라 표시패 1장 추가 공개",
        cost: 4,
        maxPurchase: 3
    },
    {
        id: "multiplierPurchases",
        name: "점수 배율 부적",
        desc: "다음 스테이지 화료 점수 +50%",
        cost: 5,
        maxPurchase: 3
    },
    {
        id: "discardTokens",
        name: "버림패 회수권",
        desc: "다음 스테이지에서 쯔모 대신 버림패 하나를 가져올 수 있음 (1회당 1장)",
        cost: 3,
        maxPurchase: Infinity
    },
    {
        id: "extraRedFive",
        name: "적도라 추가권",
        desc: "다음 스테이지에 적도라 1장 추가 (수패 한 종류당 최대 2장까지)",
        cost: 2,
        maxPurchase: 3
    },
    {
        id: "mulliganTokens",
        name: "시작패 멀리건권",
        desc: "다음 스테이지 시작 시, 첫 타패 전이라면 배패를 다시 뽑을 수 있음",
        cost: 6,
        maxPurchase: 3
    },
    {
        id: "tsumoPeekPurchases",
        name: "쯔모 투시권",
        desc: "다음 스테이지에서 3번의 쯔모 동안 패산에서 2장을 보고 하나를 골라 가져올 수 있음 (1회 구매 = 3회 사용)",
        cost: 7,
        maxPurchase: 2
    }
];


/* =========================================================
   1.5 사운드 이펙트

   외부 음원 파일 없이 Web Audio API로
   짧은 톤을 직접 합성해서 재생한다.
========================================================= */

const SOUND_STORAGE_KEY = "soloMahjongSoundEnabled";

let audioContext = null;

let soundEnabled = true;

try {

    const savedSoundPref =
        localStorage.getItem(SOUND_STORAGE_KEY);

    if (savedSoundPref !== null) {

        soundEnabled = savedSoundPref === "true";

    }

} catch (error) {

    console.error(
        "소리 설정을 불러오지 못했습니다.",
        error
    );

}


function getAudioContext() {

    if (!audioContext) {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {

            return null;

        }

        audioContext =
            new AudioContextClass();

    }

    if (audioContext.state === "suspended") {

        audioContext.resume();

    }

    return audioContext;

}


/*
    playTone(주파수, 길이(초), 파형, 음량, 시작 지연(초))

    짧은 엔벨로프(빠르게 커졌다가 부드럽게 사라짐)를 적용해
    딱딱한 삐- 소리가 아니라 짧은 "톡/딩" 느낌으로 만든다.
*/

function playTone(
    frequency,
    duration,
    waveType,
    volume,
    delay
) {

    if (!soundEnabled) {

        return;

    }

    try {

        const ctx = getAudioContext();

        if (!ctx) {

            return;

        }

        const startTime =
            ctx.currentTime + (delay || 0);

        const oscillator =
            ctx.createOscillator();

        const gainNode =
            ctx.createGain();

        oscillator.type =
            waveType || "sine";

        oscillator.frequency.value =
            frequency;

        gainNode.gain.setValueAtTime(
            0,
            startTime
        );

        gainNode.gain.linearRampToValueAtTime(
            volume,
            startTime + 0.008
        );

        gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + duration
        );

        oscillator.connect(gainNode);

        gainNode.connect(ctx.destination);

        oscillator.start(startTime);

        oscillator.stop(startTime + duration + 0.02);

    } catch (error) {

        console.error(
            "사운드 재생에 실패했습니다.",
            error
        );

    }

}


function playDrawSound() {

    playTone(660, 0.07, "sine", 0.10, 0);

}


function playDiscardSound() {

    playTone(280, 0.07, "triangle", 0.12, 0);

}


function playKanSound() {

    playTone(392, 0.09, "triangle", 0.14, 0);
    playTone(523, 0.12, "triangle", 0.14, 0.07);
    playTone(659, 0.16, "triangle", 0.14, 0.14);

}


function playDoraRevealSound() {

    playTone(880, 0.05, "sine", 0.08, 0);
    playTone(1175, 0.12, "sine", 0.08, 0.05);

}


function playButtonClickSound() {

    playTone(500, 0.045, "square", 0.05, 0);

}


/*
    화료 점수 규모에 따라 팡파르 길이/음이 달라진다.
    (역만은 가장 화려하게, 1판짜리는 짧고 산뜻하게)
*/

function playWinSound(isYakuman, yakumanCount) {

    const baseNotes = isYakuman
        ? [523, 659, 784, 1047, 1319, 1568]
        : [523, 659, 784, 1047];

    let notes = [...baseNotes];


    /*
        더블/트리플 역만이면 마지막 화음을
        추가로 한 번씩 더 얹어서 더 화려하게 만든다.
    */

    const extraFlourishes =
        Math.max(0, (yakumanCount || 0) - 1);

    for (let i = 0; i < extraFlourishes; i++) {

        notes = notes.concat([1568, 1976]);

    }

    notes.forEach((freq, index) => {

        playTone(
            freq,
            0.22,
            "triangle",
            0.14,
            index * 0.09
        );

    });

}


function playGameOverSound() {

    playTone(392, 0.18, "sine", 0.12, 0);
    playTone(330, 0.18, "sine", 0.12, 0.15);
    playTone(262, 0.3, "sine", 0.12, 0.3);

}


function setSoundEnabled(enabled) {

    soundEnabled = enabled;

    try {

        localStorage.setItem(
            SOUND_STORAGE_KEY,
            String(enabled)
        );

    } catch (error) {

        console.error(
            "소리 설정을 저장하지 못했습니다.",
            error
        );

    }

}


/* =========================================================
   2. 마작패 정의
========================================================= */

const TILE_TYPES = [

    // 만수
    "🀇", "🀈", "🀉", "🀊", "🀋",
    "🀌", "🀍", "🀎", "🀏",

    // 통수
    "🀙", "🀚", "🀛", "🀜", "🀝",
    "🀞", "🀟", "🀠", "🀡",

    // 삭수
    "🀐", "🀑", "🀒", "🀓", "🀔",
    "🀕", "🀖", "🀗", "🀘",

    // 자패
    "🀀", "🀁", "🀂", "🀃",
    "🀄", "🀅", "🀆"
];


/*
    자패 인덱스 (TILE_TYPES 기준)

    풍패: 동남서북
    삼원패: 중/발/백
*/

const WINDS = [27, 28, 29, 30];
const DRAGONS = [31, 32, 33];

/*
    녹일색(綠一色)에 쓰이는 패
    2,3,4,6,8삭 + 발(綠)
*/

const GREEN_TILE_INDEXES = [19, 20, 21, 23, 25, 32];


/*
    적도라(빨간 5) 처리용 마커

    실제 마작에서 적도라는 그냥 평범한 5와
    몸통/깡을 만들 때는 완전히 동일하게 취급되고,
    "패에 들어있기만 하면 도라 1개로 쳐준다"는
    보너스만 붙는 특수한 5다.

    구현상으로는 5m/5p/5s 4장 중 1장씩을
    눈에 보이지 않는 마커를 붙인 문자열로 표시해서
    "이 패가 적도라 인스턴스인지"만 구분하고,
    실제 패 종류 비교(정렬/몸통 구성/깡 등)는
    전부 baseTile()로 마커를 벗겨낸 값으로 한다.
*/

const RED_FIVE_MARKER = "\u2009";

function baseTile(tile) {

    if (typeof tile !== "string") {

        return tile;

    }

    return tile.endsWith(RED_FIVE_MARKER)
        ? tile.slice(0, -RED_FIVE_MARKER.length)
        : tile;

}

function isRedFive(tile) {

    return (
        typeof tile === "string" &&
        tile.endsWith(RED_FIVE_MARKER)
    );

}

function markRedFive(tile) {

    return tile + RED_FIVE_MARKER;

}

function tileIndexOf(tile) {

    return TILE_TYPES.indexOf(baseTile(tile));

}


/*
    수패/자패별 CSS 색상 구분용 클래스 이름
*/

function getSuitClass(tile) {

    if (tile === "★") {

        return "";

    }

    const idx = tileIndexOf(tile);

    if (idx < 0) {

        return "";

    }

    if (idx <= 8) return "suit-man";
    if (idx <= 17) return "suit-pin";
    if (idx <= 26) return "suit-sou";
    if (idx <= 30) return "suit-wind";
    if (idx === 31) return "suit-chun";
    if (idx === 32) return "suit-hatsu";
    if (idx === 33) return "suit-haku";

    return "";

}


/* =========================================================
   패 SVG 생성

   유니코드 마작패 글리프는 시스템 폰트에 따라
   가늘고 흐릿하게 보이는 경우가 많아서,
   직접 그린 SVG로 패 얼굴을 렌더링한다.
========================================================= */

const TILE_SVG_VIEWBOX = "0 0 60 80";

const TILE_TOP_BAR_COLOR = "#c9a24b";
const TILE_BG_COLOR = "#f4f1e8";

const MAN_NUMERALS =
    ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const WIND_BADGES =
    ["E", "S", "W", "N"];


/*
   패 상단의 금색 띠 + 모서리 작은 배지
   (모든 패 공통 장식)
*/

function buildTileChrome(badgeText, badgeColor) {

    return (
        `<rect x="0" y="0" width="60" height="9" ` +
        `fill="${TILE_TOP_BAR_COLOR}"/>` +
        (
            badgeText
                ? `<text x="55" y="20" text-anchor="end" ` +
                  `font-family="Arial, sans-serif" font-weight="900" ` +
                  `font-size="13" fill="${badgeColor}">${badgeText}</text>`
                : ""
        )
    );

}


/*
   통수(핀) 원 배치 좌표 (전통적인 배치를 단순화)
*/

const PIN_DOT_LAYOUTS = {
    1: [[30, 42, 14]],
    2: [[30, 26, 8], [30, 58, 8]],
    3: [[18, 24, 7], [30, 42, 7], [42, 60, 7]],
    4: [[20, 26, 7], [40, 26, 7], [20, 58, 7], [40, 58, 7]],
    5: [[20, 26, 7], [40, 26, 7], [30, 42, 7], [20, 58, 7], [40, 58, 7]],
    6: [[20, 22, 6.5], [40, 22, 6.5], [20, 42, 6.5], [40, 42, 6.5], [20, 62, 6.5], [40, 62, 6.5]],
    7: [[20, 18, 6], [40, 18, 6], [20, 36, 6], [40, 36, 6], [20, 54, 6], [40, 54, 6], [30, 68, 6]],
    8: [[20, 18, 6], [40, 18, 6], [20, 34, 6], [40, 34, 6], [20, 50, 6], [40, 50, 6], [20, 66, 6], [40, 66, 6]],
    9: [[17, 20, 5.6], [29, 20, 5.6], [41, 20, 5.6], [17, 42, 5.6], [29, 42, 5.6], [41, 42, 5.6], [17, 64, 5.6], [29, 64, 5.6], [41, 64, 5.6]]
};


/*
   통수 한 개(메달 느낌: 겹 원 + 가운데 점)
*/

function buildPinMedallion(cx, cy, r, color) {

    return (
        `<circle cx="${cx}" cy="${cy}" r="${r}" ` +
        `fill="${color}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.62}" ` +
        `fill="${TILE_BG_COLOR}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.26}" ` +
        `fill="${color}"/>`
    );

}


/*
   1통은 조금 더 화려한 전용 문양으로 그린다
   (겹 원 + 꽃잎처럼 방사형으로 배치한 작은 원)
*/

function buildPinFlagship(color) {

    const cx = 30, cy = 42, r = 15;

    let petals = "";

    for (let i = 0; i < 8; i++) {

        const angle =
            (Math.PI * 2 * i) / 8;

        const px =
            cx + Math.cos(angle) * (r * 0.62);

        const py =
            cy + Math.sin(angle) * (r * 0.62);

        petals +=
            `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" ` +
            `r="2.6" fill="${i % 2 === 0 ? color : TILE_BG_COLOR}" ` +
            `stroke="${color}" stroke-width="0.6"/>`;

    }

    return (
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="${TILE_BG_COLOR}"/>` +
        petals +
        `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`
    );

}


function buildPinDots(count, color) {

    if (count === 1) {

        return buildPinFlagship(color);

    }

    const layout =
        PIN_DOT_LAYOUTS[count] || [];

    return layout
        .map(([cx, cy, r]) =>
            buildPinMedallion(cx, cy, r, color)
        )
        .join("");

}


/*
   삭수 막대 하나 (마디 구분선 + 위쪽 잎사귀 느낌)
*/

function buildSouStick(cx, cy, color) {

    const stickHeight = 13;
    const stickWidth = 5.4;

    const y = cy - stickHeight / 2;
    const x = cx - stickWidth / 2;

    return (
        `<rect x="${x}" y="${y}" ` +
        `width="${stickWidth}" height="${stickHeight}" ` +
        `rx="1.4" fill="${color}"/>` +
        `<line x1="${x + 0.8}" y1="${y + stickHeight * 0.34}" ` +
        `x2="${x + stickWidth - 0.8}" y2="${y + stickHeight * 0.34}" ` +
        `stroke="${TILE_BG_COLOR}" stroke-width="0.8"/>` +
        `<line x1="${x + 0.8}" y1="${y + stickHeight * 0.68}" ` +
        `x2="${x + stickWidth - 0.8}" y2="${y + stickHeight * 0.68}" ` +
        `stroke="${TILE_BG_COLOR}" stroke-width="0.8"/>` +
        `<path d="M${cx} ${y} l-3 -3.5 m3 3.5 l3 -3.5" ` +
        `stroke="${color}" stroke-width="1.3" fill="none" ` +
        `stroke-linecap="round"/>`
    );

}


/*
   1삭은 대나무 대신 전통적으로 새(참새) 문양을 쓰므로
   단순화한 새 실루엣으로 그린다
*/

function buildSouBird(color) {

    return (
        `<ellipse cx="30" cy="50" rx="10" ry="13" fill="${color}"/>` +
        `<circle cx="26" cy="32" r="7" fill="${color}"/>` +
        `<path d="M19 30 L10 27 L19 34 Z" fill="${color}"/>` +
        `<path d="M34 46 Q46 44 44 58 Q38 54 34 52 Z" ` +
        `fill="${color}" opacity="0.85"/>` +
        `<circle cx="28" cy="30" r="1.3" fill="${TILE_BG_COLOR}"/>` +
        `<ellipse cx="30" cy="66" rx="12" ry="3" fill="${color}" opacity="0.5"/>`
    );

}


function buildSouSticks(count, color) {

    if (count === 1) {

        return buildSouBird(color);

    }

    const layout =
        PIN_DOT_LAYOUTS[count] || [];

    return layout
        .map(([cx, cy]) =>
            buildSouStick(cx, cy, color)
        )
        .join("");

}


function buildTileSVG(tile) {

    if (tile === "★") {

        return (
            `<svg viewBox="${TILE_SVG_VIEWBOX}" ` +
            `xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
            buildTileChrome("", "") +
            `<path d="M30 16 L36 33 L54 33 L39 44 L45 61 ` +
            `L30 50 L15 61 L21 44 L6 33 L24 33 Z" ` +
            `fill="#151515"/></svg>`
        );

    }

    const isRed =
        isRedFive(tile);

    const base =
        baseTile(tile);

    const idx =
        TILE_TYPES.indexOf(base);

    if (idx < 0) {

        return null;

    }

    let inner = "";


    /*
        만수
    */

    if (idx <= 8) {

        const number = idx + 1;

        const color =
            isRed ? "#c0392b" : "#1a1a1a";

        inner =
            buildTileChrome(String(number), color) +
            `<text x="30" y="42" text-anchor="middle" ` +
            `font-family="'Noto Serif KR', serif" font-weight="900" ` +
            `font-size="26" fill="${color}">${MAN_NUMERALS[idx]}</text>` +
            `<text x="30" y="67" text-anchor="middle" ` +
            `font-family="'Noto Serif KR', serif" font-weight="700" ` +
            `font-size="20" fill="${color}">萬</text>`;

    }


    /*
        통수
    */

    else if (idx <= 17) {

        const number = idx - 8;

        const color =
            isRed ? "#c0392b" : "#1c6f8c";

        inner =
            buildTileChrome(String(number), color) +
            buildPinDots(number, color);

    }


    /*
        삭수
    */

    else if (idx <= 26) {

        const number = idx - 17;

        const color =
            isRed ? "#c0392b" : "#1f8a4c";

        inner =
            buildTileChrome(String(number), color) +
            buildSouSticks(number, color);

    }


    /*
        풍패
    */

    else if (idx <= 30) {

        const windChars =
            ["東", "南", "西", "北"];

        const ch =
            windChars[idx - 27];

        inner =
            buildTileChrome(WIND_BADGES[idx - 27], "#1a1a1a") +
            `<text x="30" y="55" text-anchor="middle" ` +
            `font-family="'Noto Serif KR', serif" font-weight="900" ` +
            `font-size="34" fill="#1a1a1a">${ch}</text>`;

    }


    /*
        중 (홍중)
    */

    else if (idx === 31) {

        inner =
            buildTileChrome("R", "#c62828") +
            `<text x="30" y="55" text-anchor="middle" ` +
            `font-family="'Noto Serif KR', serif" font-weight="900" ` +
            `font-size="34" fill="#c62828">中</text>`;

    }


    /*
        발
    */

    else if (idx === 32) {

        inner =
            buildTileChrome("G", "#1f8a4c") +
            `<text x="30" y="55" text-anchor="middle" ` +
            `font-family="'Noto Serif KR', serif" font-weight="900" ` +
            `font-size="34" fill="#1f8a4c">發</text>`;

    }


    /*
        백 (백은 전통적으로 빈 패 + 파란 테두리)
    */

    else if (idx === 33) {

        inner =
            buildTileChrome("Wh", "#2f6fb0") +
            `<rect x="12" y="16" width="36" height="52" rx="5" ` +
            `fill="none" stroke="#2f6fb0" stroke-width="4"/>`;

    }

    return (
        `<svg viewBox="${TILE_SVG_VIEWBOX}" ` +
        `xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
        inner +
        `</svg>`
    );

}


/* =========================================================
   3. 게임 상태
========================================================= */

let wall = [];
let deadWall = [];

let playerHand = [];

let drawnTile = null;

let kanMelds = [];

let selectedTileIndex = null;
let drawnTileSelected = false;

let turnCount = 0;

let doraIndicators = [];

let kanCount = 0;

let score = 0;

let gameEnded = false;

/*
    버려진 패 기록 (정렬해서 보여주기 위한 용도)
*/

let discardedTiles = [];

/*
    깡에 포함되어 사라진 적도라 개수
    (치토이츠/국사무쌍 등은 깡이 없을 때만 성립하므로
     이 값은 그런 특수 구조 판정에는 영향을 주지 않는다)
*/

let redFivesInKan = 0;

/*
    애니메이션 트리거 판단용
    (매 렌더링마다 재생되지 않도록,
     "새로 생긴 것"만 구분하기 위한 상태)
*/

let lastDoraRenderCount = 0;
let lastKanMeldRenderCount = 0;
let lastRenderedScore = 0;

/*
    타패 퇴장 애니메이션 재생 시간(ms)
    style.css의 tileExitOut 애니메이션 길이와 맞춰야 한다.
*/

const TILE_EXIT_DURATION = 200;

/*
    타패 애니메이션이 재생되는 동안
    다른 패 선택/중복 타패를 막기 위한 플래그
*/

let isDiscarding = false;

/*
    스테이지 모드 상태

    gameMode: "classic"(무한 모드) | "stage"(스테이지 모드)
    stageUpgrades: 상점에서 산 아이템 개수.
        전부 소모성이라 startGame()이 값을 읽고 나면 즉시 초기화된다.
*/

let gameMode = "classic";
let currentStage = 1;
let coins = 0;
let lastStageCoinsEarned = 0;

/*
    스테이지 모드에서 1~N 스테이지 점수의 총합
    (런이 끝났을 때 최종 점수로 사용)
*/

let stageScoreTotal = 0;

/*
    방금 끝난 스테이지가 화료로 끝났는지(true) /
    턴 소진 등으로 실패했는지(false)
*/

let lastStageResultWasWin = false;

function createEmptyStageUpgrades() {

    return {
        extraTurns: 0,
        extraDoraReveal: 0,
        multiplierPurchases: 0,
        discardTokens: 0,
        extraRedFive: 0,
        mulliganTokens: 0,
        tsumoPeekPurchases: 0
    };

}

let stageUpgrades = createEmptyStageUpgrades();

let stageScoreMultiplier = 1;
let discardRetrieveTokensRemaining = 0;
let initialDoraRevealCount = 1;
let extraRedFiveCount = 0;
let mulliganTokensRemaining = 0;
let tsumoPeekTokensRemaining = 0;

/*
    버림패 회수권/쯔모 투시권은 사서 가지고 있다고
    자동으로 발동되지 않고, 전용 버튼을 눌러
    "활성화"해야 그 순간부터 실제로 쓸 수 있다.
*/

let discardRetrieveArmed = false;
let tsumoPeekArmed = false;

/*
    쯔모 투시권 사용 시, 선택 대기 중인 두 후보 패
    (null이면 평소처럼 한 장만 뽑힌 상태)
*/

let peekCandidates = null;


/*
    타이밍 역 판정용 플래그

    isFirstTurn : 첫 타패 전이면 true (천화 판정용)
    isRinshan   : 방금 뽑은 패가 깡 보충패면 true (영상개화 판정용)
    isHaitei    : 방금 뽑은 패가 패산의 마지막 패면 true (해저로월 판정용)
*/

let isFirstTurn = true;
let isRinshan = false;
let isHaitei = false;


/* =========================================================
   4. DOM
========================================================= */

const playerHandElement =
    document.getElementById("player-hand");

const kanMeldsElement =
    document.getElementById("kan-melds");

const drawnTileElement =
    document.getElementById("drawn-tile");

const discardButton =
    document.getElementById("discard-button");

const manualDrawButton =
    document.getElementById("manual-draw-button");

const kanButton =
    document.getElementById("kan-button");

const winButton =
    document.getElementById("win-button");

const scoreElement =
    document.getElementById("score");

const turnsLeftElement =
    document.getElementById("turns-left");

const wallCountElement =
    document.getElementById("wall-count");

const doraIndicatorsElement =
    document.getElementById("dora-indicators");

const doraCountElement =
    document.getElementById("dora-count");

const gameStatusElement =
    document.getElementById("game-status");

const handCountElement =
    document.getElementById("hand-count");

const resultOverlayElement =
    document.getElementById("result-overlay");

const resultBurstElement =
    document.getElementById("result-burst");

const resultConfettiElement =
    document.getElementById("result-confetti");

const resultTierBadgeElement =
    document.getElementById("result-tier-badge");

const resultTitleElement =
    document.getElementById("result-title");

const resultMessageElement =
    document.getElementById("result-message");

const resultScoreElement =
    document.getElementById("result-score");

const restartButton =
    document.getElementById("restart-button");

const wildCountElement =
    document.getElementById("wild-count");

const discardHistoryButton =
    document.getElementById("discard-history-button");

const mulliganButton =
    document.getElementById("mulligan-button");

const discardRetrieveArmButton =
    document.getElementById("discard-retrieve-arm-button");

const tsumoPeekArmButton =
    document.getElementById("tsumo-peek-arm-button");

const discardHistoryOverlayElement =
    document.getElementById("discard-history-overlay");

const discardHistoryTilesElement =
    document.getElementById("discard-history-tiles");

const discardHistoryCountElement =
    document.getElementById("discard-history-count");

const closeDiscardHistoryButton =
    document.getElementById("close-discard-history");

const yakuGuideButton =
    document.getElementById("yaku-guide-button");

const yakuGuideOverlayElement =
    document.getElementById("yaku-guide-overlay");

const closeYakuGuideButton =
    document.getElementById("close-yaku-guide");

const startScreenOverlayElement =
    document.getElementById("start-screen-overlay");

const startGameButton =
    document.getElementById("start-game-button");

const startHistoryButton =
    document.getElementById("start-history-button");

const scoreHistoryButton =
    document.getElementById("score-history-button");

const soundToggleButton =
    document.getElementById("sound-toggle-button");

const scoreHistoryOverlayElement =
    document.getElementById("score-history-overlay");

const scoreHistoryListElement =
    document.getElementById("score-history-list");

const closeScoreHistoryButton =
    document.getElementById("close-score-history");

const clearScoreHistoryButton =
    document.getElementById("clear-score-history-button");

const startStageModeButton =
    document.getElementById("start-stage-mode-button");

const stageInfoBoxElement =
    document.getElementById("stage-info-box");

const stageValueElement =
    document.getElementById("stage-value");

const coinsInfoBoxElement =
    document.getElementById("coins-info-box");

const coinsValueElement =
    document.getElementById("coins-value");

const shopOverlayElement =
    document.getElementById("shop-overlay");

const shopTitleElement =
    document.getElementById("shop-title");

const shopSummaryElement =
    document.getElementById("shop-summary");

const shopItemsElement =
    document.getElementById("shop-items");

const shopNextStageButton =
    document.getElementById("shop-next-stage-button");

const runSummaryOverlayElement =
    document.getElementById("run-summary-overlay");

const runSummaryTitleElement =
    document.getElementById("run-summary-title");

const runSummaryDetailElement =
    document.getElementById("run-summary-detail");

const runSummaryRestartButton =
    document.getElementById("run-summary-restart-button");


/* =========================================================
   5. 게임 시작
========================================================= */

function startGame() {

    console.log("게임 시작");

    gameEnded = false;

    turnCount = 0;

    playerHand = [];

    drawnTile = null;

    kanMelds = [];

    kanCount = 0;

    score = 0;

    discardedTiles = [];

    redFivesInKan = 0;

    lastDoraRenderCount = 0;

    lastKanMeldRenderCount = 0;

    lastRenderedScore = 0;

    isDiscarding = false;

    doraIndicators = [];

    selectedTileIndex = null;

    drawnTileSelected = false;

    isFirstTurn = true;

    isRinshan = false;

    isHaitei = false;


    /*
        스테이지 모드 업그레이드 적용

        전부 "다음 스테이지 1회용" 소모성이므로
        여기서 값을 읽어 반영한 뒤 즉시 초기화한다.
    */

    MAX_TURNS = BASE_MAX_TURNS;

    initialDoraRevealCount = 1;

    stageScoreMultiplier = 1;

    discardRetrieveTokensRemaining = 0;

    extraRedFiveCount = 0;

    mulliganTokensRemaining = 0;

    tsumoPeekTokensRemaining = 0;

    discardRetrieveArmed = false;

    tsumoPeekArmed = false;

    peekCandidates = null;

    if (gameMode === "stage") {

        MAX_TURNS =
            BASE_MAX_TURNS +
            stageUpgrades.extraTurns * 10;

        initialDoraRevealCount =
            Math.min(
                DEAD_WALL_SIZE,
                1 + stageUpgrades.extraDoraReveal
            );

        stageScoreMultiplier =
            1 + 0.5 * stageUpgrades.multiplierPurchases;

        discardRetrieveTokensRemaining =
            stageUpgrades.discardTokens;

        extraRedFiveCount =
            stageUpgrades.extraRedFive;

        mulliganTokensRemaining =
            stageUpgrades.mulliganTokens;

        tsumoPeekTokensRemaining =
            stageUpgrades.tsumoPeekPurchases * 3;


        stageUpgrades =
            createEmptyStageUpgrades();

    }

    updateStageHud();


    hideResult();

    discardButton.disabled = false;

    initializeTiles();

    shuffle(wall);

    createDeadWall();

    drawInitialHand();

    revealInitialDora();

    renderAll();

    setStatus("게임 시작!");

    /*
        시작 후 첫 쯔모
    */

    setTimeout(() => {

        drawTile();

    }, 300);
}


/* =========================================================
   6. 패 생성
========================================================= */

function initializeTiles() {

    wall = [];

    /*
        각 수패의 "5" 인덱스 (5만/5통/5삭)
        기본으로 4장 중 1장을 적도라로 표시하고,
        "적도라 추가권"을 산 만큼 수패 하나당
        추가로 1장씩(최대 한 수패당 2장) 더 적도라로 표시한다.

        RED_FIVE_INDEXES의 순서대로 하나씩 추가된다
        (만 → 통 → 삭 순).
    */

    const RED_FIVE_INDEXES = [4, 13, 22];

    TILE_TYPES.forEach((tile, tileIndex) => {

        const suitPosition =
            RED_FIVE_INDEXES.indexOf(tileIndex);

        for (let i = 0; i < 4; i++) {

            const isBaseRedFiveSlot =
                suitPosition !== -1 &&
                i === 0;

            const isBonusRedFiveSlot =
                suitPosition !== -1 &&
                i === 1 &&
                suitPosition < extraRedFiveCount;

            wall.push(
                (isBaseRedFiveSlot || isBonusRedFiveSlot)
                    ? markRedFive(tile)
                    : tile
            );

        }

    });


    /*
        와일드패
    */

    for (let i = 0; i < WILD_COUNT; i++) {

        wall.push("★");

    }

}


/* =========================================================
   7. 왕패 분리
========================================================= */

function createDeadWall() {

    deadWall = [];

    /*
        와일드패는 왕패에 들어가지 않음
    */

    const normalTiles =
        wall.filter(tile => tile !== "★");


    for (
        let i = 0;
        i < DEAD_WALL_SIZE;
        i++
    ) {

        const randomIndex =
            Math.floor(
                Math.random() * normalTiles.length
            );

        const tile =
            normalTiles.splice(
                randomIndex,
                1
            )[0];

        deadWall.push(tile);

    }


    /*
        왕패로 사용한 패를
        실제 패산에서 제거
    */

    deadWall.forEach(tile => {

        const index =
            wall.indexOf(tile);

        if (index !== -1) {

            wall.splice(index, 1);

        }

    });

}


/* =========================================================
   8. 초기 손패
========================================================= */

function drawInitialHand() {

    playerHand = [];

    for (let i = 0; i < 13; i++) {

        const tile =
            drawFromWall();

        if (tile) {

            playerHand.push(tile);

        }

    }

    playerHand =
        sortHand(playerHand);

}


/* =========================================================
   9. 도라 공개
========================================================= */

function revealInitialDora() {

    if (deadWall.length === 0) {

        console.error("왕패가 없습니다.");

        return;

    }

    doraIndicators =
        deadWall.slice(
            0,
            initialDoraRevealCount
        );

}


/* =========================================================
   도라 계산
========================================================= */

function getDoraTile(indicator) {

    const index =
        tileIndexOf(indicator);

    if (index === -1) {

        return null;

    }


    /*
        숫자패
    */

    if (index >= 0 && index <= 26) {

        const suitStart =
            Math.floor(index / 9) * 9;

        const number =
            index - suitStart;

        const nextNumber =
            (number + 1) % 9;

        return TILE_TYPES[
            suitStart + nextNumber
        ];

    }


    /*
        자패
    */

    if (index >= 27 && index <= 30) {

        const windIndex =
            index - 27;

        const nextWind =
            (windIndex + 1) % 4;

        return TILE_TYPES[
            27 + nextWind
        ];

    }


    /*
        삼원패
    */

    if (index >= 31 && index <= 33) {

        const dragonIndex =
            index - 31;

        const nextDragon =
            (dragonIndex + 1) % 3;

        return TILE_TYPES[
            31 + nextDragon
        ];

    }


    return null;

}


/* =========================================================
   현재 적용되는 모든 도라
========================================================= */

function getActiveDoraTiles() {

    const doraTiles = [];

    doraIndicators.forEach(indicator => {

        const dora =
            getDoraTile(indicator);

        if (dora) {

            doraTiles.push(dora);

        }

    });

    return doraTiles;

}


/* =========================================================
   10. 패산에서 패 뽑기
========================================================= */

function drawFromWall() {

    if (wall.length === 0) {

        endGame(
            "패산이 모두 소진되었습니다."
        );

        return null;

    }

    return wall.pop();

}


/* =========================================================
   11. 일반 쯔모
========================================================= */

function drawTile() {

    if (gameEnded) {

        return;

    }


    if (drawnTile !== null) {

        return;

    }


    if (peekCandidates) {

        return;

    }


    if (turnCount >= MAX_TURNS) {

        endGame(
            `${MAX_TURNS}회의 쯔모 기회를 모두 사용했습니다.`
        );

        return;

    }


    /*
        쯔모 투시권을 활성화해뒀고 남은 횟수가 있으면
        2장을 뽑아서 선택하게 한다.
    */

    if (
        gameMode === "stage" &&
        tsumoPeekArmed &&
        tsumoPeekTokensRemaining > 0
    ) {

        const first =
            drawFromWall();

        if (!first) {

            return;

        }

        /*
            drawFromWall()을 다시 호출하면 패산이 비어있을 때
            endGame()이 또 호출되어 버리므로,
            여기서는 길이만 확인하고 직접 꺼낸다.
        */

        const second =
            wall.length > 0
                ? wall.pop()
                : null;


        turnCount++;

        selectedTileIndex = null;

        drawnTileSelected = false;

        isRinshan = false;


        if (!second) {

            /*
                패산에 딱 1장만 남아있던 경우
                평범한 쯔모로 처리한다.
            */

            drawnTile = first;

            isHaitei = (wall.length === 0);

            playDrawSound();

            setStatus(
                `${turnCount} / ${MAX_TURNS}번째 쯔모`
            );

            renderAll();

            checkActionsAfterDraw();

            return;

        }

        isHaitei = (wall.length === 0);

        peekCandidates = [first, second];

        setStatus(
            `${turnCount} / ${MAX_TURNS}번째 쯔모 - ` +
            `투시: 둘 중 하나를 선택하세요.`
        );

        renderAll();

        return;

    }


    drawnTile =
        drawFromWall();

    if (!drawnTile) {

        return;

    }

    playDrawSound();


    turnCount++;


    selectedTileIndex = null;

    drawnTileSelected = false;


    /*
        일반 쯔모는 영상개화가 아니고,
        패산이 방금 비었다면 해저로월 대상이 된다.
    */

    isRinshan = false;

    isHaitei = (wall.length === 0);


    setStatus(
        `${turnCount} / ${MAX_TURNS}번째 쯔모`
    );


    renderAll();


    /*
        쯔모 후 액션 검사
    */

    checkActionsAfterDraw();

}


/* =========================================================
   쯔모 투시 - 둘 중 하나 선택
========================================================= */

function choosePeekTile(index) {

    if (!peekCandidates) {

        return;

    }

    if (gameEnded) {

        return;

    }


    const chosen =
        peekCandidates[index];

    const other =
        peekCandidates[1 - index];

    wall.push(other);

    shuffle(wall);

    peekCandidates = null;

    drawnTile = chosen;

    tsumoPeekTokensRemaining--;

    playDrawSound();


    setStatus(
        `쯔모 투시로 패를 선택했습니다. ` +
        `(남은 사용 ${tsumoPeekTokensRemaining}회)`
    );


    renderAll();

    checkActionsAfterDraw();

}


/* =========================================================
   버림패 회수 (버림패 회수권 사용 - 쯔모를 대신함)
========================================================= */

function retrieveFromDiscard(tile) {

    if (gameEnded) {

        return;

    }

    if (drawnTile !== null) {

        return;

    }

    if (discardRetrieveTokensRemaining <= 0) {

        return;

    }

    if (!discardRetrieveArmed) {

        return;

    }

    if (turnCount >= MAX_TURNS) {

        endGame(
            `${MAX_TURNS}회의 쯔모 기회를 모두 사용했습니다.`
        );

        return;

    }


    const index =
        discardedTiles.indexOf(tile);

    if (index === -1) {

        return;

    }


    discardedTiles.splice(index, 1);

    discardRetrieveTokensRemaining--;


    drawnTile = tile;

    turnCount++;

    selectedTileIndex = null;

    drawnTileSelected = false;

    playDrawSound();


    /*
        버림패 회수는 영상개화도, 해저로월도 아니다.
    */

    isRinshan = false;

    isHaitei = false;


    setStatus(
        `버림패에서 ${tile}를 가져왔습니다. ` +
        `(남은 회수권 ${discardRetrieveTokensRemaining}장)`
    );


    hideDiscardHistory();

    renderAll();


    checkActionsAfterDraw();

}


/* =========================================================
   12. 패 선택
========================================================= */

function selectTile(index) {

    if (gameEnded) {

        return;

    }

    if (isDiscarding) {

        return;

    }

    drawnTileSelected = false;

    selectedTileIndex = index;

    renderAll();

}


/* =========================================================
   쯔모패 선택
========================================================= */

function selectDrawnTile() {

    if (gameEnded) {

        return;

    }

    if (isDiscarding) {

        return;

    }

    if (drawnTile === null) {

        return;

    }

    selectedTileIndex = null;

    drawnTileSelected = true;

    renderAll();

    setStatus(
        "쯔모한 패가 선택되었습니다."
    );

}


/* =========================================================
   타패
========================================================= */

function discardTile() {

    if (gameEnded) {

        return;

    }

    if (isDiscarding) {

        return;

    }


    if (drawnTile === null) {

        setStatus(
            "쯔모한 패가 없습니다."
        );

        return;

    }


    /*
        실제 상태 변경 전에,
        지금 화면에 보이는 "버려질 패"의
        DOM 엘리먼트를 먼저 찾아서
        퇴장 애니메이션을 재생한다.
    */

    const isDiscardingDrawnTile =
        drawnTileSelected ||
        selectedTileIndex === null;

    const exitElement =
        isDiscardingDrawnTile
            ? drawnTileElement.firstElementChild
            : playerHandElement.children[
                selectedTileIndex
            ];

    isDiscarding = true;

    playDiscardSound();

    if (exitElement) {

        exitElement.classList.add(
            "tile-exit"
        );

    }


    setTimeout(() => {

        performDiscard();

        isDiscarding = false;

    }, TILE_EXIT_DURATION);

}


/* =========================================================
   타패 (실제 상태 변경)
========================================================= */

function performDiscard() {

    let discardedTile;


    /*
        쯔모패 버리기
    */

    if (drawnTileSelected) {

        discardedTile =
            drawnTile;

    }


    /*
        손패 중 하나 버리기
    */

    else if (
        selectedTileIndex !== null
    ) {

        discardedTile =
            playerHand.splice(
                selectedTileIndex,
                1
            )[0];


        playerHand.push(
            drawnTile
        );

    }


    /*
        기본적으로 쯔모패 버리기
    */

    else {

        discardedTile =
            drawnTile;

    }


    console.log(
        "타패:",
        discardedTile
    );


    /*
        버림패 기록에 추가
    */

    discardedTiles.push(
        discardedTile
    );


    /*
        첫 타패가 발생했으므로
        천화는 더 이상 성립할 수 없다.
    */

    isFirstTurn = false;


    playerHand =
        sortHand(playerHand);


    drawnTile = null;

    selectedTileIndex = null;

    drawnTileSelected = false;


    kanButton.classList.add("hidden");

    winButton.classList.add("hidden");

    removeKanChoices();


    renderAll();


    /*
        마지막 쯔모
    */

    if (turnCount >= MAX_TURNS) {

        endGame(
            `${MAX_TURNS}회의 쯔모 기회를 모두 사용했습니다.`
        );

        return;

    }


    if (shouldPauseForDiscardRetrieve()) {

        setStatus(
            "버림패에서 가져오거나, " +
            "\"쯔모하기\" 버튼을 눌러 진행하세요."
        );

        renderAll();

        return;

    }


    setStatus(
        "다음 패를 뽑습니다."
    );


    setTimeout(() => {

        drawTile();

    }, 300);

}


/* =========================================================
   13. 깡 후보 찾기
========================================================= */

function getKanCandidates() {

    const tiles = [
        ...playerHand
    ];


    if (drawnTile !== null) {

        tiles.push(drawnTile);

    }


    const counts = {};


    tiles.forEach(tile => {

        /*
            ★는 절대로 깡에 사용하지 않음
        */

        if (tile === "★") {

            return;

        }


        const key = baseTile(tile);

        counts[key] =
            (counts[key] || 0) + 1;

    });


    return Object.keys(counts)
        .filter(tile => counts[tile] >= 4)
        .sort(
            (a, b) =>
                getTileOrder(a) -
                getTileOrder(b)
        );

}


/* =========================================================
   14. 깡 선택 UI
========================================================= */

function showKanSelection() {

    const candidates =
        getKanCandidates();


    if (candidates.length === 0) {

        return;

    }


    if (candidates.length === 1) {

        declareKan(
            candidates[0]
        );

        return;

    }


    setStatus(
        "깡할 패를 선택하세요."
    );


    kanButton.classList.add(
        "hidden"
    );


    removeKanChoices();


    candidates.forEach(tile => {

        const button =
            document.createElement("button");


        button.classList.add(
            "action-button",
            "kan-choice-button"
        );


        button.textContent =
            `${tile} 깡`;


        button.addEventListener(
            "click",
            () => {

                removeKanChoices();

                declareKan(tile);

            }
        );


        document
            .querySelector(".action-section")
            .appendChild(button);

    });

}


/* =========================================================
   15. 깡 선언
========================================================= */

function declareKan(kanTile) {

    if (gameEnded) {

        return;

    }


    const candidates =
        getKanCandidates();


    if (
        !candidates.includes(kanTile)
    ) {

        return;

    }


    let handCount = 0;

    let redFiveUsedInThisKan = 0;


    playerHand.forEach(tile => {

        if (baseTile(tile) === kanTile) {

            handCount++;

        }

    });


    /*
        손패에 4장
    */

    if (handCount >= 4) {

        let removed = 0;


        playerHand =
            playerHand.filter(tile => {

                if (
                    baseTile(tile) === kanTile &&
                    removed < 4
                ) {

                    if (isRedFive(tile)) {

                        redFiveUsedInThisKan++;

                    }

                    removed++;

                    return false;

                }

                return true;

            });

    }


    /*
        손패 3장 + 쯔모 1장
    */

    else if (
        handCount === 3 &&
        baseTile(drawnTile) === kanTile
    ) {

        if (isRedFive(drawnTile)) {

            redFiveUsedInThisKan++;

        }

        let removed = 0;


        playerHand =
            playerHand.filter(tile => {

                if (
                    baseTile(tile) === kanTile &&
                    removed < 3
                ) {

                    if (isRedFive(tile)) {

                        redFiveUsedInThisKan++;

                    }

                    removed++;

                    return false;

                }

                return true;

            });


        drawnTile = null;

    }


    else {

        return;

    }


    /*
        이번 깡에 적도라가 포함됐다면
        점수 계산용 전역 카운터에 누적
        (깡 멜드 자체는 대표 패 1종류만 저장하므로
         적도라 여부는 따로 추적해야 한다)
    */

    if (redFiveUsedInThisKan > 0) {

        redFivesInKan += redFiveUsedInThisKan;

    }


    /*
        공개 깡 기록
    */

    kanMelds.push(
        kanTile
    );


    kanCount++;

    playKanSound();


    selectedTileIndex = null;

    drawnTileSelected = false;


    /*
        깡도라
    */

    revealKanDora();


    /*
        보충패

        깡은 일반 쯔모 횟수를
        소비하지 않는다.
    */

    drawnTile =
        drawFromWall();


    if (!drawnTile) {

        return;

    }


    /*
        깡 보충패로 화료하면 영상개화,
        그 보충패가 패산의 마지막 패였다면 해저로월도 겸한다.
    */

    isRinshan = true;

    isHaitei = (wall.length === 0);


    playerHand =
        sortHand(playerHand);


    removeKanChoices();


    kanButton.classList.add(
        "hidden"
    );

    winButton.classList.add(
        "hidden"
    );


    renderAll();


    /*
        보충패 기준으로
        화료 / 추가 깡 검사
    */

    checkActionsAfterDraw();


    setStatus(
        `${kanCount}번째 깡! 보충패를 뽑았습니다.`
    );

}


/* =========================================================
   16. 깡도라 공개
========================================================= */

function revealKanDora() {

    const nextIndex =
        doraIndicators.length;


    if (
        nextIndex >= DEAD_WALL_SIZE
    ) {

        return;

    }


    const nextDora =
        deadWall[nextIndex];


    if (!nextDora) {

        console.error(
            "추가 도라 표시패가 없습니다."
        );

        return;

    }


    doraIndicators.push(
        nextDora
    );

    playDoraRevealSound();

    renderDora();

}


/* =========================================================
   깡 선택 버튼 제거
========================================================= */

function removeKanChoices() {

    document
        .querySelectorAll(
            ".kan-choice-button"
        )
        .forEach(button => {

            button.remove();

        });

}


/* =========================================================
   17. 쯔모 후 액션 검사
========================================================= */

function checkActionsAfterDraw() {

    if (gameEnded) {

        return;

    }


    /*
        기존 버튼 초기화
    */

    winButton.classList.add(
        "hidden"
    );

    kanButton.classList.add(
        "hidden"
    );


    /*
        현재 패
    */

    if (drawnTile !== null) {

        const currentHand = [
            ...playerHand,
            drawnTile
        ];


        /*
            화료
        */

        const winResult =
            getWinResult(currentHand, {
                isFirstTurn,
                isRinshan,
                isHaitei
            });

        if (winResult) {

            winButton.classList.remove(
                "hidden"
            );

        }


        /*
            깡
        */

        if (
            getKanCandidates().length > 0
        ) {

            kanButton.classList.remove(
                "hidden"
            );

        }

    }

}


/* =========================================================
   18. 화료 판정 (역 목록 + 점수까지 반환)
========================================================= */

/*
    getWinResult(hand, flags)

    hand  : 손패 + 쯔모/보충패를 합친 배열
            (길이는 4 - kanMelds.length 몸통 + 머리 2장 기준)
    flags : { isFirstTurn, isRinshan, isHaitei }

    반환값
    - 화료 불가(역이 하나도 없는 경우 포함) → null
    - 화료 가능 → { yakuList, isYakuman, score }
      yakuList: [{ name, han }], han은 숫자 또는 'yakuman'
*/

function getWinResult(hand, flags) {

    const requiredMentsu =
        4 - kanMelds.length;

    const requiredTiles =
        requiredMentsu * 3 + 2;

    if (hand.length !== requiredTiles) {

        return null;

    }

    const doraTiles =
        getActiveDoraTiles();

    let best = null;


    /*
        특수 구조(치토이츠/국사무쌍)는
        깡이 하나도 없을 때만 성립한다.
    */

    if (kanMelds.length === 0) {

        best = mergeBest(
            best,
            checkKokushi(hand, doraTiles)
        );

        best = mergeBest(
            best,
            checkChiitoitsu(hand, doraTiles)
        );

        best = mergeBest(
            best,
            checkChuurenpoutou(hand, doraTiles)
        );

    }


    /*
        일반 구조(몸통×N + 머리) 후보들을
        전부 찾아서 그중 가장 점수가 높은 것을 채택한다.
    */

    const decompositions =
        findAllHandDecompositions(
            hand,
            requiredMentsu
        );

    decompositions.forEach(decomposition => {

        const result =
            evaluateStandardDecomposition(
                decomposition.head,
                decomposition.melds,
                doraTiles,
                flags,
                hand
            );

        best = mergeBest(best, result);

    });


    return best;

}


/*
    두 결과 중 점수가 더 높은 쪽을 선택
*/

function mergeBest(current, candidate) {

    if (!candidate) {

        return current;

    }

    if (!current) {

        return candidate;

    }

    return candidate.score > current.score
        ? candidate
        : current;

}


/*
    역 목록으로부터 최종 점수를 계산

    - 역만이 하나라도 있으면 역만끼리만 합산 (32,000 × 개수)
    - 역만이 없으면 일반 판수를 합산해서
      1판=1,000 / 2판=2,000 / 3판=4,000 / 4판=8,000
      5판 이상은 만관(8,000) 고정
*/

function finalizeResult(yakuList) {

    const yakumanCount =
        yakuList.filter(
            yaku => yaku.han === "yakuman"
        ).length;

    if (yakumanCount > 0) {

        return {
            yakuList,
            isYakuman: true,
            isKazoeYakuman: false,
            yakumanCount,
            score: 32000 * yakumanCount
        };

    }


    let han = 0;

    yakuList.forEach(yaku => {

        if (typeof yaku.han === "number") {

            han += yaku.han;

        }

    });


    /*
        헤아림 역만: 역만급 역이 하나도 없어도
        일반 역만으로 판수가 13판 이상 쌓이면
        역만 1개로 인정한다.
    */

    if (han >= 13) {

        return {
            yakuList,
            isYakuman: true,
            isKazoeYakuman: true,
            yakumanCount: 1,
            han,
            score: 32000
        };

    }


    let score;

    if (han >= 5) {

        score = 8000;

    } else {

        score =
            1000 * Math.pow(2, han - 1);

    }


    return {
        yakuList,
        isYakuman: false,
        isKazoeYakuman: false,
        yakumanCount: 0,
        han,
        score
    };

}


/*
    최소 1역(도라 제외) 필요.
    도라만 있고 다른 역이 없으면 화료로 인정하지 않는다.
*/

function hasRealYaku(yakuList) {

    return yakuList.some(
        yaku =>
            yaku.name !== "도라" &&
            yaku.name !== "적도라"
    );

}


/*
    손패 전체에서 도라 개수를 세어
    역 목록에 추가
*/

function addDoraYaku(yakuList, tiles, doraTiles) {

    let doraCount = 0;

    tiles.forEach(tile => {

        if (
            tile !== "★" &&
            doraTiles.includes(baseTile(tile))
        ) {

            doraCount++;

        }

    });

    if (doraCount > 0) {

        yakuList.push({
            name: "도라",
            han: doraCount
        });

    }

}


/*
    손패(+이번 판에서 깡으로 사라진 패) 중
    적도라 개수를 세어 역 목록에 추가
*/

function addRedFiveYaku(yakuList, tiles) {

    const count =
        tiles.filter(tile => isRedFive(tile)).length +
        redFivesInKan;

    if (count > 0) {

        yakuList.push({
            name: "적도라",
            han: count
        });

    }

}


/* =========================================================
   19. 국사무쌍 (역만)
========================================================= */

function checkKokushi(hand, doraTiles) {

    if (hand.length !== 14) {

        return null;

    }

    const KOKUSHI_INDEXES =
        [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

    const requiredTileSymbols =
        KOKUSHI_INDEXES.map(
            index => TILE_TYPES[index]
        );

    const wildCount =
        hand.filter(tile => tile === "★").length;

    const normalTiles =
        hand.filter(tile => tile !== "★");

    const counts = {};

    normalTiles.forEach(tile => {

        counts[tile] =
            (counts[tile] || 0) + 1;

    });


    /*
        요구되는 13종 외의 패가 하나라도 있으면 실패
    */

    for (const tile in counts) {

        if (
            !requiredTileSymbols.includes(tile)
        ) {

            return null;

        }

    }


    let missingTypes = 0;

    let hasNaturalPair = false;

    requiredTileSymbols.forEach(symbol => {

        const count = counts[symbol] || 0;

        if (count === 0) {

            missingTypes++;

        } else if (count >= 2) {

            hasNaturalPair = true;

        }

    });


    let wildsNeeded = missingTypes;

    if (!hasNaturalPair) {

        wildsNeeded += 1;

    }

    if (wildsNeeded > wildCount) {

        return null;

    }


    const yakuList = [
        { name: "국사무쌍", han: "yakuman" }
    ];

    addDoraYaku(yakuList, hand, doraTiles);

    addRedFiveYaku(yakuList, hand);

    return finalizeResult(yakuList);

}


/* =========================================================
   20. 치토이츠
========================================================= */

function checkChiitoitsu(hand, doraTiles) {

    if (hand.length !== 14) {

        return null;

    }

    let wildCount =
        hand.filter(tile => tile === "★").length;

    const normalTiles =
        hand.filter(tile => tile !== "★");

    const counts = {};

    normalTiles.forEach(tile => {

        const key = baseTile(tile);

        counts[key] =
            (counts[key] || 0) + 1;

    });

    const types = Object.keys(counts);


    /*
        같은 패가 3장 이상이면
        치토이츠로 인정하지 않는다.
    */

    if (types.some(tile => counts[tile] > 2)) {

        return null;

    }


    let pairs =
        types.filter(tile => counts[tile] === 2).length;

    let singles =
        types.filter(tile => counts[tile] === 1).length;

    let distinctTypes = types.length;


    /*
        홀로 남은 패는 ★로 짝을 채운다.
    */

    const wildsForSingles =
        Math.min(wildCount, singles);

    pairs += wildsForSingles;

    singles -= wildsForSingles;

    wildCount -= wildsForSingles;

    if (singles > 0) {

        return null;

    }


    /*
        짝을 다 채우고도 ★가 2장 남았고
        아직 7종류가 안 됐다면 ★★로 새 페어를 만든다.
    */

    if (
        wildCount >= 2 &&
        distinctTypes < 7
    ) {

        pairs += 1;

        distinctTypes += 1;

        wildCount -= 2;

    }


    if (pairs !== 7 || distinctTypes !== 7) {

        return null;

    }


    const yakuList = [
        { name: "치토이츠", han: 2 }
    ];

    addDoraYaku(yakuList, hand, doraTiles);

    addRedFiveYaku(yakuList, hand);

    return finalizeResult(yakuList);

}


/* =========================================================
   21. 구련보등 (역만)
========================================================= */

function checkChuurenpoutou(hand, doraTiles) {

    if (hand.length !== 14) {

        return null;

    }

    const wildCount =
        hand.filter(tile => tile === "★").length;

    const normalTiles =
        hand.filter(tile => tile !== "★");

    if (normalTiles.length === 0) {

        return null;

    }

    const indexes =
        normalTiles.map(tile => tileIndexOf(tile));


    /*
        자패가 섞여 있거나 두 가지 이상의
        수패가 섞여 있으면 성립하지 않는다.
    */

    if (indexes.some(index => index < 0 || index > 26)) {

        return null;

    }

    const suit =
        Math.floor(indexes[0] / 9);

    if (
        !indexes.every(
            index => Math.floor(index / 9) === suit
        )
    ) {

        return null;

    }


    const counts = new Array(9).fill(0);

    indexes.forEach(index => {

        counts[index % 9]++;

    });


    /*
        구련보등의 최소 형태
        1 1 1 2 3 4 5 6 7 8 9 9 9 + 아무 패 1장
    */

    const need =
        [3, 1, 1, 1, 1, 1, 1, 1, 3];

    let deficit = 0;

    for (let n = 0; n < 9; n++) {

        if (counts[n] < need[n]) {

            deficit += need[n] - counts[n];

        }

    }

    if (deficit > wildCount) {

        return null;

    }


    const yakuList = [
        { name: "구련보등", han: "yakuman" }
    ];

    addDoraYaku(yakuList, hand, doraTiles);

    addRedFiveYaku(yakuList, hand);

    return finalizeResult(yakuList);

}


/* =========================================================
   22. 몸통 분해 탐색 (일반 구조)
========================================================= */

/*
    findAllHandDecompositions(hand, requiredMentsu)

    가능한 모든 (머리 + 몸통×requiredMentsu) 조합을
    전부 찾아서 배열로 반환한다.

    ★는 머리/몸통 어디에든 쓰일 수 있으므로
    가능한 모든 배치를 전부 탐색한다.
*/

function findAllHandDecompositions(hand, requiredMentsu) {

    const wildCount =
        hand.filter(tile => tile === "★").length;

    const normalTiles =
        hand.filter(tile => tile !== "★");

    const baseCounts =
        countTiles(normalTiles);

    const results = [];


    /*
        ① 일반패 2장으로 머리
    */

    for (const tile in baseCounts) {

        if (baseCounts[tile] < 2) {
            continue;
        }

        baseCounts[tile] -= 2;

        findMeldCombinations(
            baseCounts,
            wildCount,
            requiredMentsu
        ).forEach(melds => {

            results.push({
                head: { tiles: [tile, tile] },
                melds
            });

        });

        baseCounts[tile] += 2;

    }


    /*
        ② 일반패 1장 + ★ 1장으로 머리
    */

    if (wildCount >= 1) {

        for (const tile in baseCounts) {

            if (baseCounts[tile] < 1) {
                continue;
            }

            baseCounts[tile] -= 1;

            findMeldCombinations(
                baseCounts,
                wildCount - 1,
                requiredMentsu
            ).forEach(melds => {

                results.push({
                    head: { tiles: [tile, "★"] },
                    melds
                });

            });

            baseCounts[tile] += 1;

        }

    }


    /*
        ③ ★★로 머리
    */

    if (wildCount >= 2) {

        findMeldCombinations(
            baseCounts,
            wildCount - 2,
            requiredMentsu
        ).forEach(melds => {

            results.push({
                head: { tiles: ["★", "★"] },
                melds
            });

        });

    }


    return results;

}


/*
    남은 패(counts + wildCount)로
    requiredMentsu개의 몸통을 만드는
    모든 조합을 찾는다.
*/

function findMeldCombinations(
    counts,
    wildCount,
    requiredMentsu
) {

    if (requiredMentsu === 0) {

        const remaining =
            Object.values(counts)
                .reduce((sum, value) => sum + value, 0);

        if (remaining === 0 && wildCount === 0) {

            return [[]];

        }

        return [];

    }


    const tile =
        Object.keys(counts)
            .find(key => counts[key] > 0);


    /*
        일반패가 하나도 없으면
        남은 ★만으로 몸통을 채운다.
    */

    if (!tile) {

        if (wildCount >= requiredMentsu * 3) {

            const melds = [];

            for (let i = 0; i < requiredMentsu; i++) {

                melds.push({
                    type: "triplet",
                    tile: "★",
                    tiles: ["★", "★", "★"]
                });

            }

            return [melds];

        }

        return [];

    }


    let results = [];

    const sameCount = counts[tile];


    /*
        커쯔 (일반패 3 / 2+★ / 1+★★)
    */

    for (let wildUsed = 0; wildUsed <= 2; wildUsed++) {

        const normalNeeded = 3 - wildUsed;

        if (
            sameCount >= normalNeeded &&
            wildCount >= wildUsed
        ) {

            counts[tile] -= normalNeeded;

            const meldTiles =
                Array(normalNeeded).fill(tile)
                    .concat(Array(wildUsed).fill("★"));

            const rest =
                findMeldCombinations(
                    counts,
                    wildCount - wildUsed,
                    requiredMentsu - 1
                );

            rest.forEach(melds => {

                results.push([
                    {
                        type: "triplet",
                        tile,
                        tiles: meldTiles
                    },
                    ...melds
                ]);

            });

            counts[tile] += normalNeeded;

        }

    }


    /*
        슌쯔 (숫자패만 가능)
    */

    const index =
        tileIndexOf(tile);

    if (index >= 0 && index <= 26 && index % 9 <= 6) {

        const tile2 = TILE_TYPES[index + 1];
        const tile3 = TILE_TYPES[index + 2];

        const count2 = counts[tile2] || 0;
        const count3 = counts[tile3] || 0;

        let missing = 0;

        if (count2 === 0) missing++;
        if (count3 === 0) missing++;

        if (wildCount >= missing) {

            counts[tile] -= 1;

            if (count2 > 0) counts[tile2] -= 1;
            if (count3 > 0) counts[tile3] -= 1;

            const meldTiles = [
                tile,
                count2 > 0 ? tile2 : "★",
                count3 > 0 ? tile3 : "★"
            ];

            const rest =
                findMeldCombinations(
                    counts,
                    wildCount - missing,
                    requiredMentsu - 1
                );

            rest.forEach(melds => {

                results.push([
                    {
                        type: "sequence",
                        tile,
                        tiles: meldTiles
                    },
                    ...melds
                ]);

            });

            counts[tile] += 1;

            if (count2 > 0) counts[tile2] += 1;
            if (count3 > 0) counts[tile3] += 1;

        }

    }


    return results;

}


/* =========================================================
   23. 역 판정 (일반 구조: 몸통×N + 머리)
========================================================= */

function evaluateStandardDecomposition(
    head,
    melds,
    doraTiles,
    flags,
    rawHand
) {

    /*
        공개 깡도 몸통이므로 합쳐서 검사한다.
        (1인 플레이라 모든 깡은 항상 암깡 취급)
    */

    const fullMelds =
        melds.concat(
            kanMelds.map(tile => ({
                type: "triplet",
                tile,
                tiles: [tile, tile, tile, tile],
                isKan: true
            }))
        );

    const allTiles = [
        ...head.tiles,
        ...fullMelds.flatMap(meld => meld.tiles)
    ];

    const nonWildTiles =
        allTiles.filter(tile => tile !== "★");

    const yakuList = [];

    const headRealTile =
        head.tiles.find(tile => tile !== "★");

    const headIndex =
        headRealTile !== undefined
            ? tileIndexOf(headRealTile)
            : -1;

    const headIsWild =
        head.tiles.includes("★");

    const allSequences =
        fullMelds.every(meld => meld.type === "sequence");

    const allTripletCount =
        fullMelds.filter(meld => meld.type === "triplet").length;

    const hasHonor =
        nonWildTiles.some(
            tile => tileIndexOf(tile) >= 27
        );

    const onlyHonor =
        nonWildTiles.length > 0 &&
        nonWildTiles.every(
            tile => tileIndexOf(tile) >= 27
        );

    const onlyTerminalNumber =
        nonWildTiles.length > 0 &&
        nonWildTiles.every(tile => {

            const idx = tileIndexOf(tile);

            return idx < 27 && (idx % 9 === 0 || idx % 9 === 8);

        });

    const onlyGreen =
        nonWildTiles.length > 0 &&
        nonWildTiles.every(tile =>
            GREEN_TILE_INDEXES.includes(
                tileIndexOf(tile)
            )
        );


    /*
        자일색 / 청노두 / 녹일색 (역만)
    */

    if (onlyHonor) {

        yakuList.push({ name: "자일색", han: "yakuman" });

    }

    if (onlyTerminalNumber) {

        yakuList.push({ name: "청노두", han: "yakuman" });

    }

    if (onlyGreen) {

        yakuList.push({ name: "녹일색", han: "yakuman" });

    }


    /*
        대삼원 / 소삼원
    */

    const dragonTriplets =
        fullMelds.filter(
            meld =>
                meld.type === "triplet" &&
                DRAGONS.includes(tileIndexOf(meld.tile))
        );

    if (dragonTriplets.length === 3) {

        yakuList.push({ name: "대삼원", han: "yakuman" });

    } else if (
        dragonTriplets.length === 2 &&
        (headIsWild || DRAGONS.includes(headIndex))
    ) {

        yakuList.push({ name: "소삼원", han: 2 });

    }


    /*
        대사희 / 소사희
    */

    const windTriplets =
        fullMelds.filter(
            meld =>
                meld.type === "triplet" &&
                WINDS.includes(tileIndexOf(meld.tile))
        );

    if (windTriplets.length === 4) {

        yakuList.push({ name: "대사희", han: "yakuman" });

    } else if (
        windTriplets.length === 3 &&
        (headIsWild || WINDS.includes(headIndex))
    ) {

        yakuList.push({ name: "소사희", han: "yakuman" });

    }


    /*
        역패 / 풍패 (몸통 하나당 각각 1판)
    */

    fullMelds
        .filter(meld => meld.type === "triplet")
        .forEach(meld => {

            const idx = tileIndexOf(meld.tile);

            if (DRAGONS.includes(idx)) {

                yakuList.push({
                    name: `역패(${meld.tile})`,
                    han: 1
                });

            }

            if (WINDS.includes(idx)) {

                yakuList.push({
                    name: `풍패(${meld.tile})`,
                    han: 1
                });

            }

        });


    /*
        쓰안커 / 산안커
        (모든 몸통이 자력으로 완성한 것이므로 전부 암커 취급)
    */

    if (allTripletCount === 4) {

        yakuList.push({ name: "쓰안커", han: "yakuman" });

    } else if (allTripletCount === 3) {

        yakuList.push({ name: "산안커", han: 2 });

    }


    /*
        산깡즈 / 쓰깡즈
    */

    if (kanMelds.length === 4) {

        yakuList.push({ name: "쓰깡즈", han: "yakuman" });

    } else if (kanMelds.length === 3) {

        yakuList.push({ name: "산깡즈", han: 2 });

    }


    /*
        또이또이
    */

    if (allTripletCount === 4) {

        yakuList.push({ name: "또이또이", han: 2 });

    }


    /*
        핑후
        (깡이 없고, 전부 슌쯔이며, 머리가 자패가 아닐 것.
         대기 모양 조건은 생략)
    */

    if (
        kanMelds.length === 0 &&
        allSequences &&
        !(headIndex >= 27)
    ) {

        yakuList.push({ name: "핑후", han: 1 });

    }


    /*
        탕야오
    */

    const allSimple =
        nonWildTiles.every(tile => {

            const idx = tileIndexOf(tile);

            return idx < 27 && idx % 9 !== 0 && idx % 9 !== 8;

        });

    if (allSimple) {

        yakuList.push({ name: "탕야오", han: 1 });

    }


    /*
        혼일색 / 청일색
    */

    const numberSuits =
        new Set(
            nonWildTiles
                .filter(tile => tileIndexOf(tile) < 27)
                .map(tile => Math.floor(tileIndexOf(tile) / 9))
        );

    if (!onlyHonor && numberSuits.size <= 1) {

        if (hasHonor) {

            yakuList.push({ name: "혼일색", han: 3 });

        } else if (numberSuits.size === 1) {

            yakuList.push({ name: "청일색", han: 6 });

        }

    }


    /*
        삼색동순
    */

    const sequenceStarts = {};

    fullMelds
        .filter(meld => meld.type === "sequence")
        .forEach(meld => {

            const idx = tileIndexOf(meld.tile);

            const suit = Math.floor(idx / 9);

            const num = idx % 9;

            if (!sequenceStarts[num]) {

                sequenceStarts[num] = new Set();

            }

            sequenceStarts[num].add(suit);

        });

    if (
        Object.values(sequenceStarts)
            .some(suitSet => suitSet.size >= 3)
    ) {

        yakuList.push({ name: "삼색동순", han: 2 });

    }


    /*
        일기통관 (한 수패에서 123-456-789)
    */

    const seqBySuit = { 0: new Set(), 1: new Set(), 2: new Set() };

    fullMelds
        .filter(meld => meld.type === "sequence")
        .forEach(meld => {

            const idx = tileIndexOf(meld.tile);

            const suit = Math.floor(idx / 9);

            const num = idx % 9;

            if (seqBySuit[suit]) {

                seqBySuit[suit].add(num);

            }

        });

    if (
        Object.values(seqBySuit)
            .some(set => set.has(0) && set.has(3) && set.has(6))
    ) {

        yakuList.push({ name: "일기통관", han: 2 });

    }


    /*
        찬타 / 준찬타 / 혼노두

        모든 몸통과 머리가 1·9·자패를 포함해야 성립
    */

    const meldsIncludeTerminalOrHonor =
        fullMelds.every(meld => {

            if (meld.type === "triplet") {

                const idx = tileIndexOf(meld.tile);

                return idx >= 27 || idx % 9 === 0 || idx % 9 === 8;

            }

            const idx = tileIndexOf(meld.tile);

            const num = idx % 9;

            return num === 0 || num === 6;

        });

    const headIsTerminalOrHonor =
        headIsWild ||
        headIndex >= 27 ||
        headIndex % 9 === 0 ||
        headIndex % 9 === 8;

    if (meldsIncludeTerminalOrHonor && headIsTerminalOrHonor) {

        if (!hasHonor) {

            yakuList.push({ name: "준찬타", han: 3 });

        } else {

            yakuList.push({ name: "찬타", han: 1 });

        }

        if (allTripletCount === fullMelds.length) {

            yakuList.push({ name: "혼노두", han: 2 });

        }

    }


    /*
        이페코 / 량페코
        (동일한 슌쯔가 손패 안에 중복될 때, 깡 몸통은 제외)
    */

    const seqKeyCount = {};

    melds
        .filter(meld => meld.type === "sequence")
        .forEach(meld => {

            seqKeyCount[meld.tile] =
                (seqKeyCount[meld.tile] || 0) + 1;

        });

    const duplicatePairs =
        Object.values(seqKeyCount)
            .filter(count => count >= 2).length;

    if (
        kanMelds.length === 0 &&
        allSequences &&
        duplicatePairs >= 2
    ) {

        yakuList.push({ name: "량페코", han: 3 });

    } else if (duplicatePairs >= 1) {

        yakuList.push({ name: "이페코", han: 1 });

    }


    /*
        타이밍 역
    */

    if (flags.isFirstTurn) {

        yakuList.push({ name: "천화", han: "yakuman" });

    }

    if (flags.isRinshan) {

        yakuList.push({ name: "영상개화", han: 1 });

    }

    if (flags.isHaitei) {

        yakuList.push({ name: "해저로월", han: 1 });

    }


    /*
        도라
    */

    addDoraYaku(yakuList, allTiles, doraTiles);

    addRedFiveYaku(yakuList, rawHand);


    /*
        도라 외에 역이 하나도 없으면 화료 불가
    */

    if (!hasRealYaku(yakuList)) {

        return null;

    }


    return finalizeResult(yakuList);

}


/* =========================================================
   23. 패 개수 계산
========================================================= */

function countTiles(hand) {

    const counts = {};


    hand.forEach(tile => {

        const key = baseTile(tile);

        counts[key] =
            (counts[key] || 0) + 1;

    });


    return counts;

}


/* =========================================================
   24. 패 정렬
========================================================= */

function sortHand(hand) {

    return [...hand].sort(
        (a, b) => {

            /*
                ★는 가장 오른쪽
            */

            if (
                a === "★" &&
                b !== "★"
            ) {

                return 1;

            }


            if (
                a !== "★" &&
                b === "★"
            ) {

                return -1;

            }


            if (
                a === "★" &&
                b === "★"
            ) {

                return 0;

            }


            return (
                getTileOrder(a) -
                getTileOrder(b)
            );

        }
    );

}


/* =========================================================
   25. 패 정렬 순서
========================================================= */

function getTileOrder(tile) {

    const index =
        tileIndexOf(tile);


    if (index === -1) {

        return 999;

    }


    return index;

}


/* =========================================================
   26. 전체 렌더링
========================================================= */

function renderAll() {

    renderHand();

    renderKanMelds();

    renderDrawnTile();

    renderDora();

    renderInfo();

    updateMulliganButton();

    updateArmButtons();

}


/* =========================================================
   시작패 멀리건
========================================================= */

function updateMulliganButton() {

    const canMulligan =
        gameMode === "stage" &&
        mulliganTokensRemaining > 0 &&
        isFirstTurn &&
        kanMelds.length === 0 &&
        !gameEnded;

    mulliganButton.classList.toggle(
        "hidden",
        !canMulligan
    );

    if (canMulligan) {

        mulliganButton.textContent =
            `다시 뽑기 (${mulliganTokensRemaining})`;

    }

}


/* =========================================================
   버림패 회수권 / 쯔모 투시권 활성화 버튼
========================================================= */

/*
    버림패 회수권이 활성화된 채로 남아있으면
    자동 쯔모를 잠깐 멈추고 플레이어의 선택(회수 또는
    "쯔모하기" 버튼)을 기다린다.

    (활성화만 해두고 자동 쯔모가 그대로 진행돼버리면
     버림패를 클릭할 틈도 없이 다음 패가 뽑혀버리는
     문제가 있었다)
*/

function shouldPauseForDiscardRetrieve() {

    return (
        gameMode === "stage" &&
        discardRetrieveArmed &&
        discardRetrieveTokensRemaining > 0
    );

}


function updateArmButtons() {

    const canArmRetrieve =
        gameMode === "stage" &&
        !gameEnded &&
        discardRetrieveTokensRemaining > 0 &&
        !discardRetrieveArmed;

    discardRetrieveArmButton.classList.toggle(
        "hidden",
        !canArmRetrieve
    );

    if (canArmRetrieve) {

        discardRetrieveArmButton.textContent =
            `버림패 회수권 사용하기 (${discardRetrieveTokensRemaining})`;

    }


    const canArmPeek =
        gameMode === "stage" &&
        !gameEnded &&
        tsumoPeekTokensRemaining > 0 &&
        !tsumoPeekArmed;

    tsumoPeekArmButton.classList.toggle(
        "hidden",
        !canArmPeek
    );

    if (canArmPeek) {

        tsumoPeekArmButton.textContent =
            `쯔모 투시 사용하기 (${tsumoPeekTokensRemaining})`;

    }


    /*
        회수권이 활성화되어 자동 쯔모가 멈춘 상태라면
        "쯔모하기" 버튼으로 직접 진행할 수 있게 한다.
    */

    const showManualDraw =
        drawnTile === null &&
        peekCandidates === null &&
        !gameEnded &&
        shouldPauseForDiscardRetrieve();

    manualDrawButton.classList.toggle(
        "hidden",
        !showManualDraw
    );

}


function performMulligan() {

    if (
        gameMode !== "stage" ||
        mulliganTokensRemaining <= 0 ||
        !isFirstTurn ||
        kanMelds.length > 0 ||
        gameEnded
    ) {

        return;

    }


    /*
        현재 손패 + 쯔모패를 패산에 되돌리고
        다시 섞은 뒤 새로 배패한다.
    */

    wall.push(...playerHand);

    if (drawnTile !== null) {

        wall.push(drawnTile);

    }

    if (peekCandidates) {

        wall.push(...peekCandidates);

        peekCandidates = null;

    }

    playerHand = [];

    drawnTile = null;

    selectedTileIndex = null;

    drawnTileSelected = false;

    shuffle(wall);

    drawInitialHand();

    mulliganTokensRemaining--;

    turnCount = 0;

    isRinshan = false;

    isHaitei = false;


    renderAll();

    if (shouldPauseForDiscardRetrieve()) {

        setStatus(
            `손패를 다시 뽑았습니다. (남은 멀리건 ${mulliganTokensRemaining}회) ` +
            `버림패에서 가져오거나 "쯔모하기"를 눌러 진행하세요.`
        );

        renderAll();

        return;

    }

    setStatus(
        `손패를 다시 뽑았습니다. (남은 멀리건 ${mulliganTokensRemaining}회)`
    );


    setTimeout(() => {

        drawTile();

    }, 300);

}


/* =========================================================
   손패 렌더링
========================================================= */

function renderHand() {

    playerHandElement.innerHTML = "";


    const activeDoraTiles =
        getActiveDoraTiles();


    playerHand.forEach(
        (tile, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.classList.add(
                "tile"
            );


            if (
                index ===
                selectedTileIndex
            ) {

                button.classList.add(
                    "selected"
                );

            }


            if (
                activeDoraTiles.includes(
                    baseTile(tile)
                )
            ) {

                button.classList.add(
                    "dora-highlight"
                );

            }


            const suitClass =
                getSuitClass(tile);

            if (suitClass) {

                button.classList.add(
                    suitClass
                );

            }

            if (isRedFive(tile)) {

                button.classList.add(
                    "tile-red-five"
                );

            }


            button.innerHTML =
                buildTileSVG(tile) ||
                `<span>${tile}</span>`;


            button.addEventListener(
                "click",
                () =>
                    selectTile(index)
            );


            playerHandElement.appendChild(
                button
            );

        }
    );


    handCountElement.textContent =
        playerHand.length;

}


/* =========================================================
   쯔모패 렌더링
========================================================= */

function renderDrawnTile() {

    drawnTileElement.innerHTML = "";


    if (peekCandidates) {

        const hint =
            document.createElement("div");

        hint.classList.add(
            "peek-hint"
        );

        hint.textContent =
            "투시: 하나를 선택하세요";

        drawnTileElement.appendChild(
            hint
        );


        const choicesWrapper =
            document.createElement("div");

        choicesWrapper.classList.add(
            "peek-choices"
        );

        peekCandidates.forEach((candidate, index) => {

            const tile =
                document.createElement("div");

            tile.classList.add(
                "tile",
                "drawn",
                "tile-pop-in",
                "peek-choice"
            );

            const suitClass =
                getSuitClass(candidate);

            if (suitClass) {

                tile.classList.add(
                    suitClass
                );

            }

            if (isRedFive(candidate)) {

                tile.classList.add(
                    "tile-red-five"
                );

            }

            tile.innerHTML =
                buildTileSVG(candidate) ||
                `<span>${candidate}</span>`;

            tile.addEventListener(
                "click",
                () => choosePeekTile(index)
            );

            choicesWrapper.appendChild(
                tile
            );

        });

        drawnTileElement.appendChild(
            choicesWrapper
        );

        return;

    }


    if (!drawnTile) {

        return;

    }


    const tile =
        document.createElement(
            "div"
        );


    tile.classList.add(
        "tile",
        "drawn",
        "tile-pop-in"
    );


    if (
        drawnTileSelected
    ) {

        tile.classList.add(
            "selected"
        );

    }


    const activeDoraTiles =
        getActiveDoraTiles();


    if (
        activeDoraTiles.includes(
            baseTile(drawnTile)
        )
    ) {

        tile.classList.add(
            "dora-highlight"
        );

    }


    const drawnSuitClass =
        getSuitClass(drawnTile);

    if (drawnSuitClass) {

        tile.classList.add(
            drawnSuitClass
        );

    }

    if (isRedFive(drawnTile)) {

        tile.classList.add(
            "tile-red-five"
        );

    }


    tile.innerHTML =
        buildTileSVG(drawnTile) ||
        `<span>${drawnTile}</span>`;


    tile.addEventListener(
        "click",
        selectDrawnTile
    );


    drawnTileElement.appendChild(
        tile
    );

}


/* =========================================================
   도라 렌더링
========================================================= */

function renderDora() {

    doraIndicatorsElement.innerHTML =
        "";


    /*
        새로 공개된 도라 표시패 하나에만
        등장 애니메이션을 적용한다.
    */

    const newlyRevealedIndex =
        doraIndicators.length > lastDoraRenderCount
            ? lastDoraRenderCount
            : -1;


    for (
        let i = 0;
        i < DEAD_WALL_SIZE;
        i++
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.classList.add(
            "tile",
            "dora-tile"
        );


        if (
            i < doraIndicators.length
        ) {

            const indicatorTile =
                doraIndicators[i];

            element.innerHTML =
                buildTileSVG(indicatorTile) ||
                `<span>${indicatorTile}</span>`;

            const indicatorSuitClass =
                getSuitClass(indicatorTile);

            if (indicatorSuitClass) {

                element.classList.add(
                    indicatorSuitClass
                );

            }

            if (isRedFive(indicatorTile)) {

                element.classList.add(
                    "tile-red-five"
                );

            }

            if (i === newlyRevealedIndex) {

                element.classList.add(
                    "tile-pop-in"
                );

            }

        }

        else {

            element.classList.add(
                "hidden-dora"
            );

        }


        doraIndicatorsElement.appendChild(
            element
        );

    }


    lastDoraRenderCount =
        doraIndicators.length;


    doraCountElement.textContent =
        `${doraIndicators.length} / ${DEAD_WALL_SIZE}`;

}


/* =========================================================
   게임 정보 렌더링
========================================================= */

function renderInfo() {

    scoreElement.textContent =
        score.toLocaleString();


    if (score !== lastRenderedScore) {

        scoreElement.classList.remove(
            "score-flash"
        );


        /*
            클래스를 뗐다가 다시 붙일 때
            리플로우를 강제해서
            애니메이션이 매번 새로 재생되게 한다.
        */

        void scoreElement.offsetWidth;


        scoreElement.classList.add(
            "score-flash"
        );


        lastRenderedScore = score;

    }


    turnsLeftElement.textContent =
        Math.max(
            0,
            MAX_TURNS - turnCount
        );


    wallCountElement.textContent =
        wall.length;


    renderWildCount();

}


/* =========================================================
   WILD 카운터 렌더링

   패산에 남은 ★ 개수만큼 밝게,
   이미 빠져나간(뽑혔거나 손패/버림패로 간) ★는
   흐리게 표시한다.
========================================================= */

function renderWildCount() {

    wildCountElement.innerHTML = "";

    const remainingInWall =
        wall.filter(
            tile => tile === "★"
        ).length;

    for (
        let i = 0;
        i < WILD_COUNT;
        i++
    ) {

        const wildElement =
            document.createElement(
                "span"
            );

        wildElement.classList.add(
            "wild-card"
        );

        if (i >= remainingInWall) {

            wildElement.classList.add(
                "used"
            );

        }

        wildElement.textContent = "★";

        wildCountElement.appendChild(
            wildElement
        );

    }

}


/* =========================================================
   상태 메시지
========================================================= */

function setStatus(message) {

    gameStatusElement.textContent =
        message;

}


/* =========================================================
   게임 종료
========================================================= */

function endGame(message) {

    gameEnded = true;

    setStatus(message);

    discardButton.disabled = true;

    kanButton.classList.add(
        "hidden"
    );

    winButton.classList.add(
        "hidden"
    );

    removeKanChoices();

    playGameOverSound();


    recordGameResult("gameover", message);


    lastStageResultWasWin = false;


    showResult(
        "게임 종료",
        message,
        false
    );

}


/* =========================================================
   결과 오버레이
========================================================= */

/*
    화료 결과의 "등급"을 매긴다.

    1: 일반 (1~4판)
    2: 만관급 (5판 이상)
    3: 역만 1개 (헤아림 역만 포함)
    4: 더블역만 (역만 2개 동시 성립)
    5: 트리플역만 이상 (역만 3개 이상)
*/

function getResultTier(winResult) {

    if (!winResult) {

        return 1;

    }

    if (winResult.isYakuman) {

        const count =
            winResult.yakumanCount || 1;

        if (count >= 3) {

            return 5;

        }

        if (count === 2) {

            return 4;

        }

        return 3;

    }

    if (
        typeof winResult.han === "number" &&
        winResult.han >= 5
    ) {

        return 2;

    }

    return 1;

}


function getTierBadgeText(winResult, tier) {

    if (tier === 5) {

        return `트리플역만 이상!! (역만 ${winResult.yakumanCount}개)`;

    }

    if (tier === 4) {

        return "더블역만!!";

    }

    if (tier === 3) {

        return winResult.isKazoeYakuman
            ? "헤아림 역만!!"
            : "역만!!";

    }

    return "";

}


/*
    화면 전체로 퍼지는 색종이 조각을 만든다.
    (tier가 높을수록 개수도, 튀는 범위도 늘어난다)
*/

function spawnConfetti(count) {

    resultConfettiElement.innerHTML =
        "";

    const colors =
        ["#d4af37", "#e0483f", "#eef0ea", "#4a9d6f", "#3d7fbd"];

    for (let i = 0; i < count; i++) {

        const piece =
            document.createElement("span");

        piece.classList.add(
            "confetti-piece"
        );

        const angle =
            Math.random() * Math.PI * 2;

        const distance =
            120 + Math.random() * 180;

        const dx =
            Math.cos(angle) * distance;

        const dy =
            Math.sin(angle) * distance - 60;

        piece.style.setProperty(
            "--dx",
            `${dx}px`
        );

        piece.style.setProperty(
            "--dy",
            `${dy}px`
        );

        piece.style.setProperty(
            "--rot",
            `${Math.random() * 720 - 360}deg`
        );

        piece.style.background =
            colors[
                Math.floor(Math.random() * colors.length)
            ];

        piece.style.animationDelay =
            `${Math.random() * 0.15}s`;

        resultConfettiElement.appendChild(
            piece
        );

    }

}


function showResult(title, message, isWin, winResult) {

    resultTitleElement.textContent =
        title;

    resultTitleElement.classList.toggle(
        "win",
        isWin
    );

    resultTitleElement.classList.toggle(
        "gameover",
        !isWin
    );

    resultMessageElement.textContent =
        message;

    resultScoreElement.textContent =
        `최종 점수: ${score.toLocaleString()}점`;


    const tier =
        isWin ? getResultTier(winResult) : 1;

    resultOverlayElement.classList.remove(
        "result-tier-1",
        "result-tier-2",
        "result-tier-3",
        "result-tier-4",
        "result-tier-5"
    );

    resultOverlayElement.classList.add(
        `result-tier-${tier}`
    );

    const modalElement =
        resultOverlayElement.querySelector(
            ".result-modal"
        );

    modalElement.classList.toggle(
        "shake",
        tier >= 4
    );


    /*
        버스트 플래시는 클래스를 뗐다가
        다시 붙여야 매번 애니메이션이 재생된다.
    */

    resultBurstElement.classList.remove(
        "active"
    );

    void resultBurstElement.offsetWidth;

    if (tier >= 3) {

        resultBurstElement.classList.add(
            "active"
        );

    }


    if (tier >= 3) {

        spawnConfetti(
            tier === 3 ? 24 : (tier === 4 ? 40 : 60)
        );

    } else {

        resultConfettiElement.innerHTML =
            "";

    }


    const badgeText =
        isWin
            ? getTierBadgeText(winResult, tier)
            : "";

    resultTierBadgeElement.textContent =
        badgeText;

    resultTierBadgeElement.classList.toggle(
        "hidden",
        !badgeText
    );


    if (gameMode === "stage") {

        restartButton.textContent =
            (!isWin || currentStage >= TOTAL_STAGES)
                ? "결과 확인"
                : "상점으로";

    } else {

        restartButton.textContent =
            "다시 시작";

    }

    resultOverlayElement.classList.remove(
        "hidden"
    );

}


function hideResult() {

    resultOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   스테이지 모드 HUD
========================================================= */

function updateStageHud() {

    const isStageMode =
        gameMode === "stage";

    stageInfoBoxElement.classList.toggle(
        "hidden",
        !isStageMode
    );

    coinsInfoBoxElement.classList.toggle(
        "hidden",
        !isStageMode
    );

    if (isStageMode) {

        stageValueElement.textContent =
            `${currentStage} / ${TOTAL_STAGES}`;

        coinsValueElement.textContent =
            coins;

    }

}


/* =========================================================
   스테이지 진행 (화료/게임종료 이후)
========================================================= */

function advanceStageFlow() {

    lastStageCoinsEarned =
        Math.floor(score / 1000);

    coins += lastStageCoinsEarned;

    stageScoreTotal += score;

    updateStageHud();


    if (!lastStageResultWasWin) {

        /*
            화료에 실패하면 상점을 거치지 않고
            바로 런이 종료된다.
        */

        showRunSummary(true);

        return;

    }

    if (currentStage >= TOTAL_STAGES) {

        showRunSummary(false);

    } else {

        showShop();

    }

}


/* =========================================================
   상점
========================================================= */

function getShopSummaryText() {

    return (
        `이번 스테이지 점수 ${score.toLocaleString()}점 ` +
        `→ 코인 +${lastStageCoinsEarned}\n` +
        `보유 코인: ${coins}`
    );

}


function showShop() {

    shopTitleElement.textContent =
        `스테이지 ${currentStage} 클리어!`;

    shopSummaryElement.textContent =
        getShopSummaryText();

    renderShopItems();

    shopOverlayElement.classList.remove(
        "hidden"
    );

}


function hideShop() {

    shopOverlayElement.classList.add(
        "hidden"
    );

}


function renderShopItems() {

    shopItemsElement.innerHTML = "";

    SHOP_ITEMS.forEach(item => {

        const owned =
            stageUpgrades[item.id];

        const card =
            document.createElement("div");

        card.classList.add("shop-item");


        const info =
            document.createElement("div");

        info.classList.add("shop-item-info");


        const nameEl =
            document.createElement("div");

        nameEl.classList.add("shop-item-name");

        nameEl.textContent = item.name;


        const descEl =
            document.createElement("div");

        descEl.classList.add("shop-item-desc");

        descEl.textContent = item.desc;


        info.appendChild(nameEl);

        info.appendChild(descEl);


        if (owned > 0) {

            const ownedEl =
                document.createElement("div");

            ownedEl.classList.add(
                "shop-item-owned"
            );

            ownedEl.textContent =
                `이번에 구매: ${owned}개`;

            info.appendChild(ownedEl);

        }


        const buyButton =
            document.createElement("button");

        buyButton.classList.add(
            "shop-buy-button"
        );

        buyButton.textContent =
            `${item.cost} 코인`;

        const atCap =
            owned >= item.maxPurchase;

        buyButton.disabled =
            coins < item.cost || atCap;

        buyButton.addEventListener(
            "click",
            () => buyShopItem(item)
        );


        card.appendChild(info);

        card.appendChild(buyButton);

        shopItemsElement.appendChild(card);

    });

}


function buyShopItem(item) {

    if (coins < item.cost) {

        return;

    }

    if (
        stageUpgrades[item.id] >=
        item.maxPurchase
    ) {

        return;

    }

    coins -= item.cost;

    stageUpgrades[item.id] += 1;

    playButtonClickSound();

    updateStageHud();

    shopSummaryElement.textContent =
        getShopSummaryText();

    renderShopItems();

}


/* =========================================================
   런 결과 (5스테이지 종료)
========================================================= */

/* =========================================================
   런 결과 (5스테이지 종료 또는 화료 실패로 조기 종료)
========================================================= */

function showRunSummary(failedEarly) {

    runSummaryTitleElement.textContent =
        failedEarly
            ? "런 종료"
            : "스테이지 모드 클리어!";

    const reachedStage =
        Math.min(currentStage, TOTAL_STAGES);

    runSummaryDetailElement.textContent =
        (
            failedEarly
                ? `${currentStage}스테이지에서 화료에 실패해 런이 종료됐어요.\n`
                : `${TOTAL_STAGES}스테이지를 모두 마쳤어요!\n`
        ) +
        `최종 점수 (1~${reachedStage}스테이지 합): ` +
        `${stageScoreTotal.toLocaleString()}점\n` +
        `최종 코인: ${coins}`;

    runSummaryOverlayElement.classList.remove(
        "hidden"
    );

}


function hideRunSummary() {

    runSummaryOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   버림패 확인
========================================================= */

function renderDiscardHistory() {

    discardHistoryTilesElement.innerHTML =
        "";

    discardHistoryCountElement.textContent =
        discardedTiles.length;


    /*
        버림패 회수권을 활성화해뒀고 남은 횟수가 있고,
        지금 쯔모를 대신할 수 있는 타이밍이면
        버림패를 클릭해서 가져올 수 있게 한다.
    */

    const canRetrieve =
        gameMode === "stage" &&
        discardRetrieveArmed &&
        discardRetrieveTokensRemaining > 0 &&
        drawnTile === null &&
        !gameEnded;

    discardHistoryTilesElement.classList.toggle(
        "retrieve-mode",
        canRetrieve
    );


    if (discardedTiles.length === 0) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.classList.add(
            "discard-empty"
        );

        emptyMessage.textContent =
            "아직 버린 패가 없습니다.";

        discardHistoryTilesElement.appendChild(
            emptyMessage
        );

        return;

    }


    if (canRetrieve) {

        const hint =
            document.createElement("div");

        hint.classList.add(
            "discard-retrieve-hint"
        );

        hint.textContent =
            `버림패를 클릭하면 쯔모 대신 가져올 수 있어요. ` +
            `(남은 회수권 ${discardRetrieveTokensRemaining}장)`;

        discardHistoryTilesElement.appendChild(
            hint
        );

    }


    /*
        버려진 순서가 아니라
        정렬된 순서로 보여준다.
    */

    const sortedDiscards =
        sortHand(discardedTiles);

    sortedDiscards.forEach(tile => {

        const tileElement =
            document.createElement("div");

        tileElement.classList.add(
            "tile"
        );

        const suitClass =
            getSuitClass(tile);

        if (suitClass) {

            tileElement.classList.add(
                suitClass
            );

        }

        if (isRedFive(tile)) {

            tileElement.classList.add(
                "tile-red-five"
            );

        }

        tileElement.innerHTML =
            buildTileSVG(tile) ||
            `<span>${tile}</span>`;


        if (canRetrieve) {

            tileElement.classList.add(
                "retrievable"
            );

            tileElement.addEventListener(
                "click",
                () => retrieveFromDiscard(tile)
            );

        }

        discardHistoryTilesElement.appendChild(
            tileElement
        );

    });

}


function showDiscardHistory() {

    renderDiscardHistory();

    discardHistoryOverlayElement.classList.remove(
        "hidden"
    );

}


function hideDiscardHistory() {

    discardHistoryOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   역 목록 안내
========================================================= */

function showYakuGuide() {

    yakuGuideOverlayElement.classList.remove(
        "hidden"
    );

}


function hideYakuGuide() {

    yakuGuideOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   시작 화면
========================================================= */

function hideStartScreen() {

    startScreenOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   점수 기록 (localStorage에 저장)
========================================================= */

const SCORE_HISTORY_STORAGE_KEY =
    "soloMahjongScoreHistory";

const MAX_SCORE_HISTORY_ENTRIES = 50;

function sanitizeHistoryEntry(entry) {

    if (
        !entry ||
        typeof entry !== "object"
    ) {

        return null;

    }

    return {
        date:
            typeof entry.date === "string"
                ? entry.date
                : "",
        score:
            typeof entry.score === "number" &&
            !isNaN(entry.score)
                ? entry.score
                : 0,
        result:
            entry.result === "win"
                ? "win"
                : "gameover",
        detail:
            typeof entry.detail === "string"
                ? entry.detail
                : ""
    };

}


function loadScoreHistory() {

    try {

        const raw =
            localStorage.getItem(
                SCORE_HISTORY_STORAGE_KEY
            );

        if (!raw) {

            return [];

        }

        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {

            return [];

        }

        /*
            형식이 깨졌거나 예상과 다른 값이 섞여 있어도
            안전한 기본값으로 정규화해서 반환한다.
        */

        return parsed
            .map(sanitizeHistoryEntry)
            .filter(entry => entry !== null);

    } catch (error) {

        console.error(
            "점수 기록을 불러오지 못했습니다.",
            error
        );

        return [];

    }

}


function saveScoreHistoryEntry(entry) {

    try {

        const history =
            loadScoreHistory();

        history.unshift(entry);

        if (
            history.length >
            MAX_SCORE_HISTORY_ENTRIES
        ) {

            history.length =
                MAX_SCORE_HISTORY_ENTRIES;

        }

        localStorage.setItem(
            SCORE_HISTORY_STORAGE_KEY,
            JSON.stringify(history)
        );

    } catch (error) {

        console.error(
            "점수 기록을 저장하지 못했습니다.",
            error
        );

    }

}


function recordGameResult(result, detail) {

    saveScoreHistoryEntry({
        date: new Date().toISOString(),
        score,
        result,
        detail: detail || ""
    });

}


function formatHistoryDate(isoString) {

    const date =
        new Date(isoString);

    if (
        isNaN(date.getTime())
    ) {

        return "";

    }

    const pad = value =>
        String(value).padStart(2, "0");

    return (
        `${date.getFullYear()}.` +
        `${pad(date.getMonth() + 1)}.` +
        `${pad(date.getDate())} ` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    );

}


function renderScoreHistory() {

    scoreHistoryListElement.innerHTML =
        "";

    const history =
        loadScoreHistory();

    if (history.length === 0) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.classList.add(
            "discard-empty"
        );

        emptyMessage.textContent =
            "아직 기록이 없습니다.";

        scoreHistoryListElement.appendChild(
            emptyMessage
        );

        return;

    }

    history.forEach(entry => {

        const item =
            document.createElement("div");

        item.classList.add(
            "score-history-item",
            entry.result === "win"
                ? "result-win"
                : "result-gameover"
        );

        const left =
            document.createElement("div");

        const resultLabel =
            document.createElement("div");

        resultLabel.classList.add(
            "history-result"
        );

        resultLabel.textContent =
            entry.result === "win"
                ? "화료"
                : "게임 종료";

        left.appendChild(resultLabel);

        if (entry.detail) {

            const detailLine =
                document.createElement("div");

            detailLine.classList.add(
                "history-detail"
            );

            detailLine.textContent =
                entry.detail;

            left.appendChild(detailLine);

        }

        const dateLine =
            document.createElement("div");

        dateLine.classList.add(
            "history-date"
        );

        dateLine.textContent =
            formatHistoryDate(entry.date);

        left.appendChild(dateLine);

        const scoreLabel =
            document.createElement("div");

        scoreLabel.classList.add(
            "history-score"
        );

        scoreLabel.textContent =
            `${(entry.score || 0).toLocaleString()}점`;

        item.appendChild(left);

        item.appendChild(scoreLabel);

        scoreHistoryListElement.appendChild(
            item
        );

    });

}


function showScoreHistory() {

    renderScoreHistory();

    scoreHistoryOverlayElement.classList.remove(
        "hidden"
    );

}


function hideScoreHistory() {

    scoreHistoryOverlayElement.classList.add(
        "hidden"
    );

}


/* =========================================================
   셔플
========================================================= */

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            array[i],
            array[j]
        ] =
        [
            array[j],
            array[i]
        ];

    }

}


/* =========================================================
   깡 멜드 렌더링
========================================================= */

function renderKanMelds() {

    kanMeldsElement.innerHTML = "";


    /*
        가장 마지막(가장 최근에 선언된) 깡만
        이번 렌더링에서 새로 생긴 것인지 확인한다.
    */

    const isNewKanJustAdded =
        kanMelds.length > lastKanMeldRenderCount;


    kanMelds.forEach(
        (kanTile, meldIndex) => {

            const meld =
                document.createElement(
                    "div"
                );


            meld.classList.add(
                "kan-meld"
            );


            if (
                isNewKanJustAdded &&
                meldIndex === kanMelds.length - 1
            ) {

                meld.classList.add(
                    "tile-pop-in"
                );

            }


            for (
                let i = 0;
                i < 4;
                i++
            ) {

                const tile =
                    document.createElement(
                        "div"
                    );


                tile.classList.add(
                    "tile",
                    "kan-tile"
                );


                const kanSuitClass =
                    getSuitClass(kanTile);

                if (kanSuitClass) {

                    tile.classList.add(
                        kanSuitClass
                    );

                }


                tile.innerHTML =
                    buildTileSVG(kanTile) ||
                    `<span>${kanTile}</span>`;


                meld.appendChild(
                    tile
                );

            }


            kanMeldsElement.appendChild(
                meld
            );

        }
    );


    lastKanMeldRenderCount =
        kanMelds.length;

}


/* =========================================================
   27. 이벤트
========================================================= */

discardButton.addEventListener(
    "click",
    discardTile
);


kanButton.addEventListener(
    "click",
    showKanSelection
);


restartButton.addEventListener(
    "click",
    () => {

        hideResult();

        if (gameMode === "stage") {

            advanceStageFlow();

        } else {

            startGame();

        }

    }
);


discardHistoryButton.addEventListener(
    "click",
    showDiscardHistory
);


mulliganButton.addEventListener(
    "click",
    performMulligan
);


discardRetrieveArmButton.addEventListener(
    "click",
    () => {

        discardRetrieveArmed = true;

        setStatus(
            "버림패 회수권을 활성화했습니다. " +
            "이제 쯔모 대신 버림패에서 패를 가져올 수 있어요."
        );

        renderAll();

    }
);


manualDrawButton.addEventListener(
    "click",
    drawTile
);


tsumoPeekArmButton.addEventListener(
    "click",
    () => {

        tsumoPeekArmed = true;

        setStatus(
            "쯔모 투시를 활성화했습니다. " +
            "다음 쯔모부터 패산에서 2장을 보고 고를 수 있어요."
        );

        renderAll();

    }
);


closeDiscardHistoryButton.addEventListener(
    "click",
    hideDiscardHistory
);


yakuGuideButton.addEventListener(
    "click",
    showYakuGuide
);


closeYakuGuideButton.addEventListener(
    "click",
    hideYakuGuide
);


startGameButton.addEventListener(
    "click",
    () => {

        playButtonClickSound();

        hideStartScreen();

        gameMode = "classic";

        updateStageHud();

        startGame();

    }
);


startStageModeButton.addEventListener(
    "click",
    () => {

        playButtonClickSound();

        hideStartScreen();

        gameMode = "stage";

        currentStage = 1;

        coins = 0;

        stageScoreTotal = 0;

        lastStageResultWasWin = false;

        stageUpgrades =
            createEmptyStageUpgrades();

        updateStageHud();

        startGame();

    }
);


shopNextStageButton.addEventListener(
    "click",
    () => {

        hideShop();

        currentStage += 1;

        startGame();

    }
);


runSummaryRestartButton.addEventListener(
    "click",
    () => {

        hideRunSummary();

        gameMode = "classic";

        updateStageHud();

        startScreenOverlayElement.classList.remove(
            "hidden"
        );

    }
);


startHistoryButton.addEventListener(
    "click",
    showScoreHistory
);


scoreHistoryButton.addEventListener(
    "click",
    showScoreHistory
);


function updateSoundToggleLabel() {

    soundToggleButton.textContent =
        soundEnabled
            ? "🔊 소리 끄기"
            : "🔇 소리 켜기";

}


soundToggleButton.addEventListener(
    "click",
    () => {

        setSoundEnabled(!soundEnabled);

        updateSoundToggleLabel();

        if (soundEnabled) {

            playButtonClickSound();

        }

    }
);


updateSoundToggleLabel();


closeScoreHistoryButton.addEventListener(
    "click",
    hideScoreHistory
);


clearScoreHistoryButton.addEventListener(
    "click",
    () => {

        const confirmed =
            window.confirm(
                "점수 기록을 전부 지울까요? 되돌릴 수 없습니다."
            );

        if (!confirmed) {

            return;

        }

        try {

            localStorage.removeItem(
                SCORE_HISTORY_STORAGE_KEY
            );

        } catch (error) {

            console.error(
                "점수 기록을 지우지 못했습니다.",
                error
            );

        }

        renderScoreHistory();

    }
);


winButton.addEventListener(
    "click",
    () => {

        if (gameEnded) {

            return;

        }


        if (
            drawnTile === null
        ) {

            return;

        }


        const winningHand = [
            ...playerHand,
            drawnTile
        ];


        /*
            화료 재검사
        */

        const winResult =
            getWinResult(winningHand, {
                isFirstTurn,
                isRinshan,
                isHaitei
            });

        if (!winResult) {

            setStatus(
                "화료할 수 없는 패입니다."
            );


            winButton.classList.add(
                "hidden"
            );


            return;

        }


        /*
            화료 확정
        */

        gameEnded = true;

        discardButton.disabled =
            true;

        kanButton.classList.add(
            "hidden"
        );

        winButton.classList.add(
            "hidden"
        );


        const finalWinScore =
            Math.round(
                winResult.score * stageScoreMultiplier
            );

        score += finalWinScore;

        renderInfo();

        playWinSound(winResult.isYakuman, winResult.yakumanCount);


        const yakuText =
            winResult.yakuList
                .map(yaku =>
                    yaku.han === "yakuman"
                        ? `${yaku.name}(역만)`
                        : `${yaku.name}(${yaku.han}판)`
                )
                .join(", ");

        setStatus(
            `화료! ${yakuText} → +${finalWinScore.toLocaleString()}점` +
            (
                stageScoreMultiplier > 1
                    ? ` (배율 x${stageScoreMultiplier})`
                    : ""
            )
        );


        recordGameResult("win", yakuText);


        lastStageResultWasWin = true;


        showResult(
            "화료!",
            yakuText,
            true,
            winResult
        );


        console.log(
            "화료 패:",
            winningHand
        );

        console.log(
            "역 판정 결과:",
            winResult
        );

    }
);


/* =========================================================
   28. 게임 실행

   자동으로 시작하지 않고,
   시작 화면의 "게임 시작" 버튼을 눌러야 startGame()이 호출된다.
========================================================= */
