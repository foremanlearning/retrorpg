class RaycastEngine {
    constructor(map, screenWidth) {
        this.map = map;
        this.screenWidth = screenWidth;
        this.player = null;  // Will be set by game
        
        // Load settings
        fetch('settings.json')
            .then(response => response.json())
            .then(settings => {
                const raycastSettings = settings.graphics.raycasting;
                
                // Set ray count based on settings
                if (raycastSettings.rayCount === "screen_width") {
                    this.rayCount = screenWidth;
                } else {
                    // Use specified ray count, ensure it's a positive number
                    const count = parseInt(raycastSettings.rayCount);
                    this.rayCount = count > 0 ? count : screenWidth;
                }
                
                // Convert FOV from degrees to radians
                this.fov = (raycastSettings.fov * Math.PI) / 180;
                
                this.maxDistance = raycastSettings.maxDistance;
                this.smoothShading = raycastSettings.smoothShading;
                this.shadowIntensity = raycastSettings.shadowIntensity;
            })
            .catch(error => {
                console.warn('Failed to load settings, using defaults:', error);
                this.rayCount = screenWidth;
                this.fov = Math.PI / 3;
                this.maxDistance = 16;
                this.smoothShading = true;
                this.shadowIntensity = 0.7;
            });
            
        this.rays = [];
    }

    update(player) {
        this.player = player;  // Store reference to player
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

        // Use DDA (Digital Differential Analysis) for smoother stepping
        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);

        const mapX = Math.floor(startX);
        const mapY = Math.floor(startY);

        let sideDistX;
        let sideDistY;
        
        let stepX;
        let stepY;

        // Calculate step and initial sideDist
        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (startX - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - startX) * deltaDistX;
        }
        
        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (startY - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - startY) * deltaDistY;
        }

        // DDA
        let side; // 0 for X side, 1 for Y side
        let currentX = mapX;
        let currentY = mapY;

        while (!hitWall && distance < this.maxDistance) {
            // Jump to next map square
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                currentX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                currentY += stepY;
                side = 1;
            }

            // Check if ray has hit a wall
            if (this.map.isWall(currentX, currentY)) {
                hitWall = true;
                // Calculate exact distance to wall
                if (side === 0) {
                    distance = (currentX - startX + (1 - stepX) / 2) / rayDirX;
                } else {
                    distance = (currentY - startY + (1 - stepY) / 2) / rayDirY;
                }
            }
        }

        // Fix fisheye effect - remove this.player reference
        const correctedDistance = distance * Math.cos(angle - this.rays[Math.floor(this.rays.length/2)]?.angle || 0);
        
        return {
            distance: correctedDistance,
            angle: angle,
            side: side
        };
    }

    render(ctx, visualDebug = false) {
        const stripWidth = Math.ceil(ctx.canvas.width / this.rayCount);
        
        // Normal wall rendering
        this.rays.forEach((ray, i) => {
            const distance = ray.distance;
            
            // Smooth wall height calculation
            const wallHeight = (ctx.canvas.height / distance) * 0.5;
            const stripHeight = Math.min(wallHeight, ctx.canvas.height);
            const stripY = (ctx.canvas.height - stripHeight) / 2;
            
            // Add distance shading
            const brightness = Math.max(0, 1 - (distance / this.maxDistance));
            const shade = ray.side === 1 ? 0.7 : 1;
            const color = Math.floor(brightness * 255 * shade);
            
            ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
            ctx.fillRect(i * stripWidth, stripY, stripWidth + 1, stripHeight);

            // Visual debug overlay
            if (visualDebug) {
                // Draw ray lines
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';  // Red with transparency
                ctx.lineWidth = 1;
                ctx.beginPath();
                const startX = this.player.x * 8;  // Scale to match minimap
                const startY = this.player.y * 8;
                const endX = startX + Math.cos(ray.angle) * (ray.distance * 8);
                const endY = startY + Math.sin(ray.angle) * (ray.distance * 8);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw strip connections
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';  // Green with transparency
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(i * stripWidth, stripY);
                ctx.lineTo(i * stripWidth, stripY + stripHeight);
                ctx.stroke();
            }
        });

        if (visualDebug) {
            // Add visual debug info
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px monospace';
            ctx.fillText(`Rays: ${this.rayCount}`, 10, ctx.canvas.height - 40);
            ctx.fillText(`FOV: ${(this.fov * 180 / Math.PI).toFixed(1)}°`, 10, ctx.canvas.height - 25);
            ctx.fillText(`Ray Step: ${(this.fov / this.rayCount).toFixed(4)}rad`, 10, ctx.canvas.height - 10);
        }
    }

    // Get the distance for the ray in the middle of the view
    getWallDistance() {
        const middleRayIndex = Math.floor(this.rayCount / 2);
        return this.rays[middleRayIndex]?.distance || 0;
    }
} 