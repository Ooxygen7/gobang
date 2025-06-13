// =================================================================
//  Firebase 配置 (请使用你自己的项目配置)
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBPmnw0YXRb914XUAjw9t2tDGhYGMNb14A",
    authDomain: "wuziqi-b2f02.firebaseapp.com",
    projectId: "wuziqi-b2f02",
    storageBucket: "wuziqi-b2f02.firebasestorage.app",
    messagingSenderId: "669232246017",
    appId: "1:669232246017:web:593fbdf568712195503f00",
    measurementId: "G-ETBEVSW4R8"
};

// =================================================================
//  Firebase 初始化
// =================================================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// =================================================================
//  DOM 元素获取
// =================================================================
const canvas = document.getElementById('gomoku-board');
canvas.width = 540;
canvas.height = 540;
const ctx = canvas.getContext('2d');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomIdInput = document.getElementById('room-id-input');
const roomControls = document.getElementById('room-controls');
const gameInfo = document.getElementById('game-info');
const gomokuBoard = document.getElementById('gomoku-board');
const roomIdDisplay = document.getElementById('room-id-display');
const gameStatus = document.getElementById('game-status');
const usernameModal = document.getElementById('username-modal');
const usernameForm = document.getElementById('username-form');
const usernameInput = document.getElementById('username-input');
const ruleSelectionModal = document.getElementById('rule-selection-modal');
const ruleForm = document.getElementById('rule-form');
const enableKinteRuleCheckbox = document.getElementById('enable-kinte-rule');
const enableOpeningRuleCheckbox = document.getElementById('enable-opening-rule');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const playerOneInfo = document.getElementById('player-one-info');
const playerTwoInfo = document.getElementById('player-two-info');
const roleSelectionDiv = document.getElementById('role-selection');
const chooseBlackBtn = document.getElementById('choose-black-btn');
const chooseWhiteBtn = document.getElementById('choose-white-btn');
const chooseSpectatorBtn = document.getElementById('choose-spectator-btn');
const spectatorList = document.getElementById('spectator-list');
const gameNotificationBar = document.getElementById('game-notification-bar');
const swap3Modal = document.getElementById('swap3-modal');
const actionControls = document.getElementById('action-controls');
const retractRequestBtn = document.getElementById('retract-request-btn');
const reportKinteBtn = document.getElementById('report-kinte-btn');
const confirmKinteReportBtn = document.getElementById('confirm-kinte-report-btn');
const cancelKinteReportBtn = document.getElementById('cancel-kinte-report-btn');
const confirmSwap5PlacementsBtn = document.getElementById('confirm-swap5-placements-btn');
const endMatchExitBtn = document.getElementById('end-match-exit-btn');

// =================================================================
//  全局变量和常量
// =================================================================
const BOARD_SIZE = 15;
const CELL_SIZE = canvas.width / BOARD_SIZE;
let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
let moveHistory = []; 
let currentRoomId = null;
let currentUser = null;
let username = null;
let userRole = null;
let gameState = null;
let tempKinteStones = [];
let tempSwap5Stones = [];
let unsubscribe = null;
let messagesUnsubscribe = null;
const moveSound = new Audio('xiaqi.mp3');

// =================================================================
//  核心功能: 绘制与胜负判断
// =================================================================

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#543d22';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2 + i * CELL_SIZE, CELL_SIZE / 2);
        ctx.lineTo(CELL_SIZE / 2 + i * CELL_SIZE, canvas.height - CELL_SIZE / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2, CELL_SIZE / 2 + i * CELL_SIZE);
        ctx.lineTo(canvas.width - CELL_SIZE / 2, CELL_SIZE / 2 + i * CELL_SIZE);
        ctx.stroke();
    }
    const starPoints = [{ x: 3, y: 3 }, { x: 11, y: 3 }, { x: 3, y: 11 }, { x: 11, y: 11 }, { x: 7, y: 7 }];
    ctx.fillStyle = '#543d22';
    starPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(CELL_SIZE / 2 + p.x * CELL_SIZE, CELL_SIZE / 2 + p.y * CELL_SIZE, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawStone(x, y, player, moveNumber, isLastMove) {
    const radius = CELL_SIZE / 2 * 0.9;
    const gradient = ctx.createRadialGradient(
        CELL_SIZE / 2 + x * CELL_SIZE - radius * 0.2, CELL_SIZE / 2 + y * CELL_SIZE - radius * 0.2, radius * 0.1,
        CELL_SIZE / 2 + x * CELL_SIZE, CELL_SIZE / 2 + y * CELL_SIZE, radius
    );
    if (player === 1) {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ddd');
    }
    ctx.beginPath();
    ctx.arc(CELL_SIZE / 2 + x * CELL_SIZE, CELL_SIZE / 2 + y * CELL_SIZE, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    if (moveNumber > 0) {
        ctx.font = `bold ${CELL_SIZE / 2.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isLastMove) {
            ctx.fillStyle = 'red';
        } else {
            ctx.fillStyle = player === 1 ? 'white' : 'black';
        }
        ctx.fillText(moveNumber, CELL_SIZE / 2 + x * CELL_SIZE, CELL_SIZE / 2 + y * CELL_SIZE);
    }
}

function drawHighlightStones(stones) {
    stones.forEach(stone => {
        const x = stone.x;
        const y = stone.y;
        ctx.strokeStyle = stone.color || 'red';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(CELL_SIZE / 2 + x * CELL_SIZE, CELL_SIZE / 2 + y * CELL_SIZE, CELL_SIZE / 2 * 0.8, 0, 2 * Math.PI);
        ctx.stroke();
    });
}

function redrawStones() {
    const history = moveHistory || [];
    history.forEach((move, index) => {
        const isLastMove = (index === history.length - 1);
        drawStone(move.x, move.y, move.player, index + 1, isLastMove);
    });
}

function checkWin(flatBoard) {
    const b = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        b.push(flatBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE));
    }
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (b[y][x] === 0) continue;
            const player = b[y][x];
            if (x <= BOARD_SIZE - 5) {
                let count = 0;
                for (let i = 0; i < 5; i++) { if (b[y][x + i] === player) count++; }
                if (count === 5) return player;
            }
            if (y <= BOARD_SIZE - 5) {
                let count = 0;
                for (let i = 0; i < 5; i++) { if (b[y + i][x] === player) count++; }
                if (count === 5) return player;
            }
            if (x <= BOARD_SIZE - 5 && y <= BOARD_SIZE - 5) {
                let count = 0;
                for (let i = 0; i < 5; i++) { if (b[y + i][x + i] === player) count++; }
                if (count === 5) return player;
            }
            if (x >= 4 && y <= BOARD_SIZE - 5) {
                let count = 0;
                for (let i = 0; i < 5; i++) { if (b[y + i][x - i] === player) count++; }
                if (count === 5) return player;
            }
        }
    }
    return null;
}

// =================================================================
//  聊天与系统消息
// =================================================================
function displayMessage(messageData) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message');
    if (messageData.uid === 'system') {
        msgDiv.classList.add('system-message');
    } else if (messageData.uid === currentUser.uid) {
        msgDiv.classList.add('my-message');
    } else {
        msgDiv.classList.add('opponent-message');
    }
    const senderDiv = document.createElement('div');
    senderDiv.classList.add('message-sender');
    senderDiv.textContent = messageData.senderName;
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = messageData.text;
    msgDiv.appendChild(senderDiv);
    msgDiv.appendChild(contentDiv);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendSystemMessage(text) {
    if (!currentRoomId) return;
    try {
        await db.collection('rooms').doc(currentRoomId).collection('messages').add({
            text: text,
            senderName: '系统消息',
            uid: 'system',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("发送系统消息失败: ", error);
    }
}

// =================================================================
//  Firebase 交互: 核心逻辑
// =================================================================

async function handleRoleSelection(role) {
    if (!currentRoomId || !currentUser) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    if (role === 'spectator') {
        await roomRef.update({
            [`players.${currentUser.uid}.role`]: 'spectator'
        });
    } else {
        try {
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) throw "房间不存在!";
                const roomData = roomDoc.data();
                const roleField = role === 'black' ? 'blackPlayerUID' : 'whitePlayerUID';
                if (roomData[roleField] !== null) throw `该角色 (${role}) 已被选择!`;
                
                const updateData = {
                    [roleField]: currentUser.uid,
                    [`players.${currentUser.uid}.role`]: role
                };
                const isBlackTaken = (role === 'black') || (roomData.blackPlayerUID !== null);
                const isWhiteTaken = (role === 'white') || (roomData.whitePlayerUID !== null);
                if (isBlackTaken && isWhiteTaken) {
                    let newGameState = 'playing';
                    let systemMessage = '双方就绪，游戏开始！黑棋先行。';
                    if (roomData.rules.opening) {
                        const firstMove = { x: 7, y: 7, player: 1 };
                        const newBoard = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
                        newBoard[firstMove.y * BOARD_SIZE + firstMove.x] = 1;
                        updateData.board = newBoard;
                        updateData.moveHistory = [firstMove];
                        updateData.turn = 2;
                        systemMessage = '专业开局：黑方已自动落子天元，轮到白方。';
                    }
                    updateData.gameState = newGameState;
                    await sendSystemMessage(systemMessage);
                }
                transaction.update(roomRef, updateData);
            });
        } catch (error) {
            console.error("选择角色失败: ", error);
            alert(error);
        }
    }
}

async function handleCanvasClick(e) {
    // 1. 获取 canvas 元素相对于视口的位置和其当前的显示尺寸
    const rect = canvas.getBoundingClientRect();

    // 2. 计算 canvas 的 CSS 显示尺寸与其内部绘图尺寸之间的真实比例
    //    这是解决 PC 和移动端因缩放导致偏移问题的关键
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 3. 将屏幕点击坐标从 "CSS 显示坐标系" 转换到 "canvas 内部绘图坐标系"
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // 4. 从转换后的 canvas 内部坐标计算出棋盘的格子索引 (x, y)
    const x = Math.floor(canvasX / CELL_SIZE);
    const y = Math.floor(canvasY / CELL_SIZE);

    // 确保点击在棋盘有效范围内
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

    // --- 后续所有游戏状态判断和落子逻辑保持完全不变 ---
    const roomRef = db.collection('rooms').doc(currentRoomId);
    switch (gameState) {
        case 'swap5_place':
            if (userRole !== 'black' || board[y][x] !== 0) return;
            const alreadyExists = tempSwap5Stones.some(s => s.x === x && s.y === y);
            if (alreadyExists) {
                tempSwap5Stones = tempSwap5Stones.filter(s => s.x !== x || s.y !== y);
            } else if (tempSwap5Stones.length < 2) {
                tempSwap5Stones.push({x, y});
            }
            drawBoard(); redrawStones(); drawHighlightStones(tempSwap5Stones.map(s => ({...s, color: 'blue'})));
            break;
        case 'swap5_select':
            if (userRole !== 'white') return;
            const choice = tempSwap5Stones.find(s => s.x === x && s.y === y);
            if (choice) {
                const finalMove = choice;
                let newBoardState = [...board].flat();
                newBoardState[finalMove.y * BOARD_SIZE + finalMove.x] = 1;
                await roomRef.update({
                    board: newBoardState,
                    moveHistory: firebase.firestore.FieldValue.arrayUnion({ ...finalMove, player: 1 }),
                    turn: 2,
                    gameState: 'playing',
                    swap5_temp_placements: null
                });
                await sendSystemMessage(`白方选择了 (${finalMove.x}, ${finalMove.y}) 作为第五手。`);
            }
            break;
        case 'kinte_adjudication_select':
            if (userRole !== 'white' || board[y][x] === 0) return;
            const stoneExists = tempKinteStones.some(s => s.x === x && s.y === y);
            if (stoneExists) {
                tempKinteStones = tempKinteStones.filter(s => s.x !== x || s.y !== y);
            } else {
                tempKinteStones.push({x, y});
            }
            drawBoard(); redrawStones(); drawHighlightStones(tempKinteStones);
            break;
        case 'playing':
            if (!['black', 'white'].includes(userRole)) return;
            const roomDocSnapshot = await db.collection('rooms').doc(currentRoomId).get();
            if (!roomDocSnapshot.exists) return;
            const roomData = roomDocSnapshot.data();
            if (roomData.retractRequest?.state === 'pending') {
                alert('有待处理的悔棋请求，请先回应！');
                return;
            }
            const myTurnNumber = userRole === 'black' ? 1 : 2;
            if (roomData.turn !== myTurnNumber || roomData.winner) return;
            if (board[y][x] !== 0) return;
            
            board[y][x] = myTurnNumber;
            const tempLocalHistory = [...moveHistory, { x, y, player: myTurnNumber }];
            drawBoard();
            tempLocalHistory.forEach((move, index) => drawStone(move.x, move.y, move.player, index + 1, index === tempLocalHistory.length - 1));

            const newBoardState = [...board].flat();
            const winner = checkWin(newBoardState);
            
            try {
                let nextTurn = myTurnNumber === 1 ? 2 : 1;
                let nextGameState = 'playing';
                if (roomData.rules.opening) {
                    const moveCount = roomData.moveHistory.length;
                    if (moveCount === 2 && myTurnNumber === 1) {
                        nextGameState = 'swap3_decision';
                    } else if (moveCount === 3 && myTurnNumber === 2) {
                        nextGameState = 'swap5_place';
                    }
                }
                
                await roomRef.update({
                    board: newBoardState,
                    turn: nextTurn,
                    winner: winner,
                    gameState: winner ? 'finished' : nextGameState,
                    lastMove: { x, y, player: myTurnNumber },
                    moveHistory: firebase.firestore.FieldValue.arrayUnion({ x, y, player: myTurnNumber }),
                    retractRequest: null 
                });
                if (winner) {
                    if (unsubscribe) unsubscribe();
                    if (messagesUnsubscribe) messagesUnsubscribe();
                }
            } catch (error) {
                console.error("落子失败，正在撤销操作: ", error);
                board[y][x] = 0;
                drawBoard();
                redrawStones();
            }
            break;
    }
}

// ... (函数的其余部分)

async function requestRetract() {
    if (!currentRoomId || !currentUser) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    try {
        await roomRef.update({
            retractRequest: {
                requesterUID: currentUser.uid,
                requesterName: username,
                state: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        });
        await sendSystemMessage(`${username} 请求悔棋。`);
    } catch(error) {
        console.error("请求悔棋失败: ", error);
    }
}

async function handleRetractResponse(didApprove) {
    if (!currentRoomId || !currentUser) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    try {
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) return;
        const { retractRequest } = roomDoc.data();
        if (!retractRequest) return;
        const requesterName = retractRequest.requesterName;
        if (!didApprove) {
            await roomRef.update({ retractRequest: null });
            await sendSystemMessage(`${username} 拒绝了 ${requesterName} 的悔棋请求。`);
            return;
        }
        await db.runTransaction(async (transaction) => {
            const freshRoomDoc = await transaction.get(roomRef);
            if (!freshRoomDoc.exists) throw "房间不存在!";
            let { board, moveHistory, turn, players } = freshRoomDoc.data();
            if (!moveHistory || moveHistory.length === 0) throw "没有可悔的棋步!";
            const lastMove = moveHistory[moveHistory.length - 1];
            const requesterPlayerNumber = players[retractRequest.requesterUID].role === 'black' ? 1 : 2;
            const move_to_undo = moveHistory.pop();
            board[move_to_undo.y * BOARD_SIZE + move_to_undo.x] = 0;
            turn = move_to_undo.player;
            if (lastMove.player !== requesterPlayerNumber && moveHistory.length > 0) {
                const move_to_undo_2 = moveHistory.pop();
                board[move_to_undo_2.y * BOARD_SIZE + move_to_undo_2.x] = 0;
                turn = move_to_undo_2.player;
            }
            transaction.update(roomRef, {
                board: board,
                moveHistory: moveHistory,
                turn: turn,
                retractRequest: null
            });
        });
        await sendSystemMessage(`${username} 同意了 ${requesterName} 的悔棋请求，棋盘已回退。`);
    } catch (error) {
        console.error("悔棋操作失败: ", error);
        alert("悔棋操作失败: " + error.message);
    }
}

async function handleSwap3Response(didSwap) {
    if (!currentRoomId) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    if (!didSwap) {
        await roomRef.update({ gameState: 'playing' });
        await sendSystemMessage(`${username} 选择不交换，继续执白。`);
        return;
    }
    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw "房间不存在!";
            const { players, blackPlayerUID, whitePlayerUID } = roomDoc.data();
            const originalBlackUsername = players[blackPlayerUID].username;
            const originalWhiteUsername = players[whitePlayerUID].username;
            transaction.update(roomRef, {
                'players': {
                    [blackPlayerUID]: { username: originalBlackUsername, role: 'white'},
                    [whitePlayerUID]: { username: originalWhiteUsername, role: 'black'}
                },
                'blackPlayerUID': whitePlayerUID,
                'whitePlayerUID': blackPlayerUID,
                'turn': 2,
                'gameState': 'playing'
            });
        });
        await sendSystemMessage(`${username} 选择交换！现在执黑。`);
    } catch (error) {
        console.error("三手交换失败:", error);
    }
}

async function handleConfirmSwap5Placements() {
    if (tempSwap5Stones.length !== 2) {
        alert("请准确选择两个落子点。");
        return;
    }
    if (!currentRoomId) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    await roomRef.update({
        gameState: 'swap5_select',
        swap5_temp_placements: tempSwap5Stones
    });
    await sendSystemMessage(`${username} (黑方) 提议了两个第五手落子点。`);
}

async function reportKinte() {
    if (!currentRoomId || userRole !== 'white') return;
    tempKinteStones = [];
    const roomRef = db.collection('rooms').doc(currentRoomId);
    await roomRef.update({ gameState: 'kinte_adjudication_select' });
    await sendSystemMessage(`${username} (白方) 发起了禁手检举。`);
}

async function cancelKinteReport() {
    if (!currentRoomId) return;
    tempKinteStones = [];
    const roomRef = db.collection('rooms').doc(currentRoomId);
    await roomRef.update({ gameState: 'playing' });
}

async function confirmKinteReport() {
    if (tempKinteStones.length === 0) {
        alert("请至少选择一个棋子作为禁手点。");
        return;
    }
    if (!currentRoomId) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    await roomRef.update({
        gameState: 'kinte_adjudication_decision',
        kinteReport: {
            reporterUID: currentUser.uid,
            reportedStones: tempKinteStones
        }
    });
}

async function handleKinteAdjudication(isKinte) {
    if (!currentRoomId) return;
    const roomRef = db.collection('rooms').doc(currentRoomId);
    if (isKinte) {
        await roomRef.update({
            winner: 2,
            gameState: 'finished',
            kinteReport: null
        });
        await sendSystemMessage(`黑方确认禁手，白方胜利！`);
    } else {
        await roomRef.update({
            gameState: 'playing',
            kinteReport: null
        });
        await sendSystemMessage(`黑方认为判断有误，游戏继续。`);
    }
}

async function handleRuleFormSubmit(e) {
    e.preventDefault();
    const rules = {
        kinte: enableKinteRuleCheckbox.checked,
        opening: enableOpeningRuleCheckbox.checked,
    };
    ruleSelectionModal.classList.add('hidden');
    await createRoom(rules);
}

async function exitRoom() {
    if (!currentRoomId || !currentUser) {
        // 如果没有房间信息，直接刷新页面
        window.location.reload();
        return;
    }
    const roomRef = db.collection('rooms').doc(currentRoomId);

    try {
        // 从房间数据中移除自己，并减少玩家计数
        await roomRef.update({
            [`players.${currentUser.uid}`]: firebase.firestore.FieldValue.delete(),
            playerCount: firebase.firestore.FieldValue.increment(-1)
        });
    } catch (error) {
        console.error("退出房间时更新数据失败: ", error);
    }

    // 直接刷新页面，返回主界面
    window.location.reload();
}

async function createRoom(rules) {
    if (!currentUser || !username) return;
    createRoomBtn.disabled = true;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentRoomId = roomId;
    try {
        await db.collection('rooms').doc(roomId).set({
            rules: rules,
            gameState: 'role_selection',
            players: {
                [currentUser.uid]: { username: username, role: null }
            },
            playerCount: 1,
            board: Array(BOARD_SIZE * BOARD_SIZE).fill(0),
            turn: 1,
            winner: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            blackPlayerUID: null,
            whitePlayerUID: null,
            moveHistory: [],
            retractRequest: null,
            kinteReport: null,
            swap5_temp_placements: null
        });
        enterGame(roomId);
    } catch (error) {
        console.error("创建房间失败: ", error);
        alert("创建房间失败，请重试。");
        createRoomBtn.disabled = false;
    }
}

async function joinRoom() {
    if (!currentUser || !username) return;
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!roomId) { alert("请输入房间号！"); return; }
    joinRoomBtn.disabled = true;
    joinRoomBtn.textContent = "加入中...";
    const roomRef = db.collection('rooms').doc(roomId);
    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw "房间不存在！";
            const roomData = roomDoc.data();
            if (!Object.keys(roomData.players).includes(currentUser.uid)) {
                transaction.update(roomRef, {
                    [`players.${currentUser.uid}`]: { username: username, role: null },
                    playerCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        });
        currentRoomId = roomId;
        enterGame(roomId);
    } catch (error) {
        console.error("加入房间失败: ", error);
        alert("加入房间失败: " + error);
        joinRoomBtn.disabled = false;
        joinRoomBtn.textContent = "加入房间";
    }
}

function enterGame(roomId) {
    roomControls.classList.add('hidden');
    gameInfo.classList.remove('hidden');
    chatContainer.classList.remove('hidden');
    roomIdDisplay.textContent = roomId;
    drawBoard();
    
    let previousMoveCount = 0; 

    unsubscribe = db.collection('rooms').doc(roomId).onSnapshot((doc) => {
        if (!doc.exists) {
            alert("房间已关闭或被删除。");
            window.location.reload();
            return;
        }
        const roomData = doc.data();
        gameState = roomData.gameState;
        
        board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
        moveHistory = roomData.moveHistory || [];
        moveHistory.forEach(move => {
            board[move.y][move.x] = move.player;
        });
        
        drawBoard();
        redrawStones();

        if (moveHistory.length > previousMoveCount) {
            moveSound.play().catch(error => {
                // 某些浏览器可能禁止自动播放音频，这行代码可以避免在控制台报错
                console.log("音效自动播放被浏览器阻止，需要用户与页面交互后才能播放。");
            });
        }
        previousMoveCount = moveHistory.length; 

        const players = roomData.players || {};
        let blackPlayerName = "虚位以待...";
        let whitePlayerName = "虚位以待...";
        const spectators = [];
        Object.values(players).forEach(p => {
            if (p.role === 'black') blackPlayerName = p.username;
            else if (p.role === 'white') whitePlayerName = p.username;
            else if (p.role === 'spectator') spectators.push(p.username);
        });
        playerOneInfo.textContent = `⚫️ ${blackPlayerName}`;
        playerTwoInfo.textContent = `⚪️ ${whitePlayerName}`;
        spectatorList.textContent = spectators.length > 0 ? spectators.join(', ') : '无';
        
        roleSelectionDiv.classList.add('hidden');
        gomokuBoard.classList.add('hidden');
        swap3Modal.classList.add('hidden');
        gameNotificationBar.classList.add('hidden');
        actionControls.querySelectorAll('button').forEach(btn => btn.classList.add('hidden'));

        const myPlayerData = players[currentUser.uid];
        userRole = myPlayerData?.role;

        const gameStarted = roomData.blackPlayerUID && roomData.whitePlayerUID;

        switch (gameState) {
            case 'role_selection':
                if (myPlayerData && !myPlayerData.role) {
                    roleSelectionDiv.classList.remove('hidden');
                }
                chooseBlackBtn.disabled = roomData.blackPlayerUID !== null;
                chooseWhiteBtn.disabled = roomData.whitePlayerUID !== null;
                gameStatus.textContent = '等待玩家选择黑白棋...';
                break;
            case 'swap3_decision':
                gomokuBoard.classList.remove('hidden');
                if (userRole === 'white') {
                    gameNotificationBar.classList.remove('hidden');
                    gameNotificationBar.innerHTML = `<p>对方已下第三手，您是否要交换执黑？</p>
                        <button id="swap3-yes-btn">是，交换执黑</button>
                        <button id="swap3-no-btn">否，继续执白</button>`;
                    document.getElementById('swap3-yes-btn').onclick = () => handleSwap3Response(true);
                    document.getElementById('swap3-no-btn').onclick = () => handleSwap3Response(false);
                }
                gameStatus.textContent = `等待 ${whitePlayerName} 决定是否交换...`;
                break;
            case 'swap5_place':
                tempSwap5Stones = [];
                gomokuBoard.classList.remove('hidden');
                if (userRole === 'black') {
                    confirmSwap5PlacementsBtn.classList.remove('hidden');
                    gameStatus.textContent = '请在棋盘上选择两个点作为五手两打。';
                } else {
                    gameStatus.textContent = `等待 ${blackPlayerName} 提出两个第五手落子点...`;
                }
                break;
            case 'swap5_select':
                gomokuBoard.classList.remove('hidden');
                tempSwap5Stones = roomData.swap5_temp_placements || [];
                drawHighlightStones(tempSwap5Stones.map(s => ({...s, color: 'blue'})));
                if (userRole === 'white') {
                    gameStatus.textContent = '请从两个蓝色标记中选择一个作为黑棋的第五手。';
                } else {
                    gameStatus.textContent = `等待 ${whitePlayerName} 选择第五手...`;

                }
                break;
            case 'kinte_adjudication_select':
                gomokuBoard.classList.remove('hidden');
                gameStatus.textContent = '检举禁手：请点击棋盘上构成禁手的棋子';
                if (userRole === 'white') {
                    confirmKinteReportBtn.classList.remove('hidden');
                    cancelKinteReportBtn.classList.remove('hidden');
                }
                break;
            case 'kinte_adjudication_decision':
                gomokuBoard.classList.remove('hidden');
                drawHighlightStones(roomData.kinteReport.reportedStones);
                if (userRole === 'black') {
                    gameNotificationBar.classList.remove('hidden');
                    gameNotificationBar.innerHTML = `<p>${whitePlayerName} 检举禁手，请确认。</p>
                        <button id="kinte-confirm-btn">确认禁手</button>
                        <button id="kinte-deny-btn">判断有误</button>`;
                    document.getElementById('kinte-confirm-btn').onclick = () => handleKinteAdjudication(true);
                    document.getElementById('kinte-deny-btn').onclick = () => handleKinteAdjudication(false);
                } else {
                    gameStatus.textContent = `等待 ${blackPlayerName} 回应禁手检举...`;
                }
                break;
            case 'playing':
            case 'finished':
                gomokuBoard.classList.remove('hidden');
                if (gameStarted && ['black', 'white'].includes(userRole)) {
                    retractRequestBtn.classList.remove('hidden');
                    if (roomData.rules.opening && roomData.moveHistory.length < 7) {
                        retractRequestBtn.disabled = true;
                    } else {
                        retractRequestBtn.disabled = roomData.retractRequest?.state === 'pending';
                    }
                    if (userRole === 'white' && roomData.rules.kinte) {
                        reportKinteBtn.classList.remove('hidden');
                        reportKinteBtn.disabled = roomData.turn !== 2;
                    }
                }
                const retractRequest = roomData.retractRequest;
                if (retractRequest?.state === 'pending') {
                    const opponentUID = retractRequest.requesterUID === roomData.blackPlayerUID ? roomData.whitePlayerUID : roomData.blackPlayerUID;
                    if (currentUser.uid === opponentUID) {
                        gameNotificationBar.classList.remove('hidden');
                        gameNotificationBar.innerHTML = `<p>${retractRequest.requesterName} 请求悔棋，是否同意？</p>
                            <button id="retract-approve-btn">同意</button>
                            <button id="retract-decline-btn">拒绝</button>`;
                        document.getElementById('retract-approve-btn').onclick = () => handleRetractResponse(true);
                        document.getElementById('retract-decline-btn').onclick = () => handleRetractResponse(false);
                    } else if (retractRequest.requesterUID === currentUser.uid) {
                        gameStatus.textContent = "等待对方回应悔棋请求...";
                    }
                } else if (roomData.winner) {
                    const winnerRole = roomData.winner === 1 ? '黑方' : '白方';
                    const winnerName = roomData.winner === 1 ? blackPlayerName : whitePlayerName;
                    gameStatus.textContent = `游戏结束! ${winnerRole} (${winnerName}) 胜利! 🎉`;
                    const endMatchExitBtn = document.getElementById('end-match-exit-btn');
                    if(endMatchExitBtn) {
                        endMatchExitBtn.classList.remove('hidden');
                    }
                    if(unsubscribe){unsubscribe(); unsubscribe = null;}
                    if(messagesUnsubscribe){messagesUnsubscribe(); messagesUnsubscribe = null;}
                } else if (!gameStarted) {
                     gameStatus.textContent = '等待玩家选择黑白棋...';
                } else {
                    const turnPlayerRole = roomData.turn === 1 ? 'black' : 'white';
                    const turnPlayerName = turnPlayerRole === 'black' ? blackPlayerName : whitePlayerName;
                    gameStatus.textContent = `轮到 ${turnPlayerName} (${turnPlayerRole === 'black' ? '⚫️' : '⚪️'}) 下棋`;
                }
                break;
        }
    });
    messagesUnsubscribe = db.collection('rooms').doc(roomId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    displayMessage(change.doc.data());
                }
            });
        });
}

// =================================================================
//  程序入口和事件监听
// =================================================================
window.addEventListener('load', () => {
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
    const savedUsername = sessionStorage.getItem('gomokuUsername');
    if (savedUsername) {
        username = savedUsername;
        usernameModal.classList.add('hidden'); 
    }

    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputName = usernameInput.value.trim();
        if (inputName) {
            username = inputName;
            sessionStorage.setItem('gomokuUsername', username); 
            usernameModal.classList.add('hidden');
            if (currentUser) {
                createRoomBtn.disabled = false;
                joinRoomBtn.disabled = false;
            }
        }
    });
    auth.signInAnonymously().then(userCredential => {
        currentUser = userCredential.user;
        if (username) {
            createRoomBtn.disabled = false;
            joinRoomBtn.disabled = false;
        }
    }).catch(error => {
        console.error("匿名登录失败:", error);
        alert("无法连接到游戏服务，请检查网络并刷新页面。");
    });
    createRoomBtn.addEventListener('click', () => {
        ruleSelectionModal.classList.remove('hidden');
    });
    ruleForm.addEventListener('submit', handleRuleFormSubmit);
    joinRoomBtn.addEventListener('click', joinRoom);
    chooseBlackBtn.addEventListener('click', () => handleRoleSelection('black'));
    chooseWhiteBtn.addEventListener('click', () => handleRoleSelection('white'));
    chooseSpectatorBtn.addEventListener('click', () => handleRoleSelection('spectator'));
    // swap3 按钮是动态创建的
    confirmSwap5PlacementsBtn.addEventListener('click', handleConfirmSwap5Placements);
    reportKinteBtn.addEventListener('click', reportKinte);
    confirmKinteReportBtn.addEventListener('click', confirmKinteReport);
    cancelKinteReportBtn.addEventListener('click', cancelKinteReport);
    canvas.addEventListener('click', handleCanvasClick);
    retractRequestBtn.addEventListener('click', requestRetract);
    const endMatchExitBtn = document.getElementById('end-match-exit-btn');
    if(endMatchExitBtn){
        endMatchExitBtn.addEventListener('click', exitRoom);
    }
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        if (messageText && currentRoomId) {
            db.collection('rooms').doc(currentRoomId).collection('messages').add({
                text: messageText,
                senderName: username,
                uid: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            chatInput.value = '';
        }
    });
    if (endMatchExitBtn) {
        endMatchExitBtn.addEventListener('click', exitRoom);
    }
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    drawBoard();
});

window.addEventListener('beforeunload', () => {
    if (unsubscribe) unsubscribe();
    if (messagesUnsubscribe) messagesUnsubscribe();
});