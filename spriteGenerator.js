class SpriteGenerator {
    constructor() {
        this.cache = new Map();
    }

    generateSprite(type) {
        if (this.cache.has(type)) {
            return this.cache.get(type);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        switch(type) {
            case 'enemy':
                this.generateEnemy(ctx);
                break;
            case 'wall':
                this.generateWall(ctx);
                break;
            case 'treasure':
                this.generateTreasure(ctx);
                break;
            case 'trap':
                this.generateTrap(ctx);
                break;
        }

        const sprite = new Image();
        sprite.src = canvas.toDataURL();
        this.cache.set(type, sprite);
        return sprite;
    }

    generateEnemy(ctx) {
        // Basic enemy shape
        ctx.fillStyle = '#f00';
        ctx.fillRect(16, 8, 32, 48);
        
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.fillRect(22, 16, 8, 8);
        ctx.fillRect(34, 16, 8, 8);
        
        // Mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(24, 32, 16, 4);
    }

    generateWall(ctx) {
        // Create brick pattern
        ctx.fillStyle = '#555';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add brick details
        ctx.fillStyle = '#333';
        for (let y = 0; y < 64; y += 16) {
            for (let x = 0; x < 64; x += 32) {
                ctx.fillRect(x, y, 30, 14);
            }
        }
    }

    generateTreasure(ctx) {
        // Chest base
        ctx.fillStyle = '#842';
        ctx.fillRect(8, 24, 48, 32);
        
        // Chest lid
        ctx.fillStyle = '#731';
        ctx.beginPath();
        ctx.moveTo(4, 24);
        ctx.lineTo(60, 24);
        ctx.lineTo(54, 8);
        ctx.lineTo(10, 8);
        ctx.closePath();
        ctx.fill();
    }

    generateTrap(ctx) {
        // Spikes
        ctx.fillStyle = '#999';
        for (let x = 8; x < 64; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, 48);
            ctx.lineTo(x + 6, 16);
            ctx.lineTo(x + 12, 48);
            ctx.closePath();
            ctx.fill();
        }
    }
} 