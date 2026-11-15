// Данные о комнатах (пока хардкод для обучения)
const rooms = {
    'event':    { id: 'event',    x: 1, y: 0, type: 'event',    color: 'purple', icon: '',   text: 'Тут будет событие.' },
    'boss':     { id: 'boss',     x: 2, y: 0, type: 'boss',     color: 'red',    icon: '💀', text: 'Тут сидит БОСС.' },
    'enemy2':   { id: 'enemy2',   x: 1, y: 1, type: 'enemy',    color: 'grey',   icon: '',   text: 'Второй скелет. Сначала посети сокровищницу и магазин!' },
    'treasury': { id: 'treasury', x: 0, y: 2, type: 'treasury', color: 'yellow', icon: '👑', text: 'Сокровищница. Тут дают предмет.' },
    'enemy1':   { id: 'enemy1',   x: 1, y: 2, type: 'enemy',    color: 'grey',   icon: '',   text: 'Первый скелет. Тут будет бой.' },
    'shop':     { id: 'shop',     x: 2, y: 2, type: 'shop',     color: 'blue',   icon: '💰', text: 'Магазин. Тут можно купить билет.' },
    'start':    { id: 'start',    x: 1, y: 3, type: 'start',    color: 'green',  icon: '',   text: 'Стартовая комната. Добро пожаловать.' }
};

// Связи между комнатами (кто с кем граничит)
const connections = {
    'start':    ['enemy1'],
    'enemy1':   ['start', 'treasury', 'shop'],
    'treasury': ['enemy1', 'enemy2'],
    'shop':     ['enemy1', 'enemy2'],
    'enemy2':   ['treasury', 'shop', 'event'],
    'event':    ['enemy2', 'boss'],
    'boss':     ['event']
};

// Состояние игры
let player = {
    hp: 50,
    coins: 3,
    currentRoomId: 'start',
    visitedRooms: ['start']
};

// Инициализация и отрисовка
function initGame() {
    createMapGrid();
    updateUI();
}

function createMapGrid() {
    const container = document.getElementById('map-container');
    
    // Создаем сетку
    const grid = document.createElement('div');
    grid.id = 'map-grid';

    // Проходимся по всем комнатам и расставляем их по координатам
    Object.values(rooms).forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.id = `room-${room.id}`;
        roomDiv.className = `room ${room.color}`;
        roomDiv.innerHTML = room.icon;
        
        // Позиционирование в Grid (1-based index)
        roomDiv.style.gridColumn = room.x + 1;
        roomDiv.style.gridRow = room.y + 1;

        // Клик по комнате
        roomDiv.onclick = () => tryMoveTo(room.id);

        grid.appendChild(roomDiv);
    });

    container.appendChild(grid);
}

// Проверка, можно ли перейти в комнату
function canMoveTo(targetRoomId) {
    if (targetRoomId === player.currentRoomId) return false;

    // 1. Проверяем, есть ли вообще проход
    if (!connections[player.currentRoomId].includes(targetRoomId)) return false;

    // 2. Особые условия (Гейт для второй комнаты с врагом)
    if (targetRoomId === 'enemy2') {
        const visitedTreasury = player.visitedRooms.includes('treasury');
        const visitedShop = player.visitedRooms.includes('shop');
        if (!visitedTreasury || !visitedShop) {
            showText("Сначала нужно посетить Сокровищницу и Магазин!");
            return false;
        }
    }

    return true;
}

// Попытка перехода
function tryMoveTo(targetRoomId) {
    if (canMoveTo(targetRoomId)) {
        player.currentRoomId = targetRoomId;
        
        // Добавляем в посещенные, если еще не были
        if (!player.visitedRooms.includes(targetRoomId)) {
            player.visitedRooms.push(targetRoomId);
        }
        
        updateUI();
        showText(rooms[targetRoomId].text);
    }
}

// Обновление визуала
function updateUI() {
    // Обновляем цифры
    document.getElementById('ui-hp').innerText = player.hp;
    document.getElementById('ui-coins').innerText = player.coins;

    // Обновляем комнаты
    Object.keys(rooms).forEach(id => {
        const el = document.getElementById(`room-${id}`);
        el.className = `room ${rooms[id].color}`; // Сброс классов
        el.innerHTML = rooms[id].icon;

        const isCurrent = id === player.currentRoomId;
        const isVisited = player.visitedRooms.includes(id);
        const isAvailable = connections[player.currentRoomId].includes(id);
        
        // Проверяем блокировку (например, enemy2)
        let isLocked = false;
        if (id === 'enemy2' && (!player.visitedRooms.includes('treasury') || !player.visitedRooms.includes('shop'))) {
            isLocked = true;
        }

        if (isCurrent) {
            el.classList.add('current');
        } else if (isAvailable && !isLocked) {
            el.classList.add('available');
        } else if (isVisited) {
            el.classList.add('visited');
            if (isLocked) el.classList.add('locked');
        } else if (isLocked) {
            el.classList.add('locked'); // Видно, но темно и с красной рамкой
        }
    });
}

// Вывод текста в нижнюю панель
function showText(text) {
    document.getElementById('room-text').innerText = text;
}

// Запуск игры после загрузки страницы
window.onload = initGame;
