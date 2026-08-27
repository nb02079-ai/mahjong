/* =========================================================
   SOLO MAHJONG
   1인용 마작 게임
========================================================= */


/* =========================================================
   1. 게임 설정
========================================================= */

const MAX_TURNS = 77;
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

    turnCount = 0;

    playerHand = [];

    drawnTile = null;

    kanMelds = [];

    kanCount = 0;

    doraIndicators = [];

    selectedTileIndex = null;

    drawnTileSelected = false;

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

    TILE_TYPES.forEach(tile => {

        for (let i = 0; i < 4; i++) {

            wall.push(tile);

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
        TILE_TYPES.indexOf(indicator);

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


        counts[tile] =
            (counts[tile] || 0) + 1;

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


    playerHand.forEach(tile => {

        if (tile === kanTile) {

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
        손패 3장 + 쯔모 1장
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

        if (
            canWin(currentHand)
        ) {

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
   18. 화료 판정
========================================================= */

/*
    공개 깡이 없으면

    4몸통 + 1머리

    공개 깡이 1개면

    3몸통 + 1머리

    공개 깡이 2개면

    2몸통 + 1머리

    ...

    공개 깡도 이미 몸통으로 계산한다.
*/

function canWin(hand) {

    const requiredMentsu =
        4 - kanMelds.length;


    /*
        손패 + 쯔모패의
        일반 패 개수 확인
    */

    const wildCount =
        hand.filter(
            tile => tile === "★"
        ).length;


    const normalTiles =
        hand.filter(
            tile => tile !== "★"
        );


    /*
        필요한 장수 검사

        몸통 3장 × 필요 몸통
        + 머리 2장
        = 필요한 총 일반/와일드 패 수

        단, 공개 깡은 이미 밖에서
        계산되므로 현재 손패는
        필요한 몸통 수만큼만 검사.
    */

    const requiredTiles =
        requiredMentsu * 3 + 2;


    if (
        normalTiles.length +
        wildCount !==
        requiredTiles
    ) {

        return false;

    }


    const counts =
        countTiles(normalTiles);


    /*
        와일드패가 없으면
        일반 화료 판정
    */

    if (wildCount === 0) {

        return isStandardHand(
            counts,
            requiredMentsu
        );

    }


    /*
        와일드패가 있으면
        와일드 포함 판정
    */

    return isWildStandardHand(
        counts,
        wildCount,
        requiredMentsu
    );

}


/* =========================================================
   19. 일반 화료 판정
========================================================= */

function isStandardHand(
    counts,
    requiredMentsu
) {

    /*
        가능한 모든 머리 검사
    */

    for (
        const tile in counts
    ) {

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
   20. 일반 몸통 구성
========================================================= */

function canMakeMentsu(
    counts,
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


        return remaining === 0;

    }


    /*
        가장 앞쪽 패
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


    /*
        커쯔
    */

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


    /*
        슌쯔
    */

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
                (counts[tile2] || 0) > 0 &&
                (counts[tile3] || 0) > 0
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
   21. 와일드패 포함 화료
========================================================= */

function isWildStandardHand(
    counts,
    wildCount,
    requiredMentsu
) {

    /*
        ① 일반 패 2장으로 머리
    */

    for (
        const tile in counts
    ) {

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
        ② 일반 패 1장 + ★ 1장으로 머리
    */

    if (
        wildCount >= 1
    ) {

        for (
            const tile in counts
        ) {

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
        ③ ★ ★ 로 머리
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
   22. 와일드 포함 몸통 구성
========================================================= */

function canMakeMentsuWithWild(
    counts,
    wildCount,
    requiredMentsu
) {

    /*
        몸통을 모두 만든 경우
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


        return (
            remaining === 0 &&
            wildCount === 0
        );

    }


    /*
        일반 패가 더 이상 없다면
        ★만으로 몸통 구성
    */

    const tile =
        Object.keys(counts)
            .find(
                key =>
                    counts[key] > 0
            );


    if (!tile) {

        return (
            wildCount >=
            requiredMentsu * 3
        );

    }


    /*
        =====================================
        1. 커쯔
        =====================================
    */

    const sameCount =
        counts[tile];


    /*
        일반 패 3장
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
        일반 패 2장 + ★
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
        일반 패 1장 + ★★
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


    /*
        =====================================
        2. 슌쯔
        =====================================
    */

    const index =
        TILE_TYPES.indexOf(tile);


    /*
        숫자패만 가능
    */

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


            const count2 =
                counts[tile2] || 0;

            const count3 =
                counts[tile3] || 0;


            let missing = 0;


            if (
                count2 === 0
            ) {

                missing++;

            }


            if (
                count3 === 0
            ) {

                missing++;

            }


            /*
                필요한 만큼
                ★를 사용할 수 있는 경우
            */

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
   23. 패 개수 계산
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
        TILE_TYPES.indexOf(tile);


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


    if (!drawnTile) {

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

            element.innerHTML =
                `<span>${doraIndicators[i]}</span>`;

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

    setStatus(message);

    discardButton.disabled = true;

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

        if (
            !canWin(winningHand)
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

    }
);


/* =========================================================
   28. 게임 실행
========================================================= */

startGame();
