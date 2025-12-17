// game.js

const GAME_CONSTANTS = {
    PLAYER_SPEED_WALK: 15,
    PLAYER_SPEED_FLY: 30,
    STAMINA_DRAIN: 2.0, // Трата за тик
    STAMINA_REGEN: 1.0, // Регенерация за тик
    ATTACK_RANGE: 100,
    DAMAGE_RATE: 1000 // Интервал для нанесения урона зоной (1 секунда)
};

let gameState = {
    x: 0, // Логическая позиция игрока
    y: 0,
    hp: 100,
    stamina: 100,
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

// --- ИНИЦИАЛИЗАЦИЯ ---

window.Game = {
    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        
        // Сброс состояния
        gameState.dead = false;
        gameState.hp = 100;
        gameState.stamina = 100;
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
        gameState.gameLoop = setInterval(() => {
            this.handleInput();
            this.handleStamina();
            this.updateEntitiesMovement();
            this.updateCamera();
            this.updateUI();
        }, 50); // 20 FPS

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
        
        this.spawnEntity('boss', '🐱', 500, -500, 200, 'boss'); // Boss
        for(let i=0; i<9; i++) {
            this.spawnEntity('bot'+i, '🐔', Math.random()*2000-1000, Math.random()*2000-1000, 60, 'enemy');
        }
    },

    spawnEntity(id, icon, x, y, hp, type) {
        const el = document.createElement('div');
        el.className = `entity entity-${type}`;
        el.id = id;
        el.innerHTML = `<div class="mini-hp-bar"><div class="mini-hp-fill" style="width: 100%;"></div></div>${icon}`;
        
        const entity = { id, el, x, y, hp, maxHp: hp, type };
        gameState.entities.push(entity);
        els.world.appendChild(el);
        this.updateEntityPos(entity);
    },
    
    updateEntityPos(entity) {
        if (entity.hp <= 0) {
            entity.el.style.display = 'none';
            return;
        }
        
        const center = ZONE_SETTINGS.HALF_WORLD; 
        const offset = entity.type === 'boss' ? 30 : 20; 
        
        entity.el.style.left = (entity.x + center - offset) + 'px';
        entity.el.style.top = (entity.y + center - offset) + 'px';
        entity.el.style.display = 'flex';
    },

    updateEntitiesMovement() {
        gameState.entities.forEach(ent => {
            if (ent.hp <= 0) return;
            
            const speed = ent.type === 'boss' ? 5 : 10;
            ent.x += (Math.random() - 0.5) * speed;
            ent.y += (Math.random() - 0.5) * speed;
            
            ent.x = Math.max(-1150, Math.min(1150, ent.x));
            ent.y = Math.max(-1150, Math.min(1150, ent.y));

            this.updateEntityPos(ent);
        });
    },

    // --- ЛОГИКА ДВИЖЕНИЯ/СТАМИНЫ ---
    
    handleInput() {
        if (gameState.dead || (gameState.input.x === 0 && gameState.input.y === 0)) return;

        let speed = gameState.flying ? GAME_CONSTANTS.PLAYER_SPEED_FLY : GAME_CONSTANTS.PLAYER_SPEED_WALK;
        
        if (gameState.flying && gameState.stamina <= 0) {
            speed = GAME_CONSTANTS.PLAYER_SPEED_WALK / 2; // Медленное падение
        }

        let newX = gameState.x + gameState.input.x * speed / 4; 
        let newY = gameState.y + gameState.input.y * speed / 4;

        newX = Math.max(-1150, Math.min(1150, newX));
        newY = Math.max(-1150, Math.min(1150, newY));

        gameState.x = newX;
        gameState.y = newY;
    },

    handleStamina() {
        if (gameState.dead) return;
        
        if (gameState.flying) {
            gameState.stamina -= GAME_CONSTANTS.STAMINA_DRAIN;
            if (gameState.stamina <= 0) {
                gameState.stamina = 0;
                this.toggleFly(false); 
            }
        } else {
            gameState.stamina = Math.min(100, gameState.stamina + GAME_CONSTANTS.STAMINA_REGEN);
        }
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

    // --- ЛОГИКА КАМЕРЫ ---

    updateCamera() {
        if (gameState.dead) return;
        
        const targetX = gameState.x;
        const targetY = gameState.y;

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        // КЛЮЧЕВОЙ МОМЕНТ: ПРАВИЛЬНЫЙ РАСЧЕТ СМЕЩЕНИЯ МИРА
        // offsetX = (Центр экрана) - (Позиция цели в CSS world-container)
        const offsetX = (viewW / 2) - (targetX + ZONE_SETTINGS.HALF_WORLD);
        const offsetY = (viewH / 2) - (targetY + ZONE_SETTINGS.HALF_WORLD);

        els.world.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    },

    // --- УРОН И СМЕРТЬ ---

    takeDamage(entity, amount) {
        if (entity === 'player') {
            gameState.hp -= amount;
            if (gameState.hp <= 0) {
                this.die();
            }
        } else {
            const ent = gameState.entities.find(e => e.id === entity);
            if (ent && ent.hp > 0) {
                ent.hp -= amount;
                const fill = ent.el.querySelector('.mini-hp-fill');
                if (fill) fill.style.width = (ent.hp / ent.maxHp * 100) + '%';
            }
        }
    },

    checkAllZoneDamage() {
        if (gameState.dead) return;
        
        // 1. Игрок
        if (Zone.checkDamage(gameState.x, gameState.y)) {
            this.takeDamage('player', ZONE_SETTINGS.DAMAGE_PER_SEC);
        }
        
        // 2. Боты и Босс (получают урон)
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

        gameState.entities.forEach(ent => {
            if (ent.hp > 0) {
                const dist = Math.hypot(ent.x - gameState.x, ent.y - gameState.y);
                if (dist < GAME_CONSTANTS.ATTACK_RANGE) {
                    this.takeDamage(ent.id, 35);
                }
            }
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
            document.getElementById('go-desc').innerText = "Вы победили всех врагов и Босса!";
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.stopLoops();
        }
    },

    // --- UI ---

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
