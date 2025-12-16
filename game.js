// game.js

// --- Настройка Игры ---
const STEP_SIZE = 30;
const MAX_OFFSET = 1200; 
const BIRD_RADIUS_COLLISION = 10; // Уменьшен для новой птички 
const DAMAGE_RATE = 5;     
const BOT_DAMAGE_RATE = 10; // Урон от ботов
const HEAL_TICK_MS = 300; 
const BOT_MOVE_INTERVAL = 500; // Боты двигаются каждые 0.5 сек

// --- Настройки Генерации Мира ---
const GRID_SIZE = 40; 
const CELL_SIZE = 60; 
const BIOME_PROBABILITIES = {
    'grass': 0.60, 
    'earth': 0.25, 
    'water': 0.15, 
};
const BLING_COUNT = 10; 
const BOT_COUNT = 3; // Количество агрессивных ботов

// Элементы DOM
const startScreen = document.getElementById('start-screen');
const gameInterface = document.getElementById('game-interface');
const toggleMapBtn = document.getElementById('toggle-map-btn');

const platform = document.getElementById('platform');
const bird = document.getElementById('bird');
const blingCountDisplay = document.getElementById('bling-count');
const modeTextDisplay = document.getElementById('mode-text');
const gameObjectsContainer = document.getElementById('game-objects');
const healthFill = document.getElementById('health-fill');
const miniMapContainer = document.getElementById('mini-map-content');
const miniMapWrapper = document.getElementById('mini-map-wrapper');

// --- Игровые Переменные ---
let health = 100;
let isFlying = false;
let worldX = 0;
let worldY = 0;
let playerX = 0; 
let playerY = 0; 
let isDead = false;
let gameStarted = false; // Новое состояние

// Хранилище объектов и биомов
let GAME_MAP = []; 
let OBJECTS = []; 
let exploredMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false)); 
let botInterval = null;

// --- ФУНКЦИИ ГЕНЕРАЦИИ МИРА ---

function getRandomBiome() {
    let rand = Math.random();
    let cumulative = 0;
    for (const biome in BIOME_PROBABILITIES) {
        cumulative += BIOME_PROBABILITIES[biome];
        if (rand < cumulative) {
            return biome;
        }
    }
    return 'grass';
}

function generateWorld() {
    // 1. Генерируем биомы на сетке
    const halfGrid = GRID_SIZE / 2;
    GAME_MAP = [];
    
    for (let r = 0; r < GRID_SIZE; r++) {
        GAME_MAP[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            const world_x = (c - halfGrid) * CELL_SIZE;
            const world_y = (r - halfGrid) * CELL_SIZE;

            const biome_type = getRandomBiome();
            
            GAME_MAP[r][c] = {
                type: biome_type,
                x: world_x,
                y: world_y,
                size: CELL_SIZE,
                r: r, c: c // Сохраняем координаты сетки
            };
            
            // Визуализируем биом
            const el = document.createElement('div');
            el.classList.add('biome-cell');
            el.classList.add(`biome-${biome_type}`);
            el.style.width = `${CELL_SIZE}px`;
            el.style.height = `${CELL_SIZE}px`;
            el.style.left = `${world_x}px`;
            el.style.top = `${world_y}px`;
            el.id = `biome-${r}-${c}`;
            gameObjectsContainer.appendChild(el);
        }
    }

    // 2. Рандомно размещаем блестяшки, Кота и Ботов
    OBJECTS = [];
    
    // Блестяшки
    for (let i = 0; i < BLING_COUNT; i++) {
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        OBJECTS.push({ id: 'b' + i, type: 'bling', x: x, y: y, collected: false });
    }

    // Спящий Кот (Стационарная опасность)
    OBJECTS.push({
        id: 'd1', type: 'danger', x: 500, y: -500, w: 100, h: 100, active: true, name: 'Спящий Кот'
    });
    
    // Агрессивные Боты (Новое)
    for (let i = 0; i < BOT_COUNT; i++) {
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        OBJECTS.push({
            id: 'bot' + i, 
            type: 'bot', 
            x: x, 
            y: y, 
            w: 40, 
            h: 40, 
            symbol: '🦅', // Агрессивная птица
            speed: STEP_SIZE,
            lastMove: 0
        });
    }

    // 3. Добавляем объекты на карту
    OBJECTS.forEach(obj => {
        const el = document.createElement('div');
        el.id = obj.id;
        el.classList.add('game-object');
        el.classList.add(`object-${obj.type}`);
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        if (obj.type === 'bling') {
            el.innerHTML = '✨';
        } else if (obj.type === 'danger') {
            el.innerHTML = `⚠️<br>${obj.name}`;
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
        } else if (obj.type === 'bot') {
            el.innerHTML = obj.symbol;
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
        }
        gameObjectsContainer.appendChild(el);
    });
}

// --- ЛОГИКА БОТОВ (Новое) ---

function moveBots() {
    if (isDead) return;
    
    OBJECTS.filter(o => o.type === 'bot').forEach(bot => {
        
        // Простая логика: бот делает случайный шаг
        const dx = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        const dy = Math.floor(Math.random() * 3) - 1; 

        if (dx === 0 && dy === 0) return;

        const newX = bot.x + dx * bot.speed;
        const newY = bot.y + dy * bot.speed;

        // Обновляем позицию бота, если она в пределах мира
        if (Math.abs(newX) < MAX_OFFSET && Math.abs(newY) < MAX_OFFSET) {
             bot.x = newX;
             bot.y = newY;
             const botEl = document.getElementById(bot.id);
             if (botEl) {
                 botEl.style.left = `${bot.x}px`;
                 botEl.style.top = `${bot.y}px`;
             }
        }
        
        // Проверка урона от бота
        checkBotDamage(bot);
    });
}

function checkBotDamage(bot) {
    const distanceX = Math.abs(bot.x - playerX);
    const distanceY = Math.abs(bot.y - playerY);
    
    // Если бот находится очень близко и игрок не летит
    if (distanceX < 30 && distanceY < 30 && !isFlying) {
        takeDamage(BOT_DAMAGE_RATE);
        console.log("Урон от бота!");
    }
}

// --- ЛОГИКА ЗДОРОВЬЯ ---

function takeDamage(amount) {
    if (health <= 0 || isDead) return;
    health = Math.max(0, health - amount);
    updateHealthBar();
    if (health === 0) {
        isDead = true;
        alert("💀 ВАША ПТИЧКА УМЕРЛА! Игра окончена. Перезагрузите страницу.");
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
        clearInterval(botInterval); // Останавливаем ботов
    }
}

function updateHealthBar() {
    healthFill.style.width = `${health}%`;
    if (health < 30) {
         healthFill.style.backgroundColor = 'darkred';
    } else if (health < 60) {
         healthFill.style.backgroundColor = 'orange';
    } else {
         healthFill.style.backgroundColor = 'green';
    }
}

// --- ЛОГИКА КАРТЫ ---

function getGridCoords(worldX, worldY) {
    const halfGrid = GRID_SIZE / 2;
    const c = Math.floor(worldX / CELL_SIZE) + halfGrid;
    const r = Math.floor(worldY / CELL_SIZE) + halfGrid;
    return { r: r, c: c };
}

let playerDotEl = null;

function updateExploredMap(r, c) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        
        // 1. Отмечаем исследованную ячейку
        if (!exploredMap[r][c]) {
            exploredMap[r][c] = true;
            const miniMapCell = document.getElementById(`map-cell-${r}-${c}`);
            if (miniMapCell) {
                miniMapCell.style.opacity = 1;
            }
        }
        
        // 2. Обновляем точку игрока
        if (!playerDotEl) {
            playerDotEl = document.createElement('div');
            playerDotEl.classList.add('mini-map-cell', 'player-dot');
            miniMapContainer.appendChild(playerDotEl);
        }
        
        // Смещаем точку игрока на новую позицию
        playerDotEl.style.gridRowStart = r + 1; 
        playerDotEl.style.gridColumnStart = c + 1;
    }
}

function setupMiniMap() {
    if (!miniMapContainer) return;
    miniMapContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    miniMapContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;
    
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const biome = GAME_MAP[r][c];
            const cell = document.createElement('div');
            cell.id = `map-cell-${r}-${c}`;
            cell.classList.add('mini-map-cell');
            cell.classList.add(`biome-${biome.type}`);
            
            cell.style.opacity = 0.2; 
            miniMapContainer.appendChild(cell);
        }
    }
}

// --- ЛОГИКА ИГРОВОГО ЦИКЛА ---

function updateGame() {
    if (isDead || !gameStarted) return;

    // 1. Смещаем мир/платформу и игровые объекты
    // worldX и worldY теперь смещают gameObjectsContainer
    const transformStyle = `translate(${worldX}px, ${worldY}px)`;
    gameObjectsContainer.style.transform = transformStyle; 
    
    // 2. Обновляем исследование и точку на карте
    const { r, c } = getGridCoords(playerX, playerY);
    updateExploredMap(r, c);
    
    // 3. Проверяем взаимодействие (Сбор предметов)
    checkBlingCollection();
    
    // 4. Обновляем UI
    const collectedCount = OBJECTS.filter(o => o.type === 'bling' && o.collected).length;
    blingCountDisplay.textContent = collectedCount;
    
    if (collectedCount === BLING_COUNT) {
        alert("🏆 ПОБЕДА! Вы собрали все блестяшки! 🏆");
        // Возможно, здесь стоит остановить игру
    }
}

function checkBlingCollection() {
    OBJECTS.filter(o => o.type === 'bling' && !o.collected).forEach(obj => {
        const distanceX = Math.abs(obj.x - playerX);
        const distanceY = Math.abs(obj.y - playerY);
        
        if (distanceX < 35 && distanceY < 35) { 
            obj.collected = true;
            const el = document.getElementById(obj.id);
            if (el) el.style.display = 'none'; 
            updateGame(); 
        }
    });
}

function checkDanger() {
    const dangerZone = OBJECTS.find(o => o.type === 'danger');
    if (!dangerZone || !dangerZone.active) return;

    const dangerEl = document.getElementById(dangerZone.id);
    const distanceX = Math.abs(dangerZone.x - playerX);
    const distanceY = Math.abs(dangerZone.y - playerY);
    
    const isInDanger = distanceX < 60 && distanceY < 60;
    
    if (isInDanger) {
        dangerEl.classList.add('active'); 
        if (!isFlying) {
            takeDamage(DAMAGE_RATE); 
        }
    } else {
        dangerEl.classList.remove('active');
    }
}

function checkCollision(targetX, targetY) {
    if (isFlying) return false;

    const { r, c } = getGridCoords(targetX, targetY);
    
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return true;
    
    const targetBiome = GAME_MAP[r][c];

    // Нельзя ходить по воде
    if (targetBiome.type === 'water') {
        return true;
    }
    
    return false;
}

// --- УПРАВЛЕНИЕ ---

window.move = function(dx, dy) {
    if (isDead || !gameStarted || (dx === 0 && dy === 0)) return;

    const newPlayerX = playerX + dx * STEP_SIZE;
    const newPlayerY = playerY + dy * STEP_SIZE;

    if (checkCollision(newPlayerX, newPlayerY)) {
        console.log("❌ Нельзя идти сюда! Вода или преграда.");
        return;
    }

    worldX -= dx * STEP_SIZE;
    worldY -= dy * STEP_SIZE;
    playerX = newPlayerX;
    playerY = newPlayerY;
    
    updateGame();
}

window.changeMode = function() {
    if (isDead || !gameStarted) return;
    
    isFlying = !isFlying;
    
    bird.classList.toggle('flying', isFlying);
    bird.classList.toggle('walking', !isFlying);
    modeTextDisplay.textContent = isFlying ? 'Полёт' : 'Ходьба';
    
    checkDanger();
}

// --- ЛОГИКА МЕНЮ И СТАРТА ---

function startGame() {
    if (gameStarted) return;

    gameStarted = true;
    
    // Скрываем меню с анимацией
    startScreen.classList.add('hidden');
    
    // Показываем игру
    gameInterface.classList.add('active');
    toggleMapBtn.style.display = 'block';

    // 1. Генерируем мир
    generateWorld();
    
    // 2. Настраиваем мини-карту
    setupMiniMap();
    
    // 3. Запускаем циклы
    setInterval(function() {
         if (!isDead) {
             checkDanger();
             checkBlingCollection(); 
             // Проверка урона от ботов происходит в moveBots()
         }
    }, HEAL_TICK_MS); 
    
    // Запускаем движение ботов
    botInterval = setInterval(moveBots, BOT_MOVE_INTERVAL);

    // 4. Первый рендер
    updateGame();
    updateHealthBar();
}

function toggleMiniMap() {
    miniMapWrapper.classList.toggle('visible');
}

// --- Инициализация ---

document.addEventListener('DOMContentLoaded', () => {
    // Привязка кнопок меню
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    
    // Привязка управления к кнопкам
    document.getElementById('mode').addEventListener('click', window.changeMode);
    document.getElementById('up').addEventListener('click', () => window.move(0, -1));
    document.getElementById('down').addEventListener('click', () => window.move(0, 1));
    document.getElementById('left').addEventListener('click', () => window.move(-1, 0));
    document.getElementById('right').addEventListener('click', () => window.move(1, 0));
    
    // Привязка кнопки карты
    toggleMapBtn.addEventListener('click', toggleMiniMap);

    // Начальное состояние
    updateHealthBar();
});
