/* =========================================================
   SOLO MAHJONG
   1인용 마작 게임
========================================================= */


/* =========================================================
   1. 게임 설정
========================================================= */

const MAX_TURNS = 70;
const WILD_COUNT = 2;
const DEAD_WALL_SIZE = 5;


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
        이 중 4장 중 1장을 적도라로 표시한다.
    */

    const RED_FIVE_INDEXES = [4, 13, 22];

    TILE_TYPES.forEach((tile, tileIndex) => {

        for (let i = 0; i < 4; i++) {

            const isRedFiveSlot =
                RED_FIVE_INDEXES.includes(tileIndex) &&
                i === 0;

            wall.push(
                isRedFiveSlot
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

    doraIndicators = [
        deadWall[0]
    ];

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


    if (turnCount >= MAX_TURNS) {

        endGame(
            `${MAX_TURNS}회의 쯔모 기회를 모두 사용했습니다.`
        );

        return;

    }


    drawnTile =
        drawFromWall();

    if (!drawnTile) {

        return;

    }


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
            score: 32000 * yakumanCount
        };

    }


    let han = 0;

    yakuList.forEach(yaku => {

        if (typeof yaku.han === "number") {

            han += yaku.han;

        }

    });


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


    showResult(
        "게임 종료",
        message,
        false
    );

}


/* =========================================================
   결과 오버레이
========================================================= */

function showResult(title, message, isWin) {

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
   버림패 확인
========================================================= */

function renderDiscardHistory() {

    discardHistoryTilesElement.innerHTML =
        "";

    discardHistoryCountElement.textContent =
        discardedTiles.length;


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
            `<span>${tile}</span>`;

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

        startGame();

    }
);


discardHistoryButton.addEventListener(
    "click",
    showDiscardHistory
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


        score += winResult.score;

        renderInfo();


        const yakuText =
            winResult.yakuList
                .map(yaku =>
                    yaku.han === "yakuman"
                        ? `${yaku.name}(역만)`
                        : `${yaku.name}(${yaku.han}판)`
                )
                .join(", ");

        setStatus(
            `화료! ${yakuText} → +${winResult.score.toLocaleString()}점`
        );


        showResult(
            "화료!",
            yakuText,
            true
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
========================================================= */

startGame();
