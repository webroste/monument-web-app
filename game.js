// game.js

// --- Настройка Игры ---
const STEP_SIZE = 30;
const MAX_OFFSET = 1200; // Размер мира (2400x2400)
const BIRD_RADIUS_COLLISION = 30; 
const ATTACK_RANGE = 45; 
const PLAYER_DAMAGE = 20; 
const ZONE_DAMAGE = 10; 
const ENEMY_DAMAGE = 15; 
const ENTITY_MOVE_TICK = 500; // Движение НПС каждые 0.5с
const ZONE_TICK_MS = 1000; // Проверка зоны каждую 1с

// --- Настройки Генерации Мира и Битвы ---
const GRID_SIZE = 40; 
const CELL_SIZE = 60; 
const BIOME_PROBABILITIES = { 'grass': 0.60, 'earth': 0.25, 'water': 0.15 };
const INITIAL_PLAYER_COUNT = 10; 
const BLING_COUNT = 5; 

// Настройки Зоны
const INITIAL_ZONE_SIZE = 2400; 
const FINAL_ZONE_SIZE = 400; 
const ZONE_SHRINK_DURATION = 15000; 

// Элементы DOM
const startScreen = document.getElementById('start-screen');
const gameInterface = document.getElementById('game-interface');
const toggleMapBtn = document.getElementById('toggle-map-btn');
const playersLeftDisplay = document.getElementById('players-left');
const safeZoneEl = document.getElementById('safe-zone');
const attackBtn = document.getElementById('attack-btn');

const bird = document.getElementById('bird');
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
let gameStarted = false;

// Зона
let zoneSize = INITIAL_ZONE_SIZE;
let zoneX = 0; // Центр зоны в мировых координатах
let zoneY = 0; 

// Хранилище
let GAME_MAP = []; 
let ENTITIES = []; 
let OBJECTS = [];  
let exploredMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false)); 
let playerDotEl = null; 
let zoneInterval = null;

// --- ФУНКЦИИ ГЕНЕРАЦИИ МИРА И СУЩНОСТЕЙ ---

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
    const halfGrid = GRID_SIZE / 2;
    GAME_MAP = [];
    gameObjectsContainer.innerHTML = ''; // Очистка старых биомов

    // 1. Генерация биомов
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
                r: r, c: c
            };
            
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

    // 2. Создаем Зону (она должна быть первой в game-objects)
    gameObjectsContainer.appendChild(safeZoneEl);

    // 3. Рандомно размещаем блестяшки
    OBJECTS = [];
    for (let i = 0; i < BLING_COUNT; i++) {
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        OBJECTS.push({ id: 'b' + i, type: 'bling', x: x, y: y, collected: false });
    }

    // 4. Создаем Спящего Кота и НПС-птиц
    ENTITIES = [];
    ENTITIES.push({
        id: 'cat', 
        type: 'danger', 
        x: 500, 
        y: -500, 
        hp: 100,
        symbol: '🐈',
        speed: 15,
        lastMove: 0
    });
    
    for (let i = 1; i < INITIAL_PLAYER_COUNT; i++) {
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        ENTITIES.push({
            id: 'p' + i, 
            type: 'player', 
            x: x, 
            y: y, 
            hp: 100, 
            symbol: '🐦', 
            speed: STEP_SIZE,
            isFlying: false,
            lastMove: 0
        });
    }

    // 5. Добавляем объекты и сущности на карту
    [...OBJECTS, ...ENTITIES].forEach(obj => {
        const el = document.createElement('div');
        el.id = obj.id;
        el.classList.add('game-object');
        
        if (obj.type === 'bling') {
            el.classList.add('object-bling');
            el.innerHTML = '✨';
        } else {
            // Создание HP бара для всех сущностей (игроки и кот)
            const hpBar = document.createElement('div');
            hpBar.classList.add('player-hp');
            const hpFill = document.createElement('div');
            hpFill.classList.add('player-hp-fill');
            hpFill.style.width = '100%'; 
            hpBar.appendChild(hpFill);
            el.appendChild(hpBar);

            if (obj.type === 'danger') {
                el.classList.add('object-danger');
                el.innerHTML = obj.symbol;
            } else if (obj.type === 'player') {
                el.classList.add('object-player');
                el.innerHTML = obj.symbol;
            }
        }
        
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;
        gameObjectsContainer.appendChild(el);
    });
}

// --- ЛОГИКА СУЩНОСТЕЙ И АТАК ---

function damageEntity(entity, amount) {
    if (entity.hp <= 0) return;
    entity.hp = Math.max(0, entity.hp - amount);
    
    // Обновляем HP бар 
    const el = document.getElementById(entity.id);
    const hpFill = el ? el.querySelector('.player-hp-fill') : null;
    if (hpFill) hpFill.style.width = `${entity.hp}%`;

    if (entity.hp === 0) {
        const el = document.getElementById(entity.id);
        if (el) el.remove();
        ENTITIES = ENTITIES.filter(e => e.id !== entity.id);
        checkWinCondition();
    }
}

function checkWinCondition() {
    // Считаем живых игроков (включая центрального)
    const aliveCount = ENTITIES.filter(e => e.type === 'player').length + (health > 0 ? 1 : 0);
    playersLeftDisplay.textContent = aliveCount;
    
    if (aliveCount === 1 && health > 0) {
        alert("🎉 ПОБЕДА! Вы единственный выживший! 🎉");
        isDead = true;
        clearInterval(zoneInterval);
    } else if (aliveCount === 0) {
        alert("💀 ПОРАЖЕНИЕ! Все выбыли.");
        isDead = true;
        clearInterval(zoneInterval);
    }
}

function moveEntities() {
    if (isDead) return;
    
    ENTITIES.forEach(entity => {
        if (entity.hp <= 0) return;
        
        const dx = Math.floor(Math.random() * 3) - 1; 
        const dy = Math.floor(Math.random() * 3) - 1; 
        
        const newX = entity.x + dx * entity.speed;
        const newY = entity.y + dy * entity.speed;
        
        // Проверка границ мира и коллизии (isNpc = true)
        if (Math.abs(newX) < MAX_OFFSET && Math.abs(newY) < MAX_OFFSET && !checkCollision(newX, newY, true)) {
             entity.x = newX;
             entity.y = newY;
             const el = document.getElementById(entity.id);
             if (el) {
                 el.style.left = `${entity.x}px`;
                 el.style.top = `${entity.y}px`;
             }
        }
    });
}

window.attack = function() {
    if (isDead || !gameStarted) return;
    
    // Визуальный эффект атаки
    const effect = document.createElement('div');
    effect.classList.add('attack-effect');
    effect.style.left = `50%`; 
    effect.style.top = `50%`;
    document.getElementById('game-container').appendChild(effect); 
    
    setTimeout(() => effect.remove(), 400);

    checkAttackCollision(); 
}

function checkAttackCollision() {
    let hit = false;
    // Атака на НПС-птиц и Кота
    ENTITIES.filter(e => e.hp > 0).forEach(entity => {
        const distanceX = Math.abs(entity.x - playerX);
        const distanceY = Math.abs(entity.y - playerY);
        
        if (distanceX < ATTACK_RANGE && distanceY < ATTACK_RANGE) {
            damageEntity(entity, PLAYER_DAMAGE);
            hit = true;
            
            const el = document.getElementById(entity.id);
            if (el) {
                // Визуальное выделение цели
                el.style.boxShadow = '0 0 10px 5px yellow';
                setTimeout(() => el.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)', 150);
            }
        }
    });
    return hit;
}

// --- ЛОГИКА ЗДОРОВЬЯ, УРОНА И ЗОНЫ ---

function takeDamage(amount) {
    if (health <= 0 || isDead) return;
    health = Math.max(0, health - amount);
    updateHealthBar();
    
    if (health === 0) {
        isDead = true;
        alert("💀 ВЫ ВЫБЫЛИ! Наблюдайте за битвой или перезагрузите.");
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
        checkWinCondition(); 
    }
}

function updateHealthBar() {
    healthFill.style.width = `${health}%`;
    if (health < 30) { healthFill.style.backgroundColor = 'darkred'; } 
    else if (health < 60) { healthFill.style.backgroundColor = 'orange'; } 
    else { healthFill.style.backgroundColor = 'green'; }
}

function checkEnemyDamage() {
    ENTITIES.filter(e => e.type === 'danger' && e.hp > 0).forEach(cat => {
        const distanceX = Math.abs(cat.x - playerX);
        const distanceY = Math.abs(cat.y - playerY);
        
        if (distanceX < 30 && distanceY < 30) {
            takeDamage(ENEMY_DAMAGE);
        }
    });
}

// --- ЛОГИКА ЗОНЫ БИТВЫ ---

function shrinkZone() {
    if (isDead) return;
    
    const startSize = zoneSize;
    let endSize = Math.max(FINAL_ZONE_SIZE, startSize - (INITIAL_ZONE_SIZE / 5)); 
    
    if (endSize === zoneSize) return; 
    
    // Новая позиция центра (смещение)
    const maxShift = (startSize - endSize) / 2;
    // Сдвиг центра зоны в пределах старой зоны, рандомно
    zoneX += (Math.random() * maxShift) - (maxShift / 2); 
    zoneY += (Math.random() * maxShift) - (maxShift / 2);
    
    zoneSize = endSize;

    safeZoneEl.style.width = `${zoneSize}px`;
    safeZoneEl.style.height = `${zoneSize}px`;
    
    // Рассчитываем смещение левого верхнего угла зоны (относительно 0,0 gameObjectsContainer)
    // Left = (World Center X + World Center Y) - Half Zone Size
    safeZoneEl.style.left = `${zoneX + MAX_OFFSET - (zoneSize / 2)}px`;
    safeZoneEl.style.top = `${zoneY + MAX_OFFSET - (zoneSize / 2)}px`;
    
    // Устанавливаем длительность анимации
    safeZoneEl.style.transitionDuration = `${ZONE_SHRINK_DURATION / 1000}s`;

    // Запускаем следующий этап
    setTimeout(shrinkZone, ZONE_SHRINK_DURATION);
}

function checkZoneDamage() {
    if (isDead) return;
    
    // Расчет границ зоны (относительно мировых координат)
    const halfZone = zoneSize / 2;
    const minX = zoneX - halfZone;
    const maxX = zoneX + halfZone;
    const minY = zoneY - halfZone;
    const maxY = zoneY + halfZone;
    
    // Проверка нахождения игрока в зоне
    const inX = playerX >= minX && playerX <= maxX;
    const inY = playerY >= minY && playerY <= maxY;
    
    if (!inX || !inY) {
        takeDamage(ZONE_DAMAGE);
    }
}

// --- ЛОГИКА ОБНОВЛЕНИЯ И КОЛЛИЗИЙ ---

function updateGame() {
    if (isDead || !gameStarted) return;

    // Смещаем мир/платформу и игровые объекты
    const transformStyle = `translate(${worldX}px, ${worldY}px)`;
    gameObjectsContainer.style.transform = transformStyle; 
    
    const { r, c } = getGridCoords(playerX, playerY);
    updateExploredMap(r, c);
    
    // Проверяем урон от врагов при движении
    checkEnemyDamage();
}

function checkCollision(targetX, targetY, isNpc = false) {
    if (!isNpc && isFlying) return false;

    const { r, c } = getGridCoords(targetX, targetY);
    
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return true;
    
    const targetBiome = GAME_MAP[r][c];

    if (targetBiome && targetBiome.type === 'water') {
        return true;
    }
    
    return false;
}

function getGridCoords(worldX, worldY) {
    const halfGrid = GRID_SIZE / 2;
    const c = Math.floor((worldX + MAX_OFFSET) / CELL_SIZE);
    const r = Math.floor((worldY + MAX_OFFSET) / CELL_SIZE);
    return { r: r, c: c };
}

function updateExploredMap(r, c) {
    // ... (Логика карты без изменений) ...
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        
        if (!exploredMap[r][c]) {
            exploredMap[r][c] = true;
            const miniMapCell = document.getElementById(`map-cell-${r}-${c}`);
            if (miniMapCell) {
                miniMapCell.style.opacity = 1;
            }
        }
        
        if (!playerDotEl) {
            playerDotEl = document.createElement('div');
            playerDotEl.classList.add('mini-map-cell', 'player-dot');
            miniMapContainer.appendChild(playerDotEl);
        }
        
        playerDotEl.style.gridRowStart = r + 1; 
        playerDotEl.style.gridColumnStart = c + 1;
    }
    
    updateEnemyDots(); 
}

function updateEnemyDots() {
    // ... (Логика карты без изменений) ...
    ENTITIES.filter(e => e.hp > 0).forEach(entity => {
        const { r, c } = getGridCoords(entity.x, entity.y);
        
        let enemyDot = document.getElementById(`map-dot-${entity.id}`);
        if (enemyDot) {
            enemyDot.remove();
        }
        
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && exploredMap[r][c]) {
            enemyDot = document.createElement('div');
            enemyDot.id = `map-dot-${entity.id}`;
            enemyDot.classList.add('mini-map-cell', 'enemy-dot');
            enemyDot.style.gridRowStart = r + 1; 
            enemyDot.style.gridColumnStart = c + 1;
            miniMapContainer.appendChild(enemyDot);
        }
    });
}

function setupMiniMap() {
    // ... (Логика карты без изменений) ...
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

function checkBlingCollection() {
    // ... (Логика сбора) ...
}


// --- УПРАВЛЕНИЕ ---
window.move = function(dx, dy) {
    if (isDead || !gameStarted || (dx === 0 && dy === 0)) return;

    const newPlayerX = playerX + dx * STEP_SIZE;
    const newPlayerY = playerY + dy * STEP_SIZE;

    if (checkCollision(newPlayerX, newPlayerY)) {
        return;
    }

    worldX -= dx * STEP_SIZE;
    worldY -= dy * STEP_SIZE;
    playerX = newPlayerX;
    playerY = newPlayerY;
    
    updateGame(); // Обновление при движении
}

window.changeMode = function() {
    if (isDead || !gameStarted) return;
    
    isFlying = !isFlying;
    
    bird.classList.toggle('flying', isFlying);
    bird.classList.toggle('walking', !isFlying);
    modeTextDisplay.textContent = isFlying ? 'Полёт' : 'Ходьба';
}


// --- ЛОГИКА МЕНЮ И СТАРТА ---

function startGame() {
    if (gameStarted) return;

    gameStarted = true;
    
    startScreen.classList.add('hidden');
    gameInterface.classList.add('active');
    toggleMapBtn.style.display = 'block';

    generateWorld();
    setupMiniMap();
    checkWinCondition();
    
    // Устанавливаем начальное положение зоны
    zoneSize = INITIAL_ZONE_SIZE;
    zoneX = 0;
    zoneY = 0;
    safeZoneEl.style.width = `${zoneSize}px`;
    safeZoneEl.style.height = `${zoneSize}px`;
    safeZoneEl.style.left = `0px`;
    safeZoneEl.style.top = `0px`;
    safeZoneEl.style.transitionDuration = '0s'; // Сброс анимации

    // Запуск цикла движения сущностей
    setInterval(moveEntities, ENTITY_MOVE_TICK);
    
    // Запуск цикла урона от зоны
    zoneInterval = setInterval(checkZoneDamage, ZONE_TICK_MS); 

    // Запуск уменьшения зоны
    setTimeout(shrinkZone, 5000); 
}

function toggleMiniMap() {
    miniMapWrapper.classList.toggle('visible');
}

// --- Инициализация ---

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('mode').addEventListener('click', window.changeMode);
    document.getElementById('up').addEventListener('click', () => window.move(0, -1));
    document.getElementById('down').addEventListener('click', () => window.move(0, 1));
    document.getElementById('left').addEventListener('click', () => window.move(-1, 0));
    document.getElementById('right').addEventListener('click', () => window.move(1, 0));
    document.getElementById('attack-btn').addEventListener('click', window.attack); 
    
    toggleMapBtn.addEventListener('click', toggleMiniMap);

    updateHealthBar();
});
