// game.js

const GAME_CONSTANTS = {
    // Игрок
    PLAYER_SPEED_WALK: 15,
    PLAYER_SPEED_FLY: 30,
    PLAYER_ATTACK_DAMAGE: 35,
    // Боты
    BOT_SPEED_WALK: 10,       // Скорость внутри зоны
    BOT_SPEED_RUN: 20,        // Скорость при бегстве от зоны или преследовании
    BOT_FLY_CHANCE: 0.1,      // Шанс активации полета/ускорения при вне зоны (на тик)
    BOT_ATTACK_DAMAGE: 10,
    BOT_ATTACK_RANGE: 70,     // Меньше, чем у игрока
    // Общие
    STAMINA_MAX: 100,
    STAMINA_DRAIN: 2.0,       // Трата за тик
    STAMINA_REGEN: 1.5,       // Регенерация за тик
    ATTACK_RANGE: 100,
    FRAME_RATE_DIVIDER: 20,   // Частота обновления 20 FPS (1000ms / 50ms)
    DAMAGE_RATE: 1000         
};

// ... (остальной код gameState, els - без изменений)
let gameState = {
    x: 0, 
    y: 0,
    hp: 100,
    stamina: GAME_CONSTANTS.STAMINA_MAX,
    flying: false,
    entities: [],
    gameLoop: null,
    zoneDamageLoop: null,
    dead: false,
    input: { x: 0, y: 0 }
};

const els = {
    world: document.getElementById('world-container'),
    player: document.getElementById('my-bird'),
    uiHP: document.getElementById('ui-hp'),
    uiStamina: document.getElementById('ui-stamina-val'),
    hpFill: document.getElementById('hp-fill'),
    staminaFill: document.getElementById('stamina-fill'),
    uiAlive: document.getElementById('ui-alive'),
    btnFly: document.getElementById('btn-fly')
};


// --- УТИЛИТЫ ---

function findClosestTarget(x, y, excludeId) {
    let closest = null;
    let minDist = Infinity;
    
    const allLiving = [
        ...gameState.entities.filter(e => e.hp > 0),
        { id: 'player', x: gameState.x, y: gameState.y, hp: gameState.hp }
    ].filter(e => e.id !== excludeId);

    allLiving.forEach(entity => {
        const dist = Math.hypot(entity.x - x, entity.y - y);
        if (dist < minDist) {
            minDist = dist;
            closest = entity;
        }
    });
    return closest;
}

// --- ИНИЦИАЛИЗАЦИЯ И ЛУПЫ ---

window.Game = {
    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        
        gameState.dead = false;
        gameState.hp = 100;
        gameState.stamina = GAME_CONSTANTS.STAMINA_MAX;
        gameState.x = 0;
        gameState.y = 0;
        els.player.style.display = 'flex';
        
        Zone.init();
        this.initEntities();
        this.toggleFly(false);
        
        this.stopLoops();
        this.runLoops();
        this.updateUI();
    },

    stopLoops() {
        clearInterval(gameState.gameLoop);
        clearInterval(gameState.zoneDamageLoop);
    },

    runLoops() {
        // Main loop is 50ms (20 times per second)
        gameState.gameLoop = setInterval(() => {
            this.handleInput();
            this.handlePlayerStamina();
            this.updateEntitiesMovement();
            this.updateCamera();
            this.updateUI();
        }, 50);

        gameState.zoneDamageLoop = setInterval(() => {
            this.checkAllZoneDamage();
        }, GAME_CONSTANTS.DAMAGE_RATE);
    },
    
    // --- СУЩНОСТИ ---
    
    initEntities() {
        document.querySelectorAll('.entity').forEach(e => {
            if(e.id !== 'my-bird') e.remove();
        });
        gameState.entities = [];
        
        for(let i=0; i<10; i++) {
            this.spawnEntity('bot'+i, '🐔', Math.random()*2000-1000, Math.random()*2000-1000, 60, 'enemy');
        }
    },

    spawnEntity(id, icon, x, y, hp, type) {
        const el = document.createElement('div');
        el.className = `entity entity-${type}`;
        el.id = id;
        el.innerHTML = `<div class="mini-hp-bar"><div class="mini-hp-fill" style="width: 100%;"></div></div>${icon}`;
        
        const entity = { 
            id, el, x, y, hp, maxHp: hp, type, 
            stamina: GAME_CONSTANTS.STAMINA_MAX, 
            flying: false,
            lastAttack: 0 
        };
        gameState.entities.push(entity);
        els.world.appendChild(el);
        this.updateEntityPos(entity);
    },

    // --- ЛОГИКА БОТОВ (ИСПРАВЛЕНО ДВИЖЕНИЕ) ---

    updateEntitiesMovement() {
        gameState.entities.forEach(ent => {
            if (ent.hp <= 0) return;
            
            this.handleBotStamina(ent);
            
            let dx = 0;
            let dy = 0;
            let speed = ent.flying ? GAME_CONSTANTS.BOT_SPEED_RUN : GAME_CONSTANTS.BOT_SPEED_WALK;
            
            const outsideZone = Zone.checkDamage(ent.x, ent.y);
            const closestTarget = findClosestTarget(ent.x, ent.y, ent.id);
            
            let targetX, targetY, targetId;

            // 1. ВЫБОР ЦЕЛИ
            if (outsideZone) {
                // ПРИОРИТЕТ 1: ЗОНА
                targetX = Zone.x;
                targetY = Zone.y;
                speed = GAME_CONSTANTS.BOT_SPEED_RUN;

                if (!ent.flying && ent.stamina > 10 && Math.random() < GAME_CONSTANTS.BOT_FLY_CHANCE) {
                    ent.flying = true;
                }
            } else if (closestTarget) {
                // ПРИОРИТЕТ 2: ВРАГ
                targetX = closestTarget.x;
                targetY = closestTarget.y;
                targetId = closestTarget.id;
                
                const distToTarget = Math.hypot(targetX - ent.x, targetY - ent.y);
                
                if (distToTarget < GAME_CONSTANTS.BOT_ATTACK_RANGE) {
                    this.botAttack(ent, targetId);
                    speed = 0; // Останавливаемся для атаки
                } else {
                    speed = ent.flying ? GAME_CONSTANTS.BOT_SPEED_RUN : GAME_CONSTANTS.BOT_SPEED_WALK; // Бежим к врагу
                }
                
            } else {
                // ПРИОРИТЕТ 3: НЕТ ЦЕЛИ (Случайное движение)
                dx = (Math.random() - 0.5);
                dy = (Math.random() - 0.5);
                speed = GAME_CONSTANTS.BOT_SPEED_WALK;
            }

            // 2. РАСЧЕТ ВЕКТОРА И ДВИЖЕНИЕ (ИСПРАВЛЕНО)
            if (speed > 0) {
                if (!outsideZone && !closestTarget) {
                    // Случайное движение (вектор dx/dy уже задан)
                } else {
                    // Движение к цели (Зона или Враг)
                    dx = targetX - ent.x;
                    dy = targetY - ent.y;
                }
                
                const dist = Math.hypot(dx, dy);
                
                // ИСПРАВЛЕНИЕ: Проверка, чтобы избежать деления на ноль, если dist=0
                if (dist > 0) { 
                    ent.x += (dx / dist) * speed / GAME_CONSTANTS.FRAME_RATE_DIVIDER; 
                    ent.y += (dy / dist) * speed / GAME_CONSTANTS.FRAME_RATE_DIVIDER; 
                }
            }

            if (ent.stamina <= 0) ent.flying = false;

            ent.x = Math.max(-1150, Math.min(1150, ent.x));
            ent.y = Math.max(-1150, Math.min(1150, ent.y));

            this.updateEntityPos(ent);
        });
    },

    botAttack(aggressor, targetId) {
        if (aggressor.lastAttack && (Date.now() - aggressor.lastAttack) < 500) {
            return;
        }
        
        this.takeDamage(targetId, GAME_CONSTANTS.BOT_ATTACK_DAMAGE);
        aggressor.lastAttack = Date.now();
    },

    handleBotStamina(entity) {
        if (entity.flying) {
            entity.stamina -= GAME_CONSTANTS.STAMINA_DRAIN;
            if (entity.stamina <= 0) {
                entity.stamina = 0;
                entity.flying = false;
            }
        } else {
            entity.stamina = Math.min(GAME_CONSTANTS.STAMINA_MAX, entity.stamina + GAME_CONSTANTS.STAMINA_REGEN);
        }
    },
    
    // --- ЛОГИКА ИГРОКА (ИСПРАВЛЕНО ДВИЖЕНИЕ) ---

    handleInput() {
        if (gameState.dead || (gameState.input.x === 0 && gameState.input.y === 0)) return;

        let speed = gameState.flying ? GAME_CONSTANTS.PLAYER_SPEED_FLY : GAME_CONSTANTS.PLAYER_SPEED_WALK;
        
        if (gameState.flying && gameState.stamina <= 0) {
            speed = GAME_CONSTANTS.PLAYER_SPEED_WALK / 2;
        }

        // ИСПРАВЛЕНИЕ: Движение теперь рассчитывается по полной скорости, деленной на FPS
        let newX = gameState.x + gameState.input.x * speed / GAME_CONSTANTS.FRAME_RATE_DIVIDER;
        let newY = gameState.y + gameState.input.y * speed / GAME_CONSTANTS.FRAME_RATE_DIVIDER;

        newX = Math.max(-1150, Math.min(1150, newX));
        newY = Math.max(-1150, Math.min(1150, newY));

        gameState.x = newX;
        gameState.y = newY;
    },

    handlePlayerStamina() {
        if (gameState.dead) return;
        
        if (gameState.flying) {
            gameState.stamina -= GAME_CONSTANTS.STAMINA_DRAIN;
            if (gameState.stamina <= 0) {
                gameState.stamina = 0;
                this.toggleFly(false);
            }
        } else {
            gameState.stamina = Math.min(GAME_CONSTANTS.STAMINA_MAX, gameState.stamina + GAME_CONSTANTS.STAMINA_REGEN);
        }
    },
    
    // --- (Остальные функции, включая toggleFly, updateCamera, takeDamage, checkAllZoneDamage, attack, die, checkWin, updateUI, handleButton - без изменений) ---

    updateEntityPos(entity) {
        if (entity.hp <= 0) {
            entity.el.style.display = 'none';
            return;
        }
        
        const center = ZONE_SETTINGS.HALF_WORLD; 
        const offset = 20;
        
        entity.el.style.left = (entity.x + center - offset) + 'px';
        entity.el.style.top = (entity.y + center - offset) + 'px';
        entity.el.style.display = 'flex';
    },

    toggleFly(state) {
        if (gameState.dead) return;

        if (state === undefined) {
            state = !gameState.flying;
        }

        if (state && gameState.stamina < 10) { 
            return;
        }
        
        gameState.flying = state;
        
        if (gameState.flying) {
            els.player.classList.add('flying');
            els.btnFly.classList.add('active');
        } else {
            els.player.classList.remove('flying');
            els.btnFly.classList.remove('active');
        }
    },

    updateCamera() {
        if (gameState.dead) return;
        
        const targetX = gameState.x;
        const targetY = gameState.y;

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        const offsetX = (viewW / 2) - (targetX + ZONE_SETTINGS.HALF_WORLD);
        const offsetY = (viewH / 2) - (targetY + ZONE_SETTINGS.HALF_WORLD);

        els.world.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    },

    takeDamage(entityId, amount) {
        if (entityId === 'player') {
            gameState.hp -= amount;
            if (gameState.hp <= 0) {
                this.die();
            }
        } else {
            const ent = gameState.entities.find(e => e.id === entityId);
            if (ent && ent.hp > 0) {
                ent.hp -= amount;
                const fill = ent.el.querySelector('.mini-hp-fill');
                if (fill) fill.style.width = (ent.hp / ent.maxHp * 100) + '%';
            }
        }
    },

    checkAllZoneDamage() {
        if (gameState.dead) return;
        
        if (Zone.checkDamage(gameState.x, gameState.y)) {
            this.takeDamage('player', ZONE_SETTINGS.DAMAGE_PER_SEC);
        }
        
        gameState.entities.forEach(ent => {
            if (ent.hp > 0 && Zone.checkDamage(ent.x, ent.y)) {
                this.takeDamage(ent.id, ZONE_SETTINGS.DAMAGE_PER_SEC);
            }
        });
        
        this.checkWin();
    },
    
    attack() {
        if (gameState.dead) return;
        
        const fx = document.createElement('div');
        fx.className = 'attack-effect';
        document.getElementById('player-anchor').appendChild(fx);
        setTimeout(()=>fx.remove(), 300);

        const targetEntities = gameState.entities.filter(ent => ent.hp > 0 && Math.hypot(ent.x - gameState.x, ent.y - gameState.y) < GAME_CONSTANTS.ATTACK_RANGE);

        targetEntities.forEach(ent => {
            this.takeDamage(ent.id, GAME_CONSTANTS.PLAYER_ATTACK_DAMAGE);
        });
    },

    die() {
        gameState.dead = true;
        els.player.style.display = 'none';
        this.stopLoops();
        document.getElementById('game-over-screen').classList.remove('hidden');
    },
    
    checkWin() {
        const enemies = gameState.entities.filter(e => e.type !== 'player' && e.hp > 0).length;
        if (enemies === 0 && !gameState.dead) {
            document.getElementById('go-title').innerText = "ПОБЕДА!";
            document.getElementById('go-desc').innerText = "Вы победили всех врагов!";
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.stopLoops();
        }
    },

    updateUI() {
        els.uiHP.innerText = Math.max(0, Math.ceil(gameState.hp));
        els.hpFill.style.width = Math.max(0, gameState.hp) + '%';
        
        els.uiStamina.innerText = Math.max(0, Math.ceil(gameState.stamina));
        els.staminaFill.style.width = Math.max(0, gameState.stamina) + '%';
        
        const aliveCount = gameState.entities.filter(e => e.hp > 0).length;
        els.uiAlive.innerText = aliveCount;
    }
};

// --- УПРАВЛЕНИЕ ---

const handleButton = (id, dx, dy, isDown) => {
    const btn = document.getElementById(id);
    const handler = (e) => { 
        e.preventDefault(); 
        if (isDown) {
            gameState.input.x = dx; 
            gameState.input.y = dy;
        } else {
            // Сбрасываем input только если отпускаем ту же кнопку
            if(gameState.input.x === dx && gameState.input.y === dy) {
                gameState.input.x = 0; 
                gameState.input.y = 0; 
            }
        }
    };
    btn.addEventListener(isDown ? 'mousedown' : 'mouseup', handler);
    btn.addEventListener(isDown ? 'touchstart' : 'touchend', handler);
    if (!isDown) btn.addEventListener('mouseleave', (e) => {
        if (e.buttons === 0) handler(e);
    });
};

// Привязка DPad
handleButton('btn-up', 0, -1, true);
handleButton('btn-up', 0, -1, false);
handleButton('btn-down', 0, 1, true);
handleButton('btn-down', 0, 1, false);
handleButton('btn-left', -1, 0, true);
handleButton('btn-left', -1, 0, false);
handleButton('btn-right', 1, 0, true);
handleButton('btn-right', 1, 0, false);

// Кнопки действий
document.getElementById('btn-fly').onclick = () => Game.toggleFly();
document.getElementById('btn-attack').onclick = () => Game.attack();
