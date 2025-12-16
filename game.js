// game.js

// --- Настройка Игры ---
const STEP_SIZE = 30;
const MAX_OFFSET = 1200;
const BIRD_RADIUS_COLLISION = 15; 
const HEAL_RATE = 0.5;
const DAMAGE_RATE = 5;

// Элементы DOM
const platform = document.getElementById('platform');
const bird = document.getElementById('bird');
const blingCountDisplay = document.getElementById('bling-count');
const modeTextDisplay = document.getElementById('mode-text');
const gameObjectsContainer = document.getElementById('game-objects');
const healthFill = document.getElementById('health-fill');
const controls = document.getElementById('controls');

// --- Игровые Переменные ---
let health = 100;
let isFlying = false;
let worldX = 0;
let worldY = 0;
let playerX = 0; 
let playerY = 0; 

// Массив объектов на карте (координаты X, Y)
const OBJECTS = [
    // Блестяшки
    { id: 'b1', type: 'bling', x: 200, y: 150, collected: false },
    { id: 'b2', type: 'bling', x: -450, y: 300, collected: false },
    { id: 'b3', type: 'bling', x: 50, y: -600, collected: false },
    { id: 'b4', type: 'bling', x: 700, y: -100, collected: false },
    { id: 'b5', type: 'bling', x: -100, y: 800, collected: false },
    // Водные преграды (нельзя ходить)
    { id: 'w1', type: 'water', x: -200, y: 0, w: 250, h: 180 },
    { id: 'w2', type: 'water', x: 400, y: 500, w: 100, h: 300 },
    // Зона Лечения
    { id: 'h1', type: 'heal', x: 800, y: 800, w: 50, h: 50 },
    // Опасная Зона (Угроза / Босс-файт)
    { id: 'd1', type: 'danger', x: -700, y: -700, w: 100, h: 100, active: true, name: 'Спящий Кот' }
];

// --- Инициализация объектов на карте ---
function initializeObjects() {
    OBJECTS.forEach(obj => {
        const el = document.createElement('div');
        el.id = obj.id;
        el.classList.add('game-object');
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        if (obj.type === 'bling') {
            el.classList.add('object-bling');
            el.innerHTML = '✨';
        } else if (obj.type === 'water') {
            el.classList.add('object-water');
            el.innerHTML = '💧 Канал 💧';
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
        } else if (obj.type === 'danger') {
            el.classList.add('object-danger');
            el.innerHTML = `⚠️<br>${obj.name}`;
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
            if (obj.active) el.classList.add('active');
        } else if (obj.type === 'heal') {
            el.classList.add('object-heal');
            el.innerHTML = '🍓';
            el.style.width = `${obj.w}px`;
            el.style.height = `${obj.h}px`;
        }
        
        gameObjectsContainer.appendChild(el);
    });
}

// --- Логика Здоровья ---

function takeDamage(amount) {
    if (health <= 0) return;
    health = Math.max(0, health - amount);
    updateHealthBar();
    if (health === 0) {
        alert("💀 ВАША ПТИЧКА УМЕРЛА! Игра окончена. Перезагрузите страницу.");
        // Отключаем управление
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
    }
}

function heal(amount) {
    health = Math.min(100, health + amount);
    updateHealthBar();
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

// --- Логика Обновления Игры ---

function updateGame() {
    // 1. Смещаем мир/платформу и игровые объекты
    const transformStyle = `translate(${worldX}px, ${worldY}px)`;
    platform.style.transform = transformStyle;
    gameObjectsContainer.style.transform = transformStyle; 
    
    // 2. Обновляем UI
    const collectedCount = OBJECTS.filter(o => o.type === 'bling' && o.collected).length;
    blingCountDisplay.textContent = collectedCount;
    
    if (collectedCount === 5) {
        alert("🏆 ПОБЕДА! Вы собрали все блестяшки! 🏆");
    }
}

function checkBlingCollection() {
    OBJECTS.filter(o => o.type === 'bling' && !o.collected).forEach(obj => {
        const distanceX = Math.abs(obj.x - playerX);
        const distanceY = Math.abs(obj.y - playerY);
        
        if (distanceX < 40 && distanceY < 40) {
            obj.collected = true;
            document.getElementById(obj.id).style.display = 'none';
            updateGame(); 
        }
    });
}

function checkHealZone() {
    const healZone = OBJECTS.find(o => o.type === 'heal');
    const distanceX = Math.abs(healZone.x - playerX);
    const distanceY = Math.abs(healZone.y - playerY);
    
    // Лечение происходит, если птичка стоит на зоне и не летает
    if (distanceX < 40 && distanceY < 40 && !isFlying && health < 100) {
        heal(HEAL_RATE); 
    }
}

function checkDanger() {
    const dangerZone = OBJECTS.find(o => o.type === 'danger');
    const dangerEl = document.getElementById(dangerZone.id);
    
    const distanceX = Math.abs(dangerZone.x - playerX);
    const distanceY = Math.abs(dangerZone.y - playerY);
    
    const isInDanger = distanceX < 60 && distanceY < 60;
    
    // Логика "Спящего Кота":
    if (isInDanger && dangerZone.active) {
        dangerEl.classList.add('active'); 
        
        // Урон наносится только если птичка не летает (ходит/сидит)
        if (!isFlying) {
            takeDamage(DAMAGE_RATE); 
            console.log("Урон! Слишком громко ходишь!");
        }
    } else {
        dangerEl.classList.remove('active');
    }
}

function checkCollision(targetX, targetY) {
    if (!isFlying) {
        for (const obj of OBJECTS) {
            if (obj.type === 'water') {
                // Проверка коллизии с прямоугольником (AABB)
                if (targetX >= obj.x - BIRD_RADIUS_COLLISION && 
                    targetX <= obj.x + obj.w + BIRD_RADIUS_COLLISION &&
                    targetY >= obj.y - BIRD_RADIUS_COLLISION &&
                    targetY <= obj.y + obj.h + BIRD_RADIUS_COLLISION) 
                {
                    return true; // Коллизия с водой
                }
            }
        }
    }
    return false;
}

// --- Управление ---

window.move = function(dx, dy) {
    if (health <= 0) return;

    const newPlayerX = playerX + dx * STEP_SIZE;
    const newPlayerY = playerY + dy * STEP_SIZE;

    // Проверка границ
    if (Math.abs(newPlayerX) > MAX_OFFSET || Math.abs(newPlayerY) > MAX_OFFSET) {
         return;
    }

    // Проверка коллизии
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
    isFlying = !isFlying;
    bird.classList.toggle('flying', isFlying);
    bird.classList.toggle('walking', !isFlying);
    modeTextDisplay.textContent = isFlying ? 'Полёт' : 'Ходьба';
    
    // Проверка опасности
    checkDanger();
}

// --- Инициализация и Циклы ---

document.addEventListener('DOMContentLoaded', () => {
    // Привязка управления к кнопкам
    document.getElementById('mode').addEventListener('click', window.changeMode);
    document.getElementById('up').addEventListener('click', () => window.move(0, -1));
    document.getElementById('down').addEventListener('click', () => window.move(0, 1));
    document.getElementById('left').addEventListener('click', () => window.move(-1, 0));
    document.getElementById('right').addEventListener('click', () => window.move(1, 0));

    // Основной цикл игры (для постоянной проверки состояния)
    setInterval(function() {
         if (health > 0) {
             checkDanger();
             checkHealZone();
         }
    }, 300); // Проверка каждые 0.3 секунды

    // Запуск
    initializeObjects();
    updateGame();
    updateHealthBar();
});
