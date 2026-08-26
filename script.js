/* =========================================================
   SOLO MAHJONG
   1인용 마작 게임 - 1차 프로토타입
========================================================= */


/* =========================================================
   1. 게임 설정
========================================================= */

const MAX_TURNS = 50;
const WILD_COUNT = 2;
const DEAD_WALL_SIZE = 5;


/* =========================================================
   2. 마작패 정의
========================================================= */

/*
    만수:
    🀇 1만
    🀈 2만
    🀉 3만
    ...
    🀏 9만

    통수:
    🀙 1통
    ...
    🀡 9통

    삭수:
    🀐 1삭
    ...
    🀘 9삭

    자패:
    🀀 동
    🀁 남
    🀂 서
    🀃 북
    🀄 백
    🀅 발
    🀆 중
*/


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


/* =========================================================
   5. 게임 시작
========================================================= */

function startGame() {

    console.log("게임 시작");

    initializeTiles();

    shuffle(wall);

    createDeadWall();

    drawInitialHand();

    revealInitialDora();

    renderAll();

    setStatus("게임 시작!");

    // 시작 후 첫 쯔모
    setTimeout(() => {
        drawTile();
    }, 300);
}


/* =========================================================
   6. 패 생성
========================================================= */

function initializeTiles() {

    wall = [];

    // 일반 마작패 136장
    TILE_TYPES.forEach(tile => {

        for (let i = 0; i < 4; i++) {

            wall.push(tile);

        }

    });

    // 와일드패 2장
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
        와일드패는 왕패에 들어갈 수 없다.
        따라서 일반 마작패만 따로 모은다.
    */

    const normalTiles = wall.filter(
        tile => tile !== "★"
    );

    /*
        일반 마작패에서 왕패 5장을 가져온다.
    */

    for (let i = 0; i < DEAD_WALL_SIZE; i++) {

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
        실제 패산에서도 제거한다.
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

        playerHand.push(drawFromWall());

    }

    playerHand =
        sortHand(playerHand);

}


/* =========================================================
   9. 도라 공개
========================================================= */

function revealInitialDora() {

    if (deadWall.length === 0) {

        console.error(
            "왕패가 없습니다."
        );

        return;

    }

    /*
        왕패의 첫 번째 패를
        도라 표시패로 사용
    */

    const dora =
        deadWall[0];

    doraIndicators = [dora];

}

/* =========================================================
   실제 도라 계산
========================================================= */

function getDoraTile(indicator) {

    const index =
        TILE_TYPES.indexOf(indicator);


    if (index === -1) {
        return null;
    }


    /*
        만수 / 통수 / 삭수
    */

    if (index >= 0 && index <= 26) {

        const suitStart =
            Math.floor(index / 9) * 9;

        const number =
            index - suitStart;


        /*
            9 → 1
        */

        const nextNumber =
            (number + 1) % 9;


        return TILE_TYPES[
            suitStart + nextNumber
        ];

    }


    /*
        자패

        동 → 남 → 서 → 북 → 동
        백 → 발 → 중 → 백
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

        endGame("패산이 모두 소진되었습니다.");

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

    if (turnCount >= MAX_TURN) {

        endGame("15회의 쯔모 기회를 모두 사용했습니다.");

        return;

    }

    drawnTile = drawFromWall();

    if (!drawnTile) {

        return;

    }

    turnCount++;

    setStatus(
        `${turnCount} / ${MAX_TURNS}번째 쯔모`
    );

    renderAll();

    /*
        쯔모 후:
        13장 손패 + 쯔모패 = 14장

        화료 가능한지 검사
    */

    if (canWin([...playerHand, drawnTile])) {

        winButton.classList.remove("hidden");

        setStatus(
            "화료 가능한 패입니다!"
        );

    }

    /*
        깡 가능한지 검사
    */

    if (getKanCandidates().length > 0) {

    kanButton.classList.remove("hidden");

    }

}


/* =========================================================
   12. 패 선택
========================================================= */

function selectTile(index) {

    // 쯔모패 선택 해제
    drawnTileSelected = false;

    // 손패 선택
    selectedTileIndex = index;

    renderAll();

}

/* =========================================================
   쯔모패 선택
========================================================= */

function selectDrawnTile() {

    if (drawnTile === null) {
        return;
    }

    // 손패 선택 해제
    selectedTileIndex = null;

    // 쯔모패 선택
    drawnTileSelected = true;

    renderAll();

    setStatus("쯔모한 패가 선택되었습니다.");
}

/* =========================================================
   타패
========================================================= */

function discardTile() {

   if (gameEnded) {
        return;
    }


    if (drawnTile === null) {

        setStatus("쯔모한 패가 없습니다.");

        return;
    }


    let discardedTile;


    /*
        =====================================
        1. 쯔모패를 선택한 경우
        =====================================
    */

    if (drawnTileSelected) {

        // 쯔모패 자체를 버림
        discardedTile = drawnTile;

    }


    /*
        =====================================
        2. 손패를 선택한 경우
        =====================================
    */

    else if (selectedTileIndex !== null) {

        // 선택한 손패를 버림
        discardedTile =
            playerHand.splice(
                selectedTileIndex,
                1
            )[0];


        // 쯔모패를 손패에 추가
        playerHand.push(
            drawnTile
        );

    }


    /*
        =====================================
        3. 아무것도 선택하지 않은 경우
        =====================================
    */

    else {

        // 기본적으로 쯔모패를 버림
        discardedTile = drawnTile;

    }


    console.log(
        "타패:",
        discardedTile
    );


    /*
        손패 자동 정렬
    */

    playerHand =
        sortHand(playerHand);


    /*
        상태 초기화
    */

    drawnTile = null;

    selectedTileIndex = null;

    drawnTileSelected = false;


    /*
        액션 버튼 초기화
    */

    kanButton.classList.add(
        "hidden"
    );

    winButton.classList.add(
        "hidden"
    );


    renderAll();


    /*
        15회 쯔모를 모두 사용했는지 확인
    */

    if (turnCount >= MAX_TURNS) {

        endGame(
            "15회의 쯔모 기회를 모두 사용했습니다."
        );

        return;
    }


    setStatus(
        "다음 패를 뽑습니다."
    );


    /*
        다음 쯔모
    */

    setTimeout(() => {

        drawTile();

    }, 300);

}


/* =========================================================
   깡 가능한 패 찾기
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

        // 와일드패는 깡에 사용할 수 없음
        if (tile === "★") {
            return;
        }

        counts[tile] =
            (counts[tile] || 0) + 1;

    });

    return Object.keys(counts)
        .filter(tile => counts[tile] >= 4)
        .sort(
            (a, b) =>
                getTileOrder(a) - getTileOrder(b)
        );
}

/* =========================================================
   깡 선택 UI
========================================================= */

function showKanSelection() {

    const candidates =
        getKanCandidates();

    if (candidates.length === 0) {
        return;
    }

    if (candidates.length === 1) {

        declareKan(candidates[0]);

        return;
    }

    setStatus(
        "깡할 패를 선택하세요."
    );

    kanButton.classList.add("hidden");

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
   깡
========================================================= */

function declareKan(kanTile) {
   
    if (gameEnded) {
        return;
    }


    const candidates =
        getKanCandidates();

    if (!candidates.includes(kanTile)) {
        return;
    }

    let handCount = 0;

    playerHand.forEach(tile => {

        if (tile === kanTile) {
            handCount++;
        }

    });

    /*
        손패에 4장이 있는 경우
        → 손패에서 4장 제거
    */

    if (handCount >= 4) {

        let removed = 0;

        playerHand =
            playerHand.filter(tile => {

                if (
                    tile === kanTile &&
                    removed < 4
                ) {

                    removed++;

                    return false;
                }

                return true;
            });

    }

    /*
        손패 3장 + 쯔모 1장인 경우
        → 손패 3장 제거 + 쯔모패 제거
    */

    else if (
        handCount === 3 &&
        drawnTile === kanTile
    ) {

        let removed = 0;

        playerHand =
            playerHand.filter(tile => {

                if (
                    tile === kanTile &&
                    removed < 3
                ) {

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
        공개된 깡 기록
    */

    kanMelds.push(kanTile);


    /*
        선택 상태 초기화
    */

    selectedTileIndex = null;
    drawnTileSelected = false;


    /*
        깡 횟수 증가
    */

    kanCount++;


    /*
        추가 도라 공개
    */

    revealKanDora();


    /*
        보충패
        ※ turnCount 증가 없음
    */

    drawnTile =
        drawFromWall();

    if (!drawnTile) {
        return;
    }


    playerHand =
        sortHand(playerHand);


    removeKanChoices();


    kanButton.classList.add("hidden");
    winButton.classList.add("hidden");


    renderAll();


    checkActionsAfterDraw();

    setStatus(
        `${kanCount}번째 깡! 보충패를 뽑았습니다.`
    );
}

/* =========================================================
   16. 깡도라 공개
========================================================= */

function revealKanDora() {

    /*
        현재 공개된 도라 수
        = 다음에 공개할 왕패의 위치
    */

    const nextIndex =
        doraIndicators.length;


    /*
        최대 5장
    */

    if (nextIndex >= DEAD_WALL_SIZE) {

        setStatus(
            "더 이상 공개할 도라가 없습니다."
        );

        return;

    }


    /*
        왕패에서 다음 패 확인
    */

    const nextDora =
        deadWall[nextIndex];


    if (!nextDora) {

        console.error(
            "추가 도라 표시패가 없습니다."
        );

        return;

    }


    /*
        도라 공개
    */

    doraIndicators.push(
        nextDora
    );


    /*
        화면 업데이트
    */

    renderDora();

}

/* =========================================================
   깡 선택 버튼 제거
========================================================= */

function removeKanChoices() {

    document
        .querySelectorAll(".kan-choice-button")
        .forEach(button => {

            button.remove();

        });

}

/* =========================================================
   쯔모 후 액션 검사
========================================================= */

function checkActionsAfterDraw() {

    /*
        화료 가능 여부
    */

    if (
        drawnTile !== null &&
        canWin([
            ...playerHand,
            drawnTile
        ])
    ) {

        winButton.classList.remove(
            "hidden"
        );

    }


    /*
        깡 가능 여부
    */

    if (
        getKanCandidates().length > 0
    ) {

        kanButton.classList.remove(
            "hidden"
        );

    }

}

/* =========================================================
   17. 화료 판정
========================================================= */

function canWin(hand) {

    /*
        현재는 기본적인
        4멘츠 + 1머리 형태만 검사.

        와일드패 / 치또이츠 /
        국사무쌍 등은 다음 단계에서 추가.
    */

    if (hand.length !== 14) {

        return false;

    }


    /*
        와일드패가 있으면
        일단 화료 가능성만 표시하지 않고
        다음 단계에서 최적 조합 탐색.
    */

    if (hand.includes("★")) {

        return false;

    }


    return isStandardHand(hand);

}


/* =========================================================
   18. 기본형 화료 검사
========================================================= */

function isStandardHand(hand) {

    const counts = countTiles(hand);


    /*
        모든 가능한 머리를 검사
    */

    for (const tile in counts) {

        if (counts[tile] >= 2) {

            counts[tile] -= 2;


            if (canMakeFourMentsu(counts)) {

                return true;

            }


            counts[tile] += 2;

        }

    }


    return false;

}


/* =========================================================
   19. 멘츠 구성 가능 여부
========================================================= */

function canMakeFourMentsu(counts) {

    const remaining =
        Object.values(counts)
            .reduce(
                (sum, value) => sum + value,
                0
            );


    if (remaining === 0) {

        return true;

    }


    /*
        가장 앞쪽의 패를 찾는다.
    */

    const tile =
        Object.keys(counts)
            .find(
                key => counts[key] > 0
            );


    if (!tile) {

        return true;

    }


    /*
        1. 커쯔
    */

    if (counts[tile] >= 3) {

        counts[tile] -= 3;


        if (canMakeFourMentsu(counts)) {

            return true;

        }


        counts[tile] += 3;

    }


    /*
        2. 슌쯔
        숫자패인지 확인
    */

    const index =
        TILE_TYPES.indexOf(tile);


    if (index >= 0 && index <= 26) {

        const suitStart =
            Math.floor(index / 9) * 9;

        const number =
            index % 9;


        if (number <= 6) {

            const tile2 =
                TILE_TYPES[index + 1];

            const tile3 =
                TILE_TYPES[index + 2];


            if (
                counts[tile2] > 0 &&
                counts[tile3] > 0
            ) {

                counts[tile]--;
                counts[tile2]--;
                counts[tile3]--;


                if (canMakeFourMentsu(counts)) {

                    return true;

                }


                counts[tile]++;
                counts[tile2]++;
                counts[tile3]++;

            }

        }

    }


    return false;

}


/* =========================================================
   20. 패 개수 계산
========================================================= */

function countTiles(hand) {

    const counts = {};

    hand.forEach(tile => {

        counts[tile] =
            (counts[tile] || 0) + 1;

    });

    return counts;

}

/* =========================================================
   패 정렬
========================================================= */

function sortHand(hand) {

    return [...hand].sort((a, b) => {

        // 와일드패는 가장 오른쪽
        if (a === "★" && b !== "★") {
            return 1;
        }

        if (a !== "★" && b === "★") {
            return -1;
        }

        if (a === "★" && b === "★") {
            return 0;
        }

        return getTileOrder(a) - getTileOrder(b);

    });

}

/* =========================================================
   패 정렬 순서
========================================================= */

function getTileOrder(tile) {

    const index = TILE_TYPES.indexOf(tile);

    if (index === -1) {
        return 999;
    }

    return index;

}


/* =========================================================
   21. 전체 화면 렌더링
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


    /*
        현재 적용되는 도라
    */

    const activeDoraTiles =
        getActiveDoraTiles();


    playerHand.forEach((tile, index) => {

        const button =
            document.createElement("button");


        button.classList.add("tile");


        /*
            선택된 패
        */

        if (index === selectedTileIndex) {

            button.classList.add(
                "selected"
            );

        }


        /*
            도라 패
        */

        if (
            activeDoraTiles.includes(tile)
        ) {

            button.classList.add(
                "dora-highlight"
            );

        }


        button.innerHTML =
            `<span>${tile}</span>`;


        button.addEventListener(
            "click",
            () => selectTile(index)
        );


        playerHandElement.appendChild(
            button
        );

    });


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
        document.createElement("div");

    tile.classList.add(
        "tile",
        "drawn"
    );

    /*
        쯔모패가 선택되었는지 확인
    */

    if (drawnTileSelected) {

        tile.classList.add(
            "selected"
        );

    }

    /*
        쯔모패가 도라인지 확인
    */

    const activeDoraTiles =
        getActiveDoraTiles();

    if (
        activeDoraTiles.includes(drawnTile)
    ) {

        tile.classList.add(
            "dora-highlight"
        );

    }

    tile.innerHTML =
        `<span>${drawnTile}</span>`;

    /*
        쯔모패 클릭
    */

    tile.addEventListener(
        "click",
        selectDrawnTile
    );

    drawnTileElement.appendChild(tile);
}

/* =========================================================
   24. 도라 렌더링
========================================================= */

function renderDora() {

    doraIndicatorsElement.innerHTML = "";


    /*
        왕패 5칸을 항상 표시
    */

    for (
        let i = 0;
        i < DEAD_WALL_SIZE;
        i++
    ) {

        const element =
            document.createElement("div");


        element.classList.add(
            "tile",
            "dora-tile"
        );


        /*
            이미 공개된 도라
        */

        if (
            i < doraIndicators.length
        ) {

            element.innerHTML =
                `<span>${doraIndicators[i]}</span>`;

        }


        /*
            아직 공개되지 않은 왕패
        */

        else {

            element.classList.add(
                "hidden-dora"
            );

        }


        doraIndicatorsElement
            .appendChild(element);

    }


    doraCountElement.textContent =
        `${doraIndicators.length} / ${DEAD_WALL_SIZE}`;

}


/* =========================================================
   25. 게임 정보 렌더링
========================================================= */

function renderInfo() {

    scoreElement.textContent =
        score.toLocaleString();


    turnsLeftElement.textContent =
        Math.max(
            0,
            MAX_TURNS - turnCount
        );


    wallCountElement.textContent =
        wall.length;

}


/* =========================================================
   26. 상태 메시지
========================================================= */

function setStatus(message) {

    gameStatusElement.textContent =
        message;

}


/* =========================================================
   27. 게임 종료
========================================================= */

function endGame(message) {

    gameEnded = true;

    setStatus(message);

    discardButton.disabled = true;

    kanButton.classList.add("hidden");

    winButton.classList.add("hidden");

}


/* =========================================================
   28. 셔플
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
   render kan melds
========================================================= */

function renderKanMelds() {

    kanMeldsElement.innerHTML = "";

    kanMelds.forEach(kanTile => {

        const meld =
            document.createElement("div");

        meld.classList.add("kan-meld");

        for (let i = 0; i < 4; i++) {

            const tile =
                document.createElement("div");

            tile.classList.add(
                "tile",
                "kan-tile"
            );

            tile.innerHTML =
                `<span>${kanTile}</span>`;

            meld.appendChild(tile);
        }

        kanMeldsElement.appendChild(meld);

    });
}


/* =========================================================
   29. 이벤트
========================================================= */

discardButton.addEventListener(
    "click",
    discardTile
);


kanButton.addEventListener(
    "click",
    showKanSelection
);

winButton.addEventListener(
    "click",
    () => {

        /*
            현재는 점수 계산 미구현.

            다음 단계에서:
            - 역 판정
            - 부수
            - 판수
            - 도라
            - 와일드패 최적화
            - 자 쯔모 점수

            를 연결한다.
        */

        setStatus(
            "화료! (점수 계산은 다음 단계에서 구현)"
        );

    }
);


/* =========================================================
   30. 게임 실행
========================================================= */

startGame();
