const rooms = {
    'event':    { id: 'event',    x: 1, y: 0, type: 'event',    color: 'purple', icon: '',   text: 'Тут будет событие.' },
    'boss':     { id: 'boss',     x: 2, y: 0, type: 'boss',     color: 'red',    icon: '💀', text: 'Тут сидит БОСС.' },
    'enemy2':   { id: 'enemy2',   x: 1, y: 1, type: 'enemy',    color: 'grey',   icon: '',   text: 'Второй скелет.' },
    'treasury': { id: 'treasury', x: 0, y: 2, type: 'treasury', color: 'yellow', icon: '👑', text: 'Сокровищница.' },
    'enemy1':   { id: 'enemy1',   x: 1, y: 2, type: 'enemy',    color: 'grey',   icon: '',   text: 'Первый скелет.' },
    'shop':     { id: 'shop',     x: 2, y: 2, type: 'shop',     color: 'blue',   icon: '💰', text: 'Магазин.' },
    'start':    { id: 'start',    x: 1, y: 3, type: 'start',    color: 'green',  icon: '',   text: 'Стартовая комната.' }
};

const connections = {
    'start': ['enemy1'], 'enemy1': ['start', 'treasury', 'shop', 'enemy2'],
    'treasury': ['enemy1'], 'shop': ['enemy1'],
    'enemy2': ['enemy1', 'event'], 'event': ['enemy2', 'boss'], 'boss': ['event']
};

const allItems = {
    'item_pair': { id: 'item_pair', name: 'Пара-бустер', icon: '👯', type: 'passive', pairBonus: 2, pairCount: 0 },
    'item_flat5': { id: 'item_flat5', name: 'Стеклянный козырь', icon: '💎', type: 'passive', flatBonus: 5 },
    'item_high': { id: 'item_high', name: 'Старший козырь', icon: '👑', type: 'passive', highBonus: true },
    'item_ones': { id: 'item_ones', name: 'Единичный козырь', icon: '1️⃣', type: 'passive', onesLogic: true }
};

const allTickets = {
    'ticket_reroll_own': { id: 'ticket_reroll_own', name: 'Переброс кубика', icon: '🎲', desc: 'Перебросить один свой кубик.', effect: 'reroll_own' },
    'ticket_reroll_enemy': { id: 'ticket_reroll_enemy', name: 'Порча кубика', icon: '💀', desc: 'Перебросить один кубик у противника.', effect: 'reroll_enemy' },
    'ticket_minus_one': { id: 'ticket_minus_one', name: 'Ослабление', icon: '📉', desc: 'Перевернуть значение кости на одном вашем кубе на 1 ниже.', effect: 'minus_one' },
    'ticket_heal': { id: 'ticket_heal', name: 'Аптечка', icon: '❤️', desc: 'Восполнить 2к6 пунктов здоровья.', effect: 'heal' }
};

let player = { 
    hp: 50, maxHp: 50, coins: 3, currentRoomId: 'start', visitedRooms: ['start'], defeatedEnemies: [],
    inventory: [], build: [null, null, null, null, null],
    ticketsInventory: [], piggyBank: 0, piggyBroken: false, shopStock: { ticketBought: false, itemBought: false },
    hideMapIcons: false // Флаг для события со свечой
};

let combat = {
    active: false, roomId: '', enemyName: 'Скелет', enemyHp: 20, enemyMaxHp: 20, enemyHasDef: false,
    dice: { enemyAtk: [], enemyDef: [], pAtk: [], pDef: [] },
    holds: { pAtk: [false,false,false,false,false], pDef: [false,false,false,false,false] },
    rerollUsed: false, selectedTicketIndex: null, bossMechanic: false, lockedDieIndex: -1
};

let currentLootItem = null; 

function getDynamicDesc(item) {
    if (item.id === 'item_pair') return `Увеличивает очки "Пары" на +${item.pairBonus}.`;
    if (item.id === 'item_flat5') return `Увеличивает урон от атаки на +5. (Шанс 1 к 6 сломаться).`;
    if (item.id === 'item_high') return `Добавляет к урону номинал старшей кубика вне комбинации.`;
    if (item.id === 'item_ones') return `Ваши единицы считаются за другое самое частое значение в комбинации.`;
    return '';
}

// --- ИНВЕНТАРЬ ---
function toggleInventory() {
    const inv = document.getElementById('inventory-screen');
    const map = document.getElementById('map-screen');
    if (inv.style.display === 'none' || inv.style.display === '') {
        inv.style.display = 'flex'; map.style.display = 'none'; renderInventory();
    } else {
        inv.style.display = 'none'; map.style.display = 'flex'; updateUI();
    }
}

function renderInventory() {
    const buildSlots = document.getElementById('build-slots'); buildSlots.innerHTML = '';
    player.build.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'build-slot' + (item ? ' filled' : '');
        if (item) { slot.innerHTML = `<span style="font-size:20px">${item.icon}</span><br>${item.name}`; slot.onclick = () => unequipItem(index); } 
        else { slot.innerHTML = 'Пусто'; }
        buildSlots.appendChild(slot);
    });

    const invList = document.getElementById('inventory-list'); invList.innerHTML = '';
    if (player.inventory.length === 0) invList.innerHTML = '<div style="color:#666; text-align:center; padding:10px;">Пусто</div>';
    player.inventory.forEach(item => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.innerHTML = `<div class="inv-item-header"><span class="icon">${item.icon}</span><span>${item.name}</span></div><div class="inv-item-desc">${getDynamicDesc(item)}</div>`;
        el.onclick = () => equipItem(item);
        invList.appendChild(el);
    });

    const ticketList = document.getElementById('ticket-list'); ticketList.innerHTML = '';
    if (player.ticketsInventory.length === 0) ticketList.innerHTML = '<div style="color:#666; text-align:center; padding:10px;">Нет билетов</div>';
    player.ticketsInventory.forEach(tick => {
        const el = document.createElement('div');
        el.className = 'ticket-item';
        el.innerHTML = `<span class="ticket-icon">${tick.icon}</span><div class="ticket-info"><span class="ticket-name">${tick.name}</span><span class="ticket-desc">${tick.desc}</span></div>`;
        ticketList.appendChild(el);
    });
}

function equipItem(item) {
    const emptyIndex = player.build.indexOf(null);
    if (emptyIndex !== -1) { player.build[emptyIndex] = item; player.inventory = player.inventory.filter(i => i.id !== item.id); renderInventory(); } 
    else { alert("Билд заполнен!"); }
}

function unequipItem(index) {
    const item = player.build[index];
    if (item) { player.inventory.push(item); player.build[index] = null; renderInventory(); }
}

// --- МАГАЗИН ---
function openShop() {
    document.getElementById('map-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'flex';
    renderShop();
}
function closeShop() {
    document.getElementById('shop-screen').style.display = 'none';
    document.getElementById('map-screen').style.display = 'flex';
    updateUI(); showText("Вы вышли из магазина.");
}

function renderShop() {
    const shopContainer = document.getElementById('shop-items'); shopContainer.innerHTML = '';
    if (!player.shopStock.ticketBought) {
        shopContainer.innerHTML += `<div class="shop-item"><div class="shop-item-info"><div class="shop-item-title">🎟️ Случайный билет</div><div class="shop-item-desc">Разовый расходник.</div></div><button class="btn-buy" onclick="buyTicket()">Купить <span>3 💰</span></button></div>`;
    }
    if (!player.shopStock.itemBought) {
        shopContainer.innerHTML += `<div class="shop-item"><div class="shop-item-info"><div class="shop-item-title">1️⃣ Единичный козырь</div><div class="shop-item-desc">${getDynamicDesc(allItems.item_ones)}</div></div><button class="btn-buy" onclick="buyItem()">Купить <span>15 💰</span></button></div>`;
    }

    const sellSection = document.createElement('div');
    sellSection.style.marginTop = "20px"; sellSection.innerHTML = `<h3>Твои вещи (Продажа)</h3>`;
    const invList = document.createElement('div'); invList.className = 'inventory-list'; invList.style.marginTop = "10px";
    player.inventory.forEach(item => {
        const el = document.createElement('div'); el.className = 'inv-item'; el.style.flexDirection = 'row'; el.style.alignItems = 'center';
        el.innerHTML = `<div class="inv-item-header"><span class="icon">${item.icon}</span><span>${item.name}</span></div>`;
        const btn = document.createElement('button'); btn.className = 'sell-btn'; btn.innerText = 'Продать (3💰)';
        btn.onclick = (e) => { e.stopPropagation(); sellItem(item); };
        el.appendChild(btn); invList.appendChild(el);
    });
    sellSection.appendChild(invList); shopContainer.appendChild(sellSection);

    const piggySection = document.getElementById('piggy-bank-section');
    if (player.piggyBroken) { piggySection.innerHTML = `<h3>🐷 Копилка</h3><p style="color:#F44336; font-weight:bold; text-align:center;">РАЗБИТА</p>`; } 
    else {
        piggySection.innerHTML = `<h3>🐷 Копилка</h3><p>Монет в копилке: <b>${player.piggyBank}</b></p>
            <div style="display: flex; gap: 10px;"><button class="btn-small" onclick="depositPiggy()">Кинуть 1 монету</button><button class="btn-small btn-danger" onclick="breakPiggy()">Разбить!</button></div>`;
    }
}

function buyTicket() { if (player.coins >= 3) { player.coins -= 3; const k = Object.keys(allTickets); player.ticketsInventory.push({...allTickets[k[Math.floor(Math.random()*k.length)]]}); player.shopStock.ticketBought = true; updateUI(); renderShop(); alert("Куплено!"); } else alert("Нет монет!"); }
function buyItem() { if (player.coins >= 15) { player.coins -= 15; player.inventory.push({...allItems['item_ones']}); player.shopStock.itemBought = true; updateUI(); renderShop(); alert("Куплено!"); } else alert("Нет монет!"); }
function sellItem(item) { if (confirm(`Продать ${item.name} за 3?`)) { player.coins += 3; player.inventory = player.inventory.filter(i => i.id !== item.id); updateUI(); renderShop(); } }
function depositPiggy() { if (!player.piggyBroken && player.coins > 0) { player.coins -= 1; player.piggyBank += 1; updateUI(); renderShop(); } else alert("Ошибка!"); }
function breakPiggy() { if (player.piggyBroken || player.piggyBank === 0) return alert("Пусто!"); let drop = Math.floor(Math.random()*11)+5; let act = Math.min(drop, player.piggyBank); player.coins += act; player.piggyBank -= act; player.piggyBroken = true; updateUI(); renderShop(); alert(`Получено ${act} монет!`); }

// --- МАТЕМАТИКА ---
function getCombo(diceArray, isPlayer = false, type = 'none') {
    if (!diceArray || diceArray.length === 0) return { name: 'Пустая', total: 0, logExtra: '' };
    let evalDice = [...diceArray];
    let logExtra = "";

    if (isPlayer && type === 'atk' && player.build.some(i => i && i.id === 'item_ones')) {
        let ones = evalDice.filter(d => d === 1).length;
        if (ones > 0) {
            let counts = {}; evalDice.filter(d => d !== 1).forEach(d => counts[d] = (counts[d] || 0) + 1);
            let maxC = 0, bestV = 1;
            for (let v in counts) { if (counts[v] > maxC) { maxC = counts[v]; bestV = Number(v); } }
            if (maxC > 0) evalDice = evalDice.map(d => d === 1 ? bestV : d);
        }
    }

    let counts = {}; evalDice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    let countsArray = Object.values(counts).sort((a, b) => b - a);
    let values = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let sum = 0, points = 0, name = 'Пустая', isPair = false;

    if (countsArray[0] === 5) { sum = values[0] * 5; points = 15; name = 'Покер'; }
    else if (countsArray[0] === 4) { sum = values.find(v => counts[v] === 4) * 4; points = 13; name = 'Каре'; }
    else if (countsArray[0] === 3 && countsArray[1] === 2) { sum = evalDice.reduce((a, b) => a + b, 0); points = 8; name = 'Фулл-хаус'; }
    else if (values.length === 5 && values[4] - values[0] === 4) { sum = evalDice.reduce((a, b) => a + b, 0); points = 10; name = 'Стрит'; }
    else if (countsArray[0] === 3) { sum = values.find(v => counts[v] === 3) * 3; points = 6; name = 'Сет'; }
    else if (countsArray[0] === 2 && countsArray[1] === 2) { values.forEach(v => { if (counts[v] === 2) sum += v * 2; }); points = 4; name = 'Две пары'; }
    else if (countsArray[0] === 2) { sum = values.find(v => counts[v] === 2) * 2; points = 2; name = 'Пара'; isPair = true; }

    let extraPoints = 0, extraSum = 0;
    if (isPlayer && type === 'atk') {
        player.build.forEach(item => {
            if (!item) return;
            if (item.id === 'item_pair' && isPair) { extraPoints += item.pairBonus; logExtra += ` [+${item.pairBonus}]`; }
            if (item.id === 'item_flat5') { extraPoints += item.flatBonus; logExtra += ` [+${item.flatBonus}]`; }
            if (item.id === 'item_high') {
                let used = {};
                if (name === 'Покер') used[values[0]] = 5; else if (name === 'Каре') used[values.find(v=>counts[v]===4)] = 4;
                else if (name === 'Фулл-хаус') { used[values.find(v=>counts[v]===3)] = 3; used[values.find(v=>counts[v]===2)] = 2; }
                else if (name === 'Стрит') { evalDice.forEach(d => used[d] = (used[d]||0)+1); }
                else if (name === 'Сет') used[values.find(v=>counts[v]===3)] = 3;
                else if (name === 'Две пары') { values.forEach(v => { if (counts[v]===2) used[v] = 2; }); }
                else if (name === 'Пара') used[values.find(v=>counts[v]===2)] = 2;
                
                let rem = [], temp = {...counts};
                for (let v in used) temp[v] -= used[v];
                for (let v in temp) { for (let i=0; i<temp[v]; i++) rem.push(Number(v)); }
                if (rem.length > 0) { let maxD = Math.max(...rem); extraSum += maxD; logExtra += ` [+${maxD} Козырь]`; }
            }
        });
    }
    return { name, total: Math.ceil((sum + extraSum) / 2) + points + extraPoints, isPair, logExtra };
}

// --- КАРТА И СОБЫТИЯ ---
function initGame() { createMapGrid(); updateUI(); }

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
        
        if (rooms[targetRoomId].type === 'treasury' && !player.defeatedEnemies.includes('treasury_looted')) {
            player.defeatedEnemies.push('treasury_looted'); triggerLoot(); return;
        }
        if (rooms[targetRoomId].type === 'shop') { openShop(); return; }
        if (rooms[targetRoomId].type === 'event' && !player.defeatedEnemies.includes('event_done')) {
            player.defeatedEnemies.push('event_done'); triggerEvent(); return;
        }
        if ((rooms[targetRoomId].type === 'enemy' || rooms[targetRoomId].type === 'boss') && !player.defeatedEnemies.includes(targetRoomId)) {
            startCombat(targetRoomId);
        } else { updateUI(); showText(rooms[targetRoomId].text); }
    }
}

function triggerEvent() {
    const events = [
        {
            title: "Зеркало",
            text: "Вы увидели себя в зеркале, и оно напоминает вам, что вы тоже являетесь фишкой, как и все в этом подземелье.",
            choices: [
                { text: "Всмотреться в зеркало", action: () => { showText("Сколько себя не разглядывай, всё ещё фишка. Ничего не происходит."); closeEvent(); } },
                { text: "Разбить зеркало", action: () => { player.hp = Math.max(1, player.hp - 5); updateUI(); showText("Вы разбиваете зеркало... Получено 5 урона."); closeEvent(); } },
                { text: "Игнорировать", action: () => { showText("Вы игнорируете зеркало. Кому интересно смотреть на свои круглые формы?"); closeEvent(); } }
            ]
        },
        {
            title: "Карта под фишкой",
            text: "Вы встречаете карту, которая лежит под фишкой и край её уголка торчит и просит, чтобы её достали.",
            choices: [
                { text: "Достать карту", action: () => { 
                    if (Math.random() < 0.8) { 
                        const k = Object.keys(allItems).filter(i => i !== 'item_ones'); // Из пула сокровищницы
                        player.inventory.push({...allItems[k[Math.floor(Math.random()*k.length)]]});
                        showText("Вы достали карту! Теперь она может уйти под ваш билд!"); 
                    } else { showText("Карта рвётся и вы получаете бесполезный клочёк бумаги."); }
                    closeEvent(); 
                } },
                { text: "Игнорировать", action: () => { showText("Пытаться доставать карты из-под фишек слишком страшно для вас."); closeEvent(); } }
            ]
        },
        {
            title: "Свеча",
            text: "В центре комнаты парит какая-то свеча. Интересно какая магия её удерживает?",
            choices: [
                { text: "Задуть свечку", action: () => { 
                    player.hideMapIcons = true;
                    updateUI();
                    showText("Подземелье погружается во тьму… Теперь вы видите чуть хуже."); 
                    closeEvent(); 
                } },
                { text: "Не задувать свечку", action: () => { showText("Чтож… Вы оставили всё как есть. Опасно экспериментировать с магией."); closeEvent(); } }
            ]
        }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    document.getElementById('event-title').innerText = ev.title;
    document.getElementById('event-text').innerText = ev.text;
    
    const choicesContainer = document.getElementById('event-choices');
    choicesContainer.innerHTML = '';
    ev.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'event-choice-btn';
        btn.innerText = choice.text;
        btn.onclick = choice.action;
        choicesContainer.appendChild(btn);
    });

    document.getElementById('event-modal').style.display = 'flex';
}

function closeEvent() {
    document.getElementById('event-modal').style.display = 'none';
    updateUI();
}

function triggerLoot() {
    const pool = ['item_pair', 'item_flat5', 'item_high'];
    currentLootItem = { ...allItems[pool[Math.floor(Math.random() * pool.length)]] };
    document.getElementById('loot-item-display').innerHTML = `<span class="icon">${currentLootItem.icon}</span><div class="title">${currentLootItem.name}</div><div class="desc">${getDynamicDesc(currentLootItem)}</div>`;
    document.getElementById('loot-modal').style.display = 'flex';
}

function claimLoot() {
    if (currentLootItem) {
        player.inventory.push(currentLootItem); currentLootItem = null;
        document.getElementById('loot-modal').style.display = 'none';
        updateUI(); showText("Вы забрали предмет в сумку.");
    }
}

function updateUI() {
    document.getElementById('ui-hp').innerText = player.hp;
    document.getElementById('ui-coins').innerText = player.coins;
    document.getElementById('ui-tickets').innerText = player.ticketsInventory.length;

    Object.keys(rooms).forEach(id => {
        const el = document.getElementById(`room-${id}`);
        el.className = `room ${rooms[id].color}`; 
        el.innerHTML = player.hideMapIcons ? '' : rooms[id].icon; // Скрываем иконки, если свеча задута
        
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

// --- БОЙ ---
function updateCombatBuildDisplay() {
    const display = document.getElementById('combat-build-display'); if (!display) return;
    display.innerHTML = '';
    player.build.forEach(item => { if (item) { const el = document.createElement('div'); el.className = 'combat-build-item'; el.innerText = item.icon; el.title = item.name; display.appendChild(el); } });
}

function renderCombatTickets() {
    const container = document.getElementById('combat-tickets-list'); container.innerHTML = '';
    if (player.ticketsInventory.length === 0) { container.innerHTML = '<span style="font-size:12px; color:#666;">Нет билетов</span>'; return; }
    player.ticketsInventory.forEach((tick, index) => {
        const btn = document.createElement('div');
        btn.className = 'combat-ticket-btn' + (combat.selectedTicketIndex === index ? ' active' : '');
        btn.innerHTML = `${tick.icon}<span class="combat-ticket-name">${tick.name}</span>`;
        btn.onclick = () => useTicket(index);
        container.appendChild(btn);
    });
}

function useTicket(index) {
    if (!combat.active) return;
    let ticket = player.ticketsInventory[index];
    if (ticket.effect === 'heal') {
        let heal = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        document.getElementById('player-hp').innerText = player.hp;
        document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
        player.ticketsInventory.splice(index, 1); combat.selectedTicketIndex = null; renderCombatTickets();
        document.getElementById('combat-log').innerText = `Использован билет [${ticket.name}]. Вы восстановили ${heal} HP!`;
        return;
    }
    if (combat.selectedTicketIndex === index) { combat.selectedTicketIndex = null; document.getElementById('combat-log').innerText = "Использование отменено."; } 
    else { combat.selectedTicketIndex = index; document.getElementById('combat-log').innerText = `Выбран [${ticket.name}]. ${ticket.desc} Кликните по кубику.`; }
    renderCombatTickets(); renderCombatDice();
}

function applyTicketToDie(diceType, index) {
    if (combat.selectedTicketIndex === null) return;
    let ticket = player.ticketsInventory[combat.selectedTicketIndex];
    let valid = false;

    if (ticket.effect === 'reroll_own' && (diceType === 'pAtk' || diceType === 'pDef')) { combat.dice[diceType][index] = Math.floor(Math.random()*6)+1; valid = true; } 
    else if (ticket.effect === 'minus_one' && (diceType === 'pAtk' || diceType === 'pDef')) { combat.dice[diceType][index] = Math.max(1, combat.dice[diceType][index]-1); valid = true; } 
    else if (ticket.effect === 'reroll_enemy' && (diceType === 'enemyAtk' || diceType === 'enemyDef')) { combat.dice[diceType][index] = Math.floor(Math.random()*6)+1; valid = true; }

    if (valid) {
        player.ticketsInventory.splice(combat.selectedTicketIndex, 1); combat.selectedTicketIndex = null;
        document.getElementById('combat-log').innerText = `Билет [${ticket.name}] применен!`;
        renderCombatTickets(); renderCombatDice(); updatePreviews();
    } else { document.getElementById('combat-log').innerText = "Этот кубик не подходит!"; }
}

function startCombat(roomId) {
    combat.active = true; combat.roomId = roomId; combat.rerollUsed = false; combat.selectedTicketIndex = null; combat.lockedDieIndex = -1;
    player.build.forEach(item => { if(item && item.id === 'item_pair') item.pairCount = 0; });

    if (roomId === 'enemy1') { combat.enemyName = '💀 Скелет-Атакер'; combat.enemyHp = 20; combat.enemyMaxHp = 20; combat.enemyHasDef = false; combat.bossMechanic = false; } 
    else if (roomId === 'enemy2') { combat.enemyName = '💀 Скелет-Защитник'; combat.enemyHp = 25; combat.enemyMaxHp = 25; combat.enemyHasDef = true; combat.bossMechanic = false; } 
    else if (roomId === 'boss') { combat.enemyName = '👑 БОСС-Скелет'; combat.enemyHp = 30; combat.enemyMaxHp = 30; combat.enemyHasDef = true; combat.bossMechanic = true; }

    document.getElementById('enemy-name').innerText = combat.enemyName;
    document.getElementById('enemy-hp').innerText = combat.enemyHp;
    document.getElementById('enemy-max-hp').innerText = combat.enemyMaxHp;
    document.getElementById('enemy-def-container').style.display = combat.enemyHasDef ? 'block' : 'none';

    document.getElementById('map-screen').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'flex';
    document.getElementById('player-hp').innerText = player.hp;
    document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('btn-roll').style.display = 'block';
    document.getElementById('btn-fight').style.display = 'none';
    document.getElementById('combat-log').innerText = `${combat.enemyName} готовится к бою...`;
    
    updateCombatBuildDisplay(); renderCombatTickets(); resetDice(); renderCombatDice(); updatePreviews();
}

function rollDiceArray() { return [1,1,1,1,1].map(() => Math.floor(Math.random() * 6) + 1); }
function resetDice() { combat.dice = { enemyAtk: [1,1,1,1,1], enemyDef: [1,1,1,1,1], pAtk: [1,1,1,1,1], pDef: [1,1,1,1,1] }; }

function startTurn() {
    combat.selectedTicketIndex = null; combat.lockedDieIndex = -1;
    renderCombatTickets();
    
    combat.dice.enemyAtk = rollDiceArray(); if (combat.enemyHasDef) combat.dice.enemyDef = rollDiceArray();
    combat.dice.pAtk = rollDiceArray(); combat.dice.pDef = rollDiceArray();
    combat.holds.pAtk = [false,false,false,false,false]; combat.holds.pDef = [false,false,false,false,false];
    combat.rerollUsed = false;

    // МЕХАНИКА БОССА: Блокируем самый слабый кубик в атаке
    if (combat.bossMechanic) {
        let minVal = Math.min(...combat.dice.pAtk);
        let minIndex = combat.dice.pAtk.indexOf(minVal);
        combat.lockedDieIndex = minIndex;
        combat.holds.pAtk[minIndex] = true; // Автоматически "оставляем" его
        document.getElementById('combat-log').innerText = "Босс запрещает перебрасывать вашу самую слабую атаку (🔒)!";
    } else {
        document.getElementById('combat-log').innerText = "Выберите кубики для переброса или бейте!";
    }
    
    document.getElementById('btn-roll').style.display = 'none';
    document.getElementById('btn-fight').style.display = 'block';
    document.getElementById('btn-reroll-atk').disabled = false;
    document.getElementById('btn-reroll-def').disabled = false;
    
    renderCombatDice(); updatePreviews();
}

function toggleHold(type, index) {
    if (combat.rerollUsed || combat.selectedTicketIndex !== null) return;
    if (type === 'pAtk' && index === combat.lockedDieIndex) return; // Нельзя трогать кубик босса
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
        // Если это атака и кубик заблокирован боссом, мы его не перебрасываем
        if (type === 'atk' && i === combat.lockedDieIndex) continue;
        if (!holds[i]) arr[i] = Math.floor(Math.random() * 6) + 1; 
    }
    document.getElementById('combat-log').innerText = `Вы перебросили ${type === 'atk' ? 'Атаку' : 'Защиту'}. Бейте!`;
    renderCombatDice(); updatePreviews();
}

function resolveTurn() {
    let pAtk = getCombo(combat.dice.pAtk, true, 'atk'); 
    let pDef = getCombo(combat.dice.pDef, true, 'def');
    let eAtk = getCombo(combat.dice.enemyAtk, false);
    let eDef = combat.enemyHasDef ? getCombo(combat.dice.enemyDef, false) : { total: 0 };

    player.build.forEach(item => { if (item && item.id === 'item_pair' && pAtk.isPair) { item.pairCount++; item.pairBonus++; } });

    let dmgToEnemy = Math.max(0, pAtk.total - eDef.total);
    combat.enemyHp -= dmgToEnemy;
    if (combat.enemyHp < 0) combat.enemyHp = 0;
    document.getElementById('enemy-hp').innerText = combat.enemyHp;
    let log = `Ты бьешь на ${pAtk.total} (${pAtk.name}${pAtk.logExtra}). Враг блокирует ${eDef.total}. Проходит ${dmgToEnemy}. `;

    if (combat.enemyHp <= 0) {
        document.getElementById('btn-fight').style.display = 'none';
        log += `Враг разваливается! Победа!`;
        document.getElementById('combat-log').innerText = log;
        setTimeout(winCombat, 1500); return;
    }

    let dmgToPlayer = Math.max(0, eAtk.total - pDef.total);
    player.hp -= dmgToPlayer;
    if (player.hp < 1) player.hp = 1; // Божественное вмешательство

    document.getElementById('player-hp').innerText = player.hp;
    document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
    log += `Враг бьет на ${eAtk.total}. Твоя защита ${pDef.total}. Ты получаешь ${dmgToPlayer}.`;
    document.getElementById('combat-log').innerText = log;

    document.getElementById('btn-fight').style.display = 'none';
    document.getElementById('btn-roll').style.display = 'block';
    document.getElementById('btn-roll').innerText = "Следующий раунд";
}

function winCombat() {
    if (!combat.active) return; 
    combat.active = false; combat.selectedTicketIndex = null;
    player.defeatedEnemies.push(player.currentRoomId);
    
    let brokenItemName = ""; let brokenItemIndex = -1;
    player.build.forEach((item, index) => {
        if (item && item.id === 'item_flat5' && Math.floor(Math.random() * 6) === 0) { brokenItemIndex = index; brokenItemName = item.name; }
    });
    if (brokenItemIndex !== -1) player.build[brokenItemIndex] = null;

    if (combat.roomId === 'boss') {
        document.getElementById('victory-screen').style.display = 'flex';
        return;
    }

    let rewardText = "";
    if (combat.roomId === 'enemy1') {
        let coins = Math.floor(Math.random() * 3) + 1; player.coins += coins; rewardText = `Вы победили скелета и нашли ${coins} монет(ы)!`;
    } else if (combat.roomId === 'enemy2') {
        const k = Object.keys(allTickets); player.ticketsInventory.push({...allTickets[k[Math.floor(Math.random()*k.length)]]}); 
        rewardText = `Вы победили защитника и нашли Билет!`;
    }
    
    document.getElementById('map-screen').style.display = 'flex';
    document.getElementById('combat-screen').style.display = 'none';
    updateUI();
    if (brokenItemName) showText(`💎 Ваш ${brokenItemName} сломался! ` + rewardText);
    else showText(rewardText);
}

function renderCombatDice() {
    const renderPool = (diceArr, containerId, isPlayer, type) => {
        const container = document.getElementById(containerId); if(!container) return; container.innerHTML = '';
        diceArr.forEach((val, i) => {
            const d = document.createElement('div'); d.className = 'die'; d.innerText = val;
            
            if (!isPlayer) {
                d.classList.add('enemy');
                if (combat.selectedTicketIndex !== null && player.ticketsInventory[combat.selectedTicketIndex].effect === 'reroll_enemy') { d.classList.add('targetable'); d.onclick = () => applyTicketToDie(type, i); }
            } else {
                // Если это кубик, заблокированный боссом
                if (type === 'pAtk' && i === combat.lockedDieIndex) { d.classList.add('locked-by-boss'); }
                
                if (combat.selectedTicketIndex !== null && (player.ticketsInventory[combat.selectedTicketIndex].effect === 'reroll_own' || player.ticketsInventory[combat.selectedTicketIndex].effect === 'minus_one')) {
                    d.classList.add('targetable'); d.onclick = () => applyTicketToDie(type, i);
                } else {
                    if (combat.holds[type][i]) d.classList.add('held'); 
                    d.onclick = () => toggleHold(type, i);
                }
            }
            container.appendChild(d);
        });
    };
    renderPool(combat.dice.enemyAtk, 'enemy-dice', false, 'enemyAtk');
    if (combat.enemyHasDef) renderPool(combat.dice.enemyDef, 'enemy-def-dice', false, 'enemyDef');
    renderPool(combat.dice.pAtk, 'player-atk-dice', true, 'pAtk');
    renderPool(combat.dice.pDef, 'player-def-dice', true, 'pDef');
}

function updatePreviews() {
    document.getElementById('preview-atk').innerText = getCombo(combat.dice.pAtk, true, 'atk').total;
    document.getElementById('preview-def').innerText = getCombo(combat.dice.pDef, true, 'def').total;
    document.getElementById('enemy-atk-total').innerText = getCombo(combat.dice.enemyAtk, false).total;
    if (combat.enemyHasDef) document.getElementById('enemy-def-total').innerText = getCombo(combat.dice.enemyDef, false).total;
}

function restartGame() {
    location.reload(); // Самый простой и надежный способ для прототипа
}

window.onload = initGame;
