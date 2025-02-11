class RaycastEngine {
    constructor(map, screenWidth) {
        this.map = map;
        this.screenWidth = screenWidth;
        this.fov = Math.PI / 3;
        this.rayCount = screenWidth;
        this.maxDistance = 16;
        this.rays = [];
        this.rayStep = 0.1; // Smaller steps for more precise detection
    }

    update(player) {
        this.rays = [];
        const rayAngleStep = this.fov / this.rayCount;

        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = player.angle - (this.fov / 2) + (rayAngleStep * i);
            const ray = this.castRay(player.x, player.y, rayAngle);
            this.rays.push(ray);
        }
    }

    castRay(startX, startY, angle) {
        let distance = 0;
        let hitWall = false;
        
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);

        while (!hitWall && distance < this.maxDistance) {
            distance += this.rayStep;
            
            const testX = startX + (rayDirX * distance);
            const testY = startY + (rayDirY * distance);
            
            const mapX = Math.floor(testX);
            const mapY = Math.floor(testY);

            // Check if we've hit a wall
            if (this.map.isWall(mapX, mapY)) {
                hitWall = true;
            }
        }

        // Fix fish-eye effect
        const correctedDistance = distance * Math.cos(angle - this.player.angle);
        
        return {
            distance: correctedDistance,
            angle: angle
        };
    }

    render(ctx) {
        const stripWidth = Math.ceil(ctx.canvas.width / this.rayCount);
        
        this.rays.forEach((ray, i) => {
            const distance = ray.distance;
            
            // Adjust wall height based on distance
            const wallHeight = (ctx.canvas.height / distance) * 0.5;
            
            // Calculate wall strip height
            const stripHeight = Math.min(wallHeight, ctx.canvas.height);
            const stripY = (ctx.canvas.height - stripHeight) / 2;
            
            // Add distance shading
            const brightness = Math.max(0, 1 - (distance / this.maxDistance));
            const color = Math.floor(brightness * 255);
            
            ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
            ctx.fillRect(i * stripWidth, stripY, stripWidth + 1, stripHeight);
        });
    }
} 