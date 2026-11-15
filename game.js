const rooms = {
    'event':    { id: 'event',    x: 1, y: 0, type: 'event',    color: 'purple', icon: '',   text: 'Тут будет событие.' },
    'boss':     { id: 'boss',     x: 2, y: 0, type: 'boss',     color: 'red',    icon: '💀', text: 'Тут сидит БОСС.' },
    'enemy2':   { id: 'enemy2',   x: 1, y: 1, type: 'enemy',    color: 'grey',   icon: '',   text: 'Второй скелет. Сначала посети сокровищницу и магазин!' },
    'treasury': { id: 'treasury', x: 0, y: 2, type: 'treasury', color: 'yellow', icon: '👑', text: 'Сокровищница. Тут дают предмет.' },
    'enemy1':   { id: 'enemy1',   x: 1, y: 2, type: 'enemy',    color: 'grey',   icon: '',   text: 'Первый скелет. Тут будет бой.' },
    'shop':     { id: 'shop',     x: 2, y: 2, type: 'shop',     color: 'blue',   icon: '💰', text: 'Магазин. Тут можно купить билет.' },
    'start':    { id: 'start',    x: 1, y: 3, type: 'start',    color: 'green',  icon: '',   text: 'Стартовая комната.' }
};

const connections = {
    'start':    ['enemy1'], 'enemy1':   ['start', 'treasury', 'shop', 'enemy2'],
    'treasury': ['enemy1'], 'shop':     ['enemy1'],
    'enemy2':   ['enemy1', 'event'], 'event': ['enemy2', 'boss'], 'boss': ['event']
};

let player = { hp: 50, maxHp: 50, coins: 3, currentRoomId: 'start', visitedRooms: ['start'], defeatedEnemies: [] };

// --- БОЕВАЯ СИСТЕМА ---
let combat = {
    active: false,
    enemyHp: 20,
    enemyMaxHp: 20,
    turn: 0,
    dice: { enemy: [1,1,1,1,1], pAtk: [1,1,1,1,1], pDef: [1,1,1,1,1] },
    holds: { pAtk: [false,false,false,false,false], pDef: [false,false,false,false,false] },
    rerollUsed: false
};

// Функция расчета комбинации
function getCombo(diceArray) {
    let counts = {}; diceArray.forEach(d => counts[d] = (counts[d] || 0) + 1);
    let countsArray = Object.values(counts).sort((a, b) => b - a);
    let values = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let sum = 0, points = 0, name = 'Пустая';

    if (countsArray[0] === 5) { let v = values[0]; sum = v * 5; points = 15; name = 'Покер'; }
    else if (countsArray[0] === 4) { let v = values.find(v => counts[v] === 4); sum = v * 4; points = 13; name = 'Каре'; }
    else if (countsArray[0] === 3 && countsArray[1] === 2) { sum = diceArray.reduce((a, b) => a + b, 0); points = 8; name = 'Фулл-хаус'; }
    else if (values.length === 5 && values[4] - values[0] === 4) { sum = diceArray.reduce((a, b) => a + b, 0); points = 10; name = 'Стрит'; }
    else if (countsArray[0] === 3) { let v = values.find(v => counts[v] === 3); sum = v * 3; points = 6; name = 'Сет'; }
    else if (countsArray[0] === 2 && countsArray[1] === 2) { values.forEach(v => { if (counts[v] === 2) sum += v * 2; }); points = 4; name = 'Две пары'; }
    else if (countsArray[0] === 2) { let v = values.find(v => counts[v] === 2); sum = v * 2; points = 2; name = 'Пара'; }

    return { name, total: Math.ceil(sum / 2) + points };
}

// --- ЛОГИКА КАРТЫ ---
function initGame() {
    createMapGrid();
    updateUI();
}

function createMapGrid() {
    const container = document.getElementById('map-container');
    const grid = document.createElement('div'); grid.id = 'map-grid';
    Object.values(rooms).forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.id = `room-${room.id}`; roomDiv.className = `room ${room.color}`; roomDiv.innerHTML = room.icon;
        roomDiv.style.gridColumn = room.x + 1; roomDiv.style.gridRow = room.y + 1;
        roomDiv.onclick = () => tryMoveTo(room.id);
        grid.appendChild(roomDiv);
    });
    container.appendChild(grid);
}

function canMoveTo(targetRoomId) {
    if (targetRoomId === player.currentRoomId) return false;
    if (!connections[player.currentRoomId].includes(targetRoomId)) return false;
    if (targetRoomId === 'enemy2' && (!player.visitedRooms.includes('treasury') || !player.visitedRooms.includes('shop'))) {
        showText("Сначала нужно посетить Сокровищницу и Магазин!"); return false;
    }
    return true;
}

function tryMoveTo(targetRoomId) {
    if (canMoveTo(targetRoomId)) {
        player.currentRoomId = targetRoomId;
        if (!player.visitedRooms.includes(targetRoomId)) player.visitedRooms.push(targetRoomId);
        
        // Если это комната с врагом и мы его еще не били
        if (rooms[targetRoomId].type === 'enemy' && !player.defeatedEnemies.includes(targetRoomId)) {
            startCombat(targetRoomId);
        } else {
            updateUI();
            showText(rooms[targetRoomId].text);
        }
    }
}

function updateUI() {
    document.getElementById('ui-hp').innerText = player.hp;
    document.getElementById('ui-coins').innerText = player.coins;
    Object.keys(rooms).forEach(id => {
        const el = document.getElementById(`room-${id}`);
        el.className = `room ${rooms[id].color}`; el.innerHTML = rooms[id].icon;
        const isCurrent = id === player.currentRoomId;
        const isVisited = player.visitedRooms.includes(id);
        const isAvailable = connections[player.currentRoomId].includes(id);
        let isLocked = (id === 'enemy2' && (!player.visitedRooms.includes('treasury') || !player.visitedRooms.includes('shop')));

        if (isCurrent) el.classList.add('current');
        else if (isAvailable && !isLocked) el.classList.add('available');
        else if (isVisited) { el.classList.add('visited'); if (isLocked) el.classList.add('locked'); }
        else if (isLocked) el.classList.add('locked');
    });
}

function showText(text) { document.getElementById('room-text').innerText = text; }

// --- БОЕВАЯ ЛОГИКА ---
function startCombat(roomId) {
    combat.active = true;
    combat.enemyHp = 20; combat.enemyMaxHp = 20;
    combat.rerollUsed = false;
    document.getElementById('map-screen').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'flex';
    document.getElementById('enemy-hp').innerText = combat.enemyHp;
    document.getElementById('player-hp').innerText = player.hp;
    document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
    
    document.getElementById('btn-roll').style.display = 'block';
    document.getElementById('btn-fight').style.display = 'none';
    document.getElementById('combat-log').innerText = "Скелет готовится к бою...";
    renderCombatDice(true);
}

function rollDiceArray() {
    return [1,1,1,1,1].map(() => Math.floor(Math.random() * 6) + 1);
}

function startTurn() {
    combat.dice.enemy = rollDiceArray();
    combat.dice.pAtk = rollDiceArray();
    combat.dice.pDef = rollDiceArray();
    combat.holds.pAtk = [false,false,false,false,false];
    combat.holds.pDef = [false,false,false,false,false];
    combat.rerollUsed = false;
    
    document.getElementById('btn-roll').style.display = 'none';
    document.getElementById('btn-fight').style.display = 'block';
    document.getElementById('btn-reroll-atk').disabled = false;
    document.getElementById('btn-reroll-def').disabled = false;
    document.getElementById('combat-log').innerText = "Выберите кубики для переброса или бейте!";
    renderCombatDice();
}

function toggleHold(type, index) {
    if (combat.rerollUsed) return;
    combat.holds[type][index] = !combat.holds[type][index];
    renderCombatDice();
}

function reroll(type) {
    if (combat.rerollUsed) return;
    combat.rerollUsed = true;
    document.getElementById('btn-reroll-atk').disabled = true;
    document.getElementById('btn-reroll-def').disabled = true;

    let arr = type === 'atk' ? combat.dice.pAtk : combat.dice.pDef;
    let holds = type === 'atk' ? combat.holds.pAtk : combat.holds.pDef;
    
    for(let i=0; i<5; i++) {
        if (!holds[i]) arr[i] = Math.floor(Math.random() * 6) + 1;
    }
    document.getElementById('combat-log').innerText = `Вы перебросили ${type === 'atk' ? 'Атаку' : 'Защиту'}. Бейте!`;
    renderCombatDice();
}

function resolveTurn() {
    let pAtk = getCombo(combat.dice.pAtk);
    let pDef = getCombo(combat.dice.pDef);
    let eAtk = getCombo(combat.dice.enemy);

    let dmgToEnemy = pAtk.total;
    combat.enemyHp -= dmgToEnemy;
    if (combat.enemyHp < 0) combat.enemyHp = 0;
    document.getElementById('enemy-hp').innerText = combat.enemyHp;

    let log = `Ты атакуешь на ${dmgToEnemy} (${pAtk.name}). `;

    if (combat.enemyHp <= 0) {
        log += `Скелет разваливается! Победа!`;
        document.getElementById('combat-log').innerText = log;
        setTimeout(winCombat, 1500);
        return;
    }

    let dmgToPlayer = Math.max(0, eAtk.total - pDef.total);
    player.hp -= dmgToPlayer;
    if (player.hp < 1) player.hp = 1; // Божественное вмешательство (туториал)

    document.getElementById('player-hp').innerText = player.hp;
    document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
    
    log += `Скелет бьет на ${eAtk.total}. Твоя защита ${pDef.total} (${pDef.name}). Ты получаешь ${dmgToPlayer} урона.`;
    document.getElementById('combat-log').innerText = log;

    document.getElementById('btn-fight').style.display = 'none';
    document.getElementById('btn-roll').style.display = 'block';
    document.getElementById('btn-roll').innerText = "Следующий раунд";
}

function winCombat() {
    combat.active = false;
    player.defeatedEnemies.push(player.currentRoomId);
    
    // Награда
    let coins = Math.floor(Math.random() * 3) + 1;
    player.coins += coins;
    
    document.getElementById('map-screen').style.display = 'flex';
    document.getElementById('combat-screen').style.display = 'none';
    updateUI();
    showText(`Вы победили скелета и нашли ${coins} монет(ы)!`);
}

function renderCombatDice(reset = false) {
    if (reset) {
        combat.dice.enemy = [1,1,1,1,1];
        combat.dice.pAtk = [1,1,1,1,1];
        combat.dice.pDef = [1,1,1,1,1];
    }

    const renderPool = (diceArr, containerId, isPlayer, type) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        diceArr.forEach((val, i) => {
            const d = document.createElement('div');
            d.className = 'die'; d.innerText = val;
            if (!isPlayer) d.classList.add('enemy');
            else {
                if (combat.holds[type][i]) d.classList.add('held');
                d.onclick = () => toggleHold(type, i);
            }
            container.appendChild(d);
        });
    };

    renderPool(combat.dice.enemy, 'enemy-dice', false);
    renderPool(combat.dice.pAtk, 'player-atk-dice', true, 'pAtk');
    renderPool(combat.dice.pDef, 'player-def-dice', true, 'pDef');
}

window.onload = initGame;
