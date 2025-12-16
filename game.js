// game.js

// --- Настройка Игры ---
const STEP_SIZE = 30;
const MAX_OFFSET = 1200; // Размер мира (2400x2400)
const BIRD_RADIUS_COLLISION = 30; 
const ATTACK_RANGE = 45; // Дальность атаки в пикселях (около 1.5 шага)
const PLAYER_DAMAGE = 20; // Урон игрока
const ZONE_DAMAGE = 10; // Урон от зоны
const ENEMY_DAMAGE = 15; // Урон от Кота
const HEAL_TICK_MS = 500; 

// --- Настройки Генерации Мира и Битвы ---
const GRID_SIZE = 40; 
const CELL_SIZE = 60; 
const BIOME_PROBABILITIES = { 'grass': 0.60, 'earth': 0.25, 'water': 0.15 };
const INITIAL_PLAYER_COUNT = 10; // Игрок + 9 НПС-птиц
const BLING_COUNT = 5; // Уменьшим количество для фокуса на битве

// Настройки Зоны
const INITIAL_ZONE_SIZE = 2400; // Размер мира (2 * MAX_OFFSET)
const FINAL_ZONE_SIZE = 400; 
const ZONE_SHRINK_DURATION = 15000; // 15 секунд на уменьшение
const ZONE_TICK_MS = 1000; // Проверка зоны каждую секунду

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
let zoneX = 0;
let zoneY = 0; 

// Хранилище объектов и сущностей
let GAME_MAP = []; 
let ENTITIES = []; // Все сущности: Спящий Кот и НПС-птицы
let OBJECTS = [];  // Блестяшки
let exploredMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false)); 

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
    // ... (Генерация биомов остается прежней) ...
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

    // 2. Рандомно размещаем блестяшки
    OBJECTS = [];
    for (let i = 0; i < BLING_COUNT; i++) {
        const x = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        const y = Math.floor(Math.random() * (2 * MAX_OFFSET)) - MAX_OFFSET;
        OBJECTS.push({ id: 'b' + i, type: 'bling', x: x, y: y, collected: false });
    }

    // 3. Создаем Спящего Кота (теперь движется)
    ENTITIES = [];
    ENTITIES.push({
        id: 'cat', 
        type: 'danger', 
        x: 500, 
        y: -500, 
        hp: 100,
        symbol: '🐈',
        speed: 15, // Полшага
        lastMove: 0
    });
    
    // 4. Создаем НПС-птиц (Королевская Битва)
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
        } else if (obj.type === 'danger') {
            el.classList.add('object-danger');
            el.innerHTML = obj.symbol;
        } else if (obj.type === 'player') {
            el.classList.add('object-player');
            el.innerHTML = obj.symbol;
            
            // Добавляем HP бар для НПС
            const hpBar = document.createElement('div');
            hpBar.classList.add('player-hp');
            const hpFill = document.createElement('div');
            hpFill.classList.add('player-hp-fill');
            hpBar.appendChild(hpFill);
            el.appendChild(hpBar);
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
    
    // Обновляем HP бар (для НПС)
    if (entity.type === 'player' && entity.id !== 'bird') {
        const el = document.getElementById(entity.id);
        const hpFill = el.querySelector('.player-hp-fill');
        if (hpFill) hpFill.style.width = `${entity.hp}%`;
    }

    if (entity.hp === 0) {
        // Удаляем из мира
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
    }
}

function moveEntities() {
    ENTITIES.forEach(entity => {
        if (entity.hp <= 0) return;
        
        // Кот: просто случайное движение
        if (entity.type === 'danger') {
            const dx = Math.floor(Math.random() * 3) - 1; 
            const dy = Math.floor(Math.random() * 3) - 1; 
            
            const newX = entity.x + dx * entity.speed;
            const newY = entity.y + dy * entity.speed;
            
            if (Math.abs(newX) < MAX_OFFSET && Math.abs(newY) < MAX_OFFSET) {
                 entity.x = newX;
                 entity.y = newY;
                 const el = document.getElementById(entity.id);
                 if (el) {
                     el.style.left = `${entity.x}px`;
                     el.style.top = `${entity.y}px`;
                 }
            }
        }
        
        // НПС-птицы: простое случайное движение
        if (entity.type === 'player') {
            const dx = Math.floor(Math.random() * 3) - 1; 
            const dy = Math.floor(Math.random() * 3) - 1; 
            
            const newX = entity.x + dx * entity.speed;
            const newY = entity.y + dy * entity.speed;
            
            if (Math.abs(newX) < MAX_OFFSET && Math.abs(newY) < MAX_OFFSET && !checkCollision(newX, newY, true)) {
                 entity.x = newX;
                 entity.y = newY;
                 const el = document.getElementById(entity.id);
                 if (el) {
                     el.style.left = `${entity.x}px`;
                     el.style.top = `${entity.y}px`;
                 }
            }
        }
    });
}

function checkAttackCollision() {
    let hit = false;
    ENTITIES.filter(e => e.hp > 0).forEach(entity => {
        const distanceX = Math.abs(entity.x - playerX);
        const distanceY = Math.abs(entity.y - playerY);
        
        if (distanceX < ATTACK_RANGE && distanceY < ATTACK_RANGE) {
            damageEntity(entity, PLAYER_DAMAGE);
            hit = true;
        }
    });
    return hit;
}

window.attack = function() {
    if (isDead || !gameStarted) return;
    
    // Визуальный эффект атаки
    const effect = document.createElement('div');
    effect.classList.add('attack-effect');
    // Позиционируем эффект относительно птички
    effect.style.left = `calc(50% + ${worldX}px)`; 
    effect.style.top = `calc(50% + ${worldY}px)`;
    gameObjectsContainer.appendChild(effect);
    
    // Удаляем эффект через короткое время
    setTimeout(() => effect.remove(), 400);

    // Проверяем коллизию и наносим урон
    checkAttackCollision();
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
        checkWinCondition(); // Проверяем, не осталось ли 0
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
        
        // Кот наносит урон, если находится близко (независимо от режима полета)
        if (distanceX < 30 && distanceY < 30) {
            takeDamage(ENEMY_DAMAGE);
        }
    });
}

// --- ЛОГИКА ЗОНЫ БИТВЫ (НОВАЯ) ---

function shrinkZone() {
    const startSize = zoneSize;
    const endSize = Math.max(FINAL_ZONE_SIZE, startSize - (INITIAL_ZONE_SIZE / 5)); // Уменьшаем на 1/5
    
    if (endSize === zoneSize) return; // Больше не уменьшаем
    
    zoneSize = endSize;
    
    // Рандомно центрируем новую зону
    const maxOffset = INITIAL_ZONE_SIZE - zoneSize;
    zoneX = Math.floor(Math.random() * maxOffset) - maxOffset / 2;
    zoneY = Math.floor(Math.random() * maxOffset) - maxOffset / 2;

    // Обновляем визуальное представление зоны
    const gameContainerSize = document.getElementById('game-container').offsetWidth;
    const scaleFactor = gameContainerSize / INITIAL_ZONE_SIZE;

    safeZoneEl.style.width = `${zoneSize}px`;
    safeZoneEl.style.height = `${zoneSize}px`;
    safeZoneEl.style.left = `${(zoneX + MAX_OFFSET) * scaleFactor}px`;
    safeZoneEl.style.top = `${(zoneY + MAX_OFFSET) * scaleFactor}px`;
    
    // Настраиваем transition для плавного уменьшения
    safeZoneEl.style.transitionDuration = `${ZONE_SHRINK_DURATION / 1000}s`;

    // Вызываем следующий этап уменьшения через ZONE_SHRINK_DURATION
    setTimeout(shrinkZone, ZONE_SHRINK_DURATION);
}

function checkZoneDamage() {
    // Проверка, находится ли игрок в зоне
    const inX = playerX >= zoneX && playerX <= zoneX + zoneSize;
    const inY = playerY >= zoneY && playerY <= zoneY + zoneSize;
    
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
    
    // Обновляем исследование и точку на карте
    const { r, c } = getGridCoords(playerX, playerY);
    updateExploredMap(r, c);
    
    // Проверяем взаимодействие
    checkBlingCollection();
    checkEnemyDamage();
}

function checkCollision(targetX, targetY, isNpc = false) {
    if (!isNpc && isFlying) return false;

    const { r, c } = getGridCoords(targetX, targetY);
    
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return true;
    
    const targetBiome = GAME_MAP[r][c];

    // Нельзя ходить по воде
    if (targetBiome.type === 'water') {
        return true;
    }
    
    return false;
}

// ... (Функции getGridCoords, updateExploredMap, setupMiniMap, checkBlingCollection без изменений) ...


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
    
    updateGame();
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
    
    // Запуск цикла движения сущностей
    setInterval(moveEntities, HEAL_TICK_MS);
    
    // Запуск цикла урона и обновления
    setInterval(updateGame, 100); 
    
    // Запуск цикла урона от зоны
    setInterval(checkZoneDamage, ZONE_TICK_MS); 

    // Запуск уменьшения зоны
    shrinkZone(); 
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
    document.getElementById('attack-btn').addEventListener('click', window.attack); // НОВАЯ КНОПКА АТАКИ
    
    toggleMapBtn.addEventListener('click', toggleMiniMap);

    // Начальное состояние
    updateHealthBar();
});
