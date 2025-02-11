class Player {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.moveSpeed = 2;
        this.rotateSpeed = Math.PI;
        this.health = 100;
        this.radius = 0.15;
    }

    update(deltaTime) {
        // Movement
        if (Input.keys.w) {
            this.move(deltaTime, 1);
        }
        if (Input.keys.s) {
            this.move(deltaTime, -1);
        }
        
        // Rotation
        if (Input.keys.a) {
            this.rotate(deltaTime, -1);
        }
        if (Input.keys.d) {
            this.rotate(deltaTime, 1);
        }
    }

    move(deltaTime, direction) {
        const moveX = Math.cos(this.angle) * this.moveSpeed * deltaTime * direction;
        const moveY = Math.sin(this.angle) * this.moveSpeed * deltaTime * direction;
        
        // Calculate new position
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        // Check collision for X and Y movements separately
        if (!this.game.map.checkCollision(newX, this.y, this.radius)) {
            this.x = newX;
        }
        if (!this.game.map.checkCollision(this.x, newY, this.radius)) {
            this.y = newY;
        }
    }

    rotate(deltaTime, direction) {
        this.angle += this.rotateSpeed * deltaTime * direction;
    }
} 