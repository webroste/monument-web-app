// zone.js

// --- КОНСТАНТЫ ЗОНЫ ---
const ZONE_SETTINGS = {
    WORLD_SIZE: 2400,
    HALF_WORLD: 1200, // Центр мира в CSS
    START_SIZE: 2400,
    MIN_SIZE: 300,
    SHRINK_AMOUNT: 400,
    SHRINK_TIME: 15000, // Каждые 15 секунд
    DAMAGE_PER_SEC: 10
};

// --- СОСТОЯНИЕ ЗОНЫ ---
const Zone = {
    size: ZONE_SETTINGS.START_SIZE,
    x: 0, // Логический центр X (-1200 до 1200)
    y: 0, // Логический центр Y
    el: null, // Инициализируется в Game.start

    init() {
        this.el = document.getElementById('safe-zone');
        this.size = ZONE_SETTINGS.START_SIZE;
        this.x = 0;
        this.y = 0;
        this.updateVisuals();
        
        setTimeout(() => this.startShrinking(), 5000);
    },

    updateVisuals() {
        this.el.style.width = this.size + 'px';
        this.el.style.height = this.size + 'px';
        
        // КЛЮЧЕВОЙ МОМЕНТ: ПРАВИЛЬНЫЙ РАСЧЕТ КООРДИНАТ
        // CSS Left: (Логический X + 1200) - (Размер Зоны / 2)
        const cssLeft = (this.x + ZONE_SETTINGS.HALF_WORLD) - (this.size / 2);
        const cssTop = (this.y + ZONE_SETTINGS.HALF_WORLD) - (this.size / 2);

        this.el.style.left = cssLeft + 'px';
        this.el.style.top = cssTop + 'px';
    },

    startShrinking() {
        if (this.size <= ZONE_SETTINGS.MIN_SIZE) {
            document.getElementById('ui-zone-status').innerText = "Final Zone";
            return;
        }

        document.getElementById('ui-zone-status').innerText = "Shrinking...";
        
        const newSize = Math.max(ZONE_SETTINGS.MIN_SIZE, this.size - ZONE_SETTINGS.SHRINK_AMOUNT);
        
        const maxShift = 100;
        const newX = this.x + (Math.random() * maxShift - maxShift / 2);
        const newY = this.y + (Math.random() * maxShift - maxShift / 2);

        this.size = newSize;
        this.x = newX;
        this.y = newY;
        
        this.updateVisuals();
        
        setTimeout(() => this.startShrinking(), ZONE_SETTINGS.SHRINK_TIME);
    },

    checkDamage(entityX, entityY) {
        const dist = Math.hypot(entityX - this.x, entityY - this.y);
        const radius = this.size / 2;
        return dist > radius;
    }
};
