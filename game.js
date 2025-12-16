// game.js

// --- Настройка Игры ---
const STEP_SIZE = 30;
const MAX_OFFSET = 1200; // Максимальный размер мира в пикселях (2400x2400)
const BIRD_RADIUS_COLLISION = 15; 

const DAMAGE_RATE = 5;     // Урон от Кота
const HEAL_TICK_MS = 300;  // Интервал проверки (0.3 сек)

// --- Настройки Генерации Мира ---
const GRID_SIZE = 40; // Размер сетки (40x40 ячеек)
const CELL_SIZE = 60; // Размер одной ячейки биома в пикселях

// Процентное соотношение биомов
const BIOME_PROBABILITIES = {
    'grass': 0.60, // Трава - 60%
    'earth': 0.25, // Земля - 25%
    'water': 0.15, // Вода - 15%
};
const BLING_COUNT = 10; // Общее количество блестяшек

// Элементы DOM
const platform = document.getElementById('platform');
const bird = document.getElementById('bird');
const blingCountDisplay = document.getElementById('bling-count');
const modeTextDisplay = document.getElementById('mode-text');
const gameObjectsContainer = document.getElementById('game-objects');
const healthFill = document.getElementById('health-fill');
const miniMapContainer = document.getElementById('mini-map-content'); // Элемент для мини-карты

// --- Игровые Переменные ---
let health = 100;
let isFlying = false;
let worldX = 0;
let worldY = 0;
let playerX = 0; 
let playerY = 0; 
let isDead = false;

// Хранилище объектов и биомов
let GAME_MAP = []; // Хранит сетку биомов
let OBJECTS = [];  // Хранит блестяшки и врагов
let exploredMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false)); // Для мини-карты

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
    return 'grass'; // По умолчанию
}

function generateWorld() {
    // 1. Генерируем биомы на сетке
    const halfGrid = GRID_SIZE / 2;
    GAME_MAP = [];
    
    for (let r = 0; r < GRID_SIZE; r++) {
        GAME_MAP[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            // Преобразуем координаты сетки в мировые координаты (пиксели)
            const world_x = (c - halfGrid) * CELL_SIZE;
            const world_y = (r - halfGrid) * CELL_SIZE;

            const biome_type = getRandomBiome();
            
            GAME_MAP[r][c] = {
                type: biome_type,
                x: world_x,
                y: world_y,
                size: CELL_SIZE
            };
            
            // Визуализируем биом (для упрощения используем контейнер gameObjectsContainer)
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

    // 2. Рандомно размещаем блестяшки и Спящего Кота
    OBJECTS = [];
    
    // Размещение блестяшек
    for (let i = 0; i < BLING_COUNT; i++) {
        // Рандомные координаты в пределах MAX_OFFSET
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        OBJECTS.push({
            id: 'b' + i, 
            type: 'bling', 
            x: x, 
            y: y, 
            collected: false
        });
    }

    // Размещение Спящего Кота (Босса)
    OBJECTS.push({
        id: 'd1', 
        type: 'danger', 
        x: 500, // Фиксированное местоположение для легкого поиска
        y: -500, 
        w: 100, 
        h: 100, 
        active: true, 
        name: 'Спящий Кот'
    });

    // 3. Добавляем объекты на карту
    OBJECTS.forEach(obj => {
        const el = document.createElement('div');
        el.id = obj.id;
        el.classList.add('game-object');
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        if (obj.type === 'bling') {
            el.classList.add('object-bling');
            el.innerHTML = '✨';
        } else if (obj.type === 'danger') {
            el.classList.add('object-danger');
            el.innerHTML = `⚠️<br>${obj.name}`;
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
            if (obj.active) el.classList.add('active');
        }
        gameObjectsContainer.appendChild(el);
    });
}

// --- УПРОЩЕННАЯ ЛОГИКА ЗДОРОВЬЯ (Клубника удалена) ---

function takeDamage(amount) {
    if (health <= 0 || isDead) return;
    health = Math.max(0, health - amount);
    updateHealthBar();
    if (health === 0) {
        isDead = true;
        alert("💀 ВАША ПТИЧКА УМЕРЛА! Игра окончена. Перезагрузите страницу.");
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
    }
}

function updateHealthBar() {
    healthFill.style.width = `${health}%`;
    // ... (логика цвета остается прежней) ...
    if (health < 30) {
         healthFill.style.backgroundColor = 'darkred';
    } else if (health < 60) {
         healthFill.style.backgroundColor = 'orange';
    } else {
         healthFill.style.backgroundColor = 'green';
    }
}

// --- ЛОГИКА ИССЛЕДОВАНИЯ И КАРТЫ ---

function getGridCoords(worldX, worldY) {
    const halfGrid = GRID_SIZE / 2;
    // Преобразуем мировые координаты (playerX, playerY) в координаты сетки
    const c = Math.floor(worldX / CELL_SIZE) + halfGrid;
    const r = Math.floor(worldY / CELL_SIZE) + halfGrid;
    return { r: r, c: c };
}

function updateExploredMap(r, c) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !exploredMap[r][c]) {
        exploredMap[r][c] = true;
        // Здесь мы должны обновить мини-карту
        if (miniMapContainer) {
            // Для упрощения, просто меняем цвет ячейки на карте
            const miniMapCell = document.getElementById(`map-cell-${r}-${c}`);
            if (miniMapCell) {
                miniMapCell.style.opacity = 1;
            }
        }
    }
}

// --- ЛОГИКА ОБНОВЛЕНИЯ ИГРЫ И КОЛЛИЗИЙ ---

function updateGame() {
    if (isDead) return;

    // 1. Смещаем мир/платформу и игровые объекты
    const transformStyle = `translate(${worldX}px, ${worldY}px)`;
    // Платформа теперь просто фон, биомы внутри gameObjectsContainer
    gameObjectsContainer.style.transform = transformStyle; 
    
    // 2. Обновляем исследование
    const { r, c } = getGridCoords(playerX, playerY);
    updateExploredMap(r, c);
    
    // 3. Проверяем взаимодействие (Сбор предметов)
    checkBlingCollection();
    
    // 4. Обновляем UI
    const collectedCount = OBJECTS.filter(o => o.type === 'bling' && o.collected).length;
    blingCountDisplay.textContent = collectedCount;
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
        
        // Урон наносится только если птичка не летает 
        if (!isFlying) {
            takeDamage(DAMAGE_RATE); 
        }
    } else {
        dangerEl.classList.remove('active');
    }
}

function checkCollision(targetX, targetY) {
    if (isFlying) return false;

    // Получаем координаты сетки, куда мы хотим пойти
    const { r, c } = getGridCoords(targetX, targetY);
    
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return true; // Граница мира
    
    const targetBiome = GAME_MAP[r][c];

    // Нельзя ходить по воде
    if (targetBiome.type === 'water') {
        return true;
    }
    
    return false;
}

// --- УПРАВЛЕНИЕ ---

window.move = function(dx, dy) {
    if (isDead || (dx === 0 && dy === 0)) return;

    const newPlayerX = playerX + dx * STEP_SIZE;
    const newPlayerY = playerY + dy * STEP_SIZE;

    // Проверка коллизии с биомами
    if (checkCollision(newPlayerX, newPlayerY)) {
        console.log("❌ Нельзя идти сюда! Вода или преграда.");
        return;
    }

    // Перемещение
    worldX -= dx * STEP_SIZE;
    worldY -= dy * STEP_SIZE;
    playerX = newPlayerX;
    playerY = newPlayerY;
    
    updateGame();
}

window.changeMode = function() {
    if (isDead) return;
    isFlying = !isFlying;
    
    bird.classList.toggle('flying', isFlying);
    bird.classList.toggle('walking', !isFlying);
    modeTextDisplay.textContent = isFlying ? 'Полёт' : 'Ходьба';
    
    // Проверка опасности (для активации урона при приземлении)
    checkDanger();
}


// --- ИНИЦИАЛИЗАЦИЯ И МИНИ-КАРТА ---

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
            
            // Изначально все неисследовано (полупрозрачно)
            cell.style.opacity = 0.2; 
            
            miniMapContainer.appendChild(cell);
        }
    }
}

// --- Инициализация и Циклы ---

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элемент мини-карты после загрузки DOM
    window.miniMapContainer = document.getElementById('mini-map-content');

    generateWorld(); // Генерируем мир перед настройкой карты
    setupMiniMap();  // Настраиваем мини-карту
    
    // Привязка управления к кнопкам
    document.getElementById('mode').addEventListener('click', window.changeMode);
    document.getElementById('up').addEventListener('click', () => window.move(0, -1));
    document.getElementById('down').addEventListener('click', () => window.move(0, 1));
    document.getElementById('left').addEventListener('click', () => window.move(-1, 0));
    document.getElementById('right').addEventListener('click', () => window.move(1, 0));

    // Основной цикл игры (для постоянной проверки состояния)
    setInterval(function() {
         if (!isDead) {
             checkDanger();
             checkBlingCollection(); // Проверка сбора предметов
         }
    }, HEAL_TICK_MS); 

    // Запуск
    updateGame();
    updateHealthBar();
});
