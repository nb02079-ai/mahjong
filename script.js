/* =========================================================
   SOLO MAHJONG
   1인용 마작 게임 - 1차 프로토타입
========================================================= */


/* =========================================================
   1. 게임 설정
========================================================= */

const MAX_TURNS = 75;
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

    gameEnded = false;

    discardButton.disabled = false;

    initializeTiles();

    shuffle(wall);

    createDeadWall();

    drawInitialHand();

    revealInitialDora();

    renderAll();

    setStatus("게임 시작!");

    /*
        게임 시작 후 첫 쯔모
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
        일반 마작패 136장
    */

    TILE_TYPES.forEach(tile => {

        for (let i = 0; i < 4; i++) {

            wall.push(tile);

        }

    });

    /*
        와일드패 2장
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
        와일드패는 왕패에 들어갈 수 없음
    */

    const normalTiles =
        wall.filter(
            tile => tile !== "★"
        );


    /*
        일반패 중 왕패 5장 분리
    */

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
        실제 패산에서도 제거
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

        playerHand.push(
            drawFromWall()
        );

    }

    playerHand =
        sortHand(playerHand);

}


/* =========================================================
   9. 도라
========================================================= */

function revealInitialDora() {

    if (deadWall.length === 0) {

        console.error(
            "왕패가 없습니다."
        );

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
        TILE_TYPES.indexOf(indicator);

    if (index === -1) {

        return null;

    }


    /*
        만수 / 통수 / 삭수
    */

    if (
        index >= 0 &&
        index <= 26
    ) {

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

    if (
        index >= 27 &&
        index <= 30
    ) {

        const windIndex =
            index - 27;

        const nextWind =
            (windIndex + 1) % 4;

        return TILE_TYPES[
            27 + nextWind
        ];

    }


    if (
        index >= 31 &&
        index <= 33
    ) {

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
   현재 적용되는 도라
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

    drawnTileSelected = false;

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


    if (drawnTile === null) {

        setStatus(
            "쯔모한 패가 없습니다."
        );

        return;

    }


    let discardedTile;


    /*
        1. 쯔모패 선택
    */

    if (drawnTileSelected) {

        discardedTile =
            drawnTile;

    }


    /*
        2. 손패 선택
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
        3. 아무것도 선택하지 않음
    */

    else {

        discardedTile =
            drawnTile;

    }


    console.log(
        "타패:",
        discardedTile
    );


    playerHand =
        sortHand(playerHand);


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


    removeKanChoices();

    renderAll();


    /*
        최대 쯔모 횟수 확인
    */

    if (
        turnCount >= MAX_TURNS
    ) {

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
   13. 깡 가능한 패 찾기
========================================================= */

function getKanCandidates() {

    const tiles = [
        ...playerHand
    ];


    if (drawnTile !== null) {

        tiles.push(
            drawnTile
        );

    }


    const counts = {};


    tiles.forEach(tile => {

        /*
            ★는 절대로 깡에 사용하지 않음
        */

        if (tile === "★") {

            return;

        }


        counts[tile] =
            (counts[tile] || 0) + 1;

    });


    return Object.keys(counts)
        .filter(
            tile => counts[tile] >= 4
        )
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


    if (
        candidates.length === 0
    ) {

        return;

    }


    if (
        candidates.length === 1
    ) {

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


    candidates.forEach(tile => {

        const button =
            document.createElement(
                "button"
            );


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
   15. 깡
========================================================= */

function declareKan(kanTile) {

    if (gameEnded) {

        return;

    }


    const candidates =
        getKanCandidates();


    if (
        !candidates.includes(
            kanTile
        )
    ) {

        return;

    }


    let handCount = 0;


    playerHand.forEach(tile => {

        if (
            tile === kanTile
        ) {

            handCount++;

        }

    });


    /*
        손패에 4장
    */

    if (
        handCount >= 4
    ) {

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
        손패 3장 + 쯔모패 1장
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
        깡 기록
    */

    kanMelds.push(
        kanTile
    );


    kanCount++;


    /*
        선택 상태 초기화
    */

    selectedTileIndex = null;

    drawnTileSelected = false;


    /*
        깡도라 공개
    */

    revealKanDora();


    /*
        보충패

        중요:
        깡 보충패는 일반 쯔모 횟수에
        포함하지 않는다.
    */

    drawnTile =
        drawFromWall();


    if (!drawnTile) {

        return;

    }


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

        setStatus(
            "더 이상 공개할 도라가 없습니다."
        );

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
   17. 깡 선택 버튼 제거
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
   18. 쯔모 후 액션 검사
========================================================= */

function checkActionsAfterDraw() {

    /*
        기존 액션 버튼 초기화
    */

    winButton.classList.add(
        "hidden"
    );

    kanButton.classList.add(
        "hidden"
    );


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

        setStatus(
            "화료 가능한 패입니다!"
        );

    }


    /*
        깡 가능 여부

        ★는 getKanCandidates()
        내부에서 이미 제외됨
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
   19. 화료 판정
========================================================= */

/*
    일반 상태:

    손패 13 + 쯔모 1
    = 14장

    깡 1회:

    공개 몸통 1개
    손패 10 + 쯔모 1
    = 11장

    깡 2회:

    공개 몸통 2개
    손패 7 + 쯔모 1
    = 8장

    따라서 필요한 몸통 수는

    4 - kanCount
*/

function canWin(hand) {

    const requiredMentsu =
        4 - kanCount;


    /*
        깡 횟수가 4회를 넘어가는 경우 방지
    */

    if (
        requiredMentsu < 0
    ) {

        return false;

    }


    /*
        필요한 패 개수 확인

        몸통 3장 × 필요한 몸통
        + 머리 2장
    */

    const expectedLength =
        requiredMentsu * 3 + 2;


    if (
        hand.length !== expectedLength
    ) {

        return false;

    }


    /*
        와일드패 개수
    */

    const wildCount =
        hand.filter(
            tile => tile === "★"
        ).length;


    /*
        일반패만 추출
    */

    const normalTiles =
        hand.filter(
            tile => tile !== "★"
        );


    const counts =
        countTiles(normalTiles);


    /*
        와일드패가 없는 경우
    */

    if (
        wildCount === 0
    ) {

        return isStandardHand(
            counts,
            requiredMentsu
        );

    }


    /*
        와일드패가 있는 경우
    */

    return isWildStandardHand(
        counts,
        wildCount,
        requiredMentsu
    );

}


/* =========================================================
   20. 와일드패 포함 화료
========================================================= */

function isWildStandardHand(
    counts,
    wildCount,
    requiredMentsu
) {

    /*
        1. 일반패 2장으로 머리
    */

    for (const tile in counts) {

        if (
            counts[tile] >= 2
        ) {

            counts[tile] -= 2;


            if (
                canMakeMentsuWithWild(
                    counts,
                    wildCount,
                    requiredMentsu
                )
            ) {

                counts[tile] += 2;

                return true;

            }


            counts[tile] += 2;

        }

    }


    /*
        2. 일반패 1장 + ★ 1장으로 머리
    */

    if (
        wildCount >= 1
    ) {

        for (const tile in counts) {

            if (
                counts[tile] >= 1
            ) {

                counts[tile]--;


                if (
                    canMakeMentsuWithWild(
                        counts,
                        wildCount - 1,
                        requiredMentsu
                    )
                ) {

                    counts[tile]++;

                    return true;

                }


                counts[tile]++;

            }

        }

    }


    /*
        3. ★★로 머리
    */

    if (
        wildCount >= 2
    ) {

        if (
            canMakeMentsuWithWild(
                counts,
                wildCount - 2,
                requiredMentsu
            )
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   21. 와일드패 포함 몸통 구성
========================================================= */

function canMakeMentsuWithWild(
    counts,
    wildCount,
    requiredMentsu
) {

    /*
        몸통을 모두 만들었는지 확인
    */

    if (
        requiredMentsu === 0
    ) {

        const remaining =
            Object.values(counts)
                .reduce(
                    (sum, value) =>
                        sum + value,
                    0
                );


        /*
            남은 일반패가 없고
            와일드패도 없어야 완성
        */

        return (
            remaining === 0 &&
            wildCount === 0
        );

    }


    /*
        남은 첫 번째 패
    */

    const tile =
        Object.keys(counts)
            .find(
                key =>
                    counts[key] > 0
            );


    /*
        일반패가 없으면
        ★ 3장으로 몸통을 만들 수 있는지 확인
    */

    if (!tile) {

        return (
            wildCount >=
            requiredMentsu * 3
        );

    }


    const index =
        TILE_TYPES.indexOf(tile);


    const sameCount =
        counts[tile];


    /* =====================================================
       1. 커쯔
    ===================================================== */

    /*
        일반패 3장
    */

    if (
        sameCount >= 3
    ) {

        counts[tile] -= 3;


        if (
            canMakeMentsuWithWild(
                counts,
                wildCount,
                requiredMentsu - 1
            )
        ) {

            counts[tile] += 3;

            return true;

        }


        counts[tile] += 3;

    }


    /*
        일반패 2장 + ★
    */

    if (
        sameCount >= 2 &&
        wildCount >= 1
    ) {

        counts[tile] -= 2;


        if (
            canMakeMentsuWithWild(
                counts,
                wildCount - 1,
                requiredMentsu - 1
            )
        ) {

            counts[tile] += 2;

            return true;

        }


        counts[tile] += 2;

    }


    /*
        일반패 1장 + ★★
    */

    if (
        sameCount >= 1 &&
        wildCount >= 2
    ) {

        counts[tile]--;


        if (
            canMakeMentsuWithWild(
                counts,
                wildCount - 2,
                requiredMentsu - 1
            )
        ) {

            counts[tile]++;

            return true;

        }


        counts[tile]++;

    }


    /* =====================================================
       2. 슌쯔
    ===================================================== */

    /*
        숫자패만 가능
    */

    if (
        index >= 0 &&
        index <= 26
    ) {

        const number =
            index % 9;


        /*
            1~7만 시작패 가능
        */

        if (
            number <= 6
        ) {

            const tile2 =
                TILE_TYPES[index + 1];

            const tile3 =
                TILE_TYPES[index + 2];


            const count2 =
                counts[tile2] || 0;

            const count3 =
                counts[tile3] || 0;


            /*
                없는 패의 개수 = 필요한 ★ 개수
            */

            const missing =
                (count2 === 0 ? 1 : 0) +
                (count3 === 0 ? 1 : 0);


            if (
                wildCount >= missing
            ) {

                counts[tile]--;


                if (
                    count2 > 0
                ) {

                    counts[tile2]--;

                }


                if (
                    count3 > 0
                ) {

                    counts[tile3]--;

                }


                if (
                    canMakeMentsuWithWild(
                        counts,
                        wildCount - missing,
                        requiredMentsu - 1
                    )
                ) {

                    counts[tile]++;


                    if (
                        count2 > 0
                    ) {

                        counts[tile2]++;

                    }


                    if (
                        count3 > 0
                    ) {

                        counts[tile3]++;

                    }


                    return true;

                }


                /*
                    원상복구
                */

                counts[tile]++;


                if (
                    count2 > 0
                ) {

                    counts[tile2]++;

                }


                if (
                    count3 > 0
                ) {

                    counts[tile3]++;

                }

            }

        }

    }


    return false;

}


/* =========================================================
   22. 기본형 화료 검사
========================================================= */

function isStandardHand(
    counts,
    requiredMentsu
) {

    /*
        모든 가능한 머리를 검사
    */

    for (const tile in counts) {

        if (
            counts[tile] >= 2
        ) {

            counts[tile] -= 2;


            if (
                canMakeMentsu(
                    counts,
                    requiredMentsu
                )
            ) {

                counts[tile] += 2;

                return true;

            }


            counts[tile] += 2;

        }

    }


    return false;

}


/* =========================================================
   23. 일반 몸통 구성
========================================================= */

function canMakeMentsu(
    counts,
    requiredMentsu
) {

    /*
        필요한 몸통을 모두 완성
    */

    if (
        requiredMentsu === 0
    ) {

        const remaining =
            Object.values(counts)
                .reduce(
                    (sum, value) =>
                        sum + value,
                    0
                );

        return remaining === 0;

    }


    /*
        첫 번째 패
    */

    const tile =
        Object.keys(counts)
            .find(
                key =>
                    counts[key] > 0
            );


    if (!tile) {

        return false;

    }


    /* =====================================================
       1. 커쯔
    ===================================================== */

    if (
        counts[tile] >= 3
    ) {

        counts[tile] -= 3;


        if (
            canMakeMentsu(
                counts,
                requiredMentsu - 1
            )
        ) {

            counts[tile] += 3;

            return true;

        }


        counts[tile] += 3;

    }


    /* =====================================================
       2. 슌쯔
    ===================================================== */

    const index =
        TILE_TYPES.indexOf(tile);


    if (
        index >= 0 &&
        index <= 26
    ) {

        const number =
            index % 9;


        if (
            number <= 6
        ) {

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


                if (
                    canMakeMentsu(
                        counts,
                        requiredMentsu - 1
                    )
                ) {

                    counts[tile]++;
                    counts[tile2]++;
                    counts[tile3]++;

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
   24. 패 개수 계산
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
   25. 패 정렬
========================================================= */

function sortHand(hand) {

    return [...hand].sort((a, b) => {

        /*
            와일드패는 가장 오른쪽
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

    });

}


/* =========================================================
   26. 패 정렬 순서
========================================================= */

function getTileOrder(tile) {

    const index =
        TILE_TYPES.indexOf(tile);


    if (
        index === -1
    ) {

        return 999;

    }


    return index;

}


/* =========================================================
   27. 전체 화면 렌더링
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


            /*
                선택된 패
            */

            if (
                index ===
                selectedTileIndex
            ) {

                button.classList.add(
                    "selected"
                );

            }


            /*
                도라
            */

            if (
                activeDoraTiles.includes(
                    tile
                )
            ) {

                button.classList.add(
                    "dora-highlight"
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


    if (
        !drawnTile
    ) {

        return;

    }


    const tile =
        document.createElement(
            "div"
        );


    tile.classList.add(
        "tile",
        "drawn"
    );


    /*
        선택 상태
    */

    if (
        drawnTileSelected
    ) {

        tile.classList.add(
            "selected"
        );

    }


    /*
        도라 여부
    */

    const activeDoraTiles =
        getActiveDoraTiles();


    if (
        activeDoraTiles.includes(
            drawnTile
        )
    ) {

        tile.classList.add(
            "dora-highlight"
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
        항상 5칸 표시
    */

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


        /*
            공개된 도라
        */

        if (
            i < doraIndicators.length
        ) {

            element.innerHTML =
                `<span>${doraIndicators[i]}</span>`;

        }


        /*
            미공개 왕패
        */

        else {

            element.classList.add(
                "hidden-dora"
            );

        }


        doraIndicatorsElement
            .appendChild(
                element
            );

    }


    doraCountElement.textContent =
        `${doraIndicators.length} / ${DEAD_WALL_SIZE}`;

}


/* =========================================================
   게임 정보 렌더링
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


    setStatus(
        message
    );


    discardButton.disabled =
        true;


    kanButton.classList.add(
        "hidden"
    );


    winButton.classList.add(
        "hidden"
    );


    removeKanChoices();

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
                Math.random() *
                (i + 1)
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
   깡 멘츠 렌더링
========================================================= */

function renderKanMelds() {

    kanMeldsElement.innerHTML =
        "";


    kanMelds.forEach(
        kanTile => {

            const meld =
                document.createElement(
                    "div"
                );


            meld.classList.add(
                "kan-meld"
            );


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

}


/* =========================================================
   28. 이벤트
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

        if (gameEnded) {

            return;

        }


        if (
            drawnTile === null
        ) {

            return;

        }


        /*
            현재 손패 + 쯔모패
        */

        const winningHand = [
            ...playerHand,
            drawnTile
        ];


        /*
            실제 화료 가능 여부 재검사
        */

        if (
            !canWin(
                winningHand
            )
        ) {

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


        setStatus(
            "화료! 축하합니다!"
        );


        console.log(
            "화료 패:",
            winningHand
        );


        console.log(
            "깡 횟수:",
            kanCount
        );

    }
);


/* =========================================================
   29. 게임 실행
========================================================= */

startGame();
