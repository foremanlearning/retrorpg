class SpriteGenerator {
    constructor() {
        this.cache = new Map();
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
        
        // Set standard size for sprites
        this.offscreenCanvas.width = 64;
        this.offscreenCanvas.height = 64;
        
        // Enable image smoothing
        this.offscreenCtx.imageSmoothingEnabled = true;
        this.offscreenCtx.imageSmoothingQuality = 'high';
    }

    generateSprite(type) {
        if (this.cache.has(type)) {
            return this.cache.get(type);
        }

        // Clear offscreen canvas
        this.offscreenCtx.clearRect(0, 0, 64, 64);

        switch(type) {
            case 'enemy':
                this.generateEnemy();
                break;
            case 'wall':
                this.generateWall();
                break;
            case 'treasure':
                this.generateTreasure();
                break;
            case 'trap':
                this.generateTrap();
                break;
        }

        // Create smooth sprite from offscreen canvas
        const sprite = new Image();
        sprite.src = this.offscreenCanvas.toDataURL('image/png');
        
        // Cache the sprite
        this.cache.set(type, sprite);
        return sprite;
    }

    generateEnemy() {
        // Anti-aliased enemy shape
        this.offscreenCtx.beginPath();
        this.offscreenCtx.moveTo(16, 8);
        this.offscreenCtx.bezierCurveTo(16, 8, 48, 8, 48, 56);
        this.offscreenCtx.bezierCurveTo(48, 56, 16, 56, 16, 8);
        
        // Gradient fill
        const gradient = this.offscreenCtx.createLinearGradient(16, 32, 48, 32);
        gradient.addColorStop(0, '#f00');
        gradient.addColorStop(1, '#900');
        this.offscreenCtx.fillStyle = gradient;
        this.offscreenCtx.fill();
        
        // Smooth eyes
        this.offscreenCtx.fillStyle = '#ff0';
        this.offscreenCtx.shadowBlur = 2;
        this.offscreenCtx.shadowColor = '#ff0';
        this.generateSmoothCircle(22, 20, 4); // Left eye
        this.generateSmoothCircle(34, 20, 4); // Right eye
        
        // Smooth mouth
        this.offscreenCtx.fillStyle = '#000';
        this.offscreenCtx.shadowBlur = 0;
        this.generateSmoothRect(24, 32, 16, 4);
    }

    generateSmoothCircle(x, y, radius) {
        this.offscreenCtx.beginPath();
        this.offscreenCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.offscreenCtx.fill();
    }

    generateSmoothRect(x, y, width, height) {
        this.offscreenCtx.beginPath();
        this.offscreenCtx.roundRect(x, y, width, height, 1);
        this.offscreenCtx.fill();
    }

    generateWall() {
        // Create brick pattern
        this.offscreenCtx.fillStyle = '#555';
        this.offscreenCtx.fillRect(0, 0, 64, 64);
        
        // Add brick details
        this.offscreenCtx.fillStyle = '#333';
        for (let y = 0; y < 64; y += 16) {
            for (let x = 0; x < 64; x += 32) {
                this.offscreenCtx.fillRect(x, y, 30, 14);
            }
        }
    }

    generateTreasure() {
        // Chest base
        this.offscreenCtx.fillStyle = '#842';
        this.offscreenCtx.fillRect(8, 24, 48, 32);
        
        // Chest lid
        this.offscreenCtx.fillStyle = '#731';
        this.offscreenCtx.beginPath();
        this.offscreenCtx.moveTo(4, 24);
        this.offscreenCtx.lineTo(60, 24);
        this.offscreenCtx.lineTo(54, 8);
        this.offscreenCtx.lineTo(10, 8);
        this.offscreenCtx.closePath();
        this.offscreenCtx.fill();
    }

    generateTrap() {
        // Spikes
        this.offscreenCtx.fillStyle = '#999';
        for (let x = 8; x < 64; x += 12) {
            this.offscreenCtx.beginPath();
            this.offscreenCtx.moveTo(x, 48);
            this.offscreenCtx.lineTo(x + 6, 16);
            this.offscreenCtx.lineTo(x + 12, 48);
            this.offscreenCtx.closePath();
            this.offscreenCtx.fill();
        }
    }
} 