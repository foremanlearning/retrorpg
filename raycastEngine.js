class RaycastEngine {
    constructor(map, screenWidth) {
        this.map = map;
        this.screenWidth = screenWidth;
        this.player = null;  // Will be set by game
        
        // Get TextureLoader instance
        this.textureLoader = new TextureLoader();
        console.log('[RaycastEngine] Got TextureLoader instance');

        // Default height settings
        this.wallHeight = 1.0;
        this.floorOffset = 0.0;
        this.ceilingOffset = 0.0;

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

                // Load height settings
                if (raycastSettings.heights) {
                    this.wallHeight = raycastSettings.heights.wall;
                    this.floorOffset = raycastSettings.heights.floor;
                    this.ceilingOffset = raycastSettings.heights.ceiling;
                }
            })
            .catch(error => {
                console.warn('Failed to load settings, using defaults:', error);
                this.rayCount = screenWidth;
                this.fov = Math.PI / 3;
                this.maxDistance = 16;
                this.smoothShading = true;
                this.shadowIntensity = 0.7;
                this.wallHeight = 1.0;
                this.floorOffset = 0.0;
                this.ceilingOffset = 0.0;
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
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        
        // Calculate adjusted center point for floor/ceiling
        const centerY = ctx.canvas.height / 2;
        const adjustedCenter = centerY + (centerY * this.floorOffset);
        
        // Render floor and ceiling
        for (let y = adjustedCenter; y < ctx.canvas.height; y++) {
            const rayLeft = -this.fov / 2;
            const rayRight = this.fov / 2;
            const p = y - adjustedCenter;
            const posZ = ctx.canvas.height / 2;
            const rowDistance = posZ / p;
            
            // Calculate ray direction for the row
            const rayDirX0 = Math.cos(this.player.angle + rayLeft);
            const rayDirY0 = Math.sin(this.player.angle + rayLeft);
            const rayDirX1 = Math.cos(this.player.angle + rayRight);
            const rayDirY1 = Math.sin(this.player.angle + rayRight);

            // Floor casting
            for (let x = 0; x < ctx.canvas.width; x++) {
                // Calculate floor position
                const weight = x / ctx.canvas.width;
                const floorX = this.player.x + rowDistance * (rayDirX0 * (1.0 - weight) + rayDirX1 * weight);
                const floorY = this.player.y + rowDistance * (rayDirY0 * (1.0 - weight) + rayDirY1 * weight);
                
                const cellX = Math.floor(floorX);
                const cellY = Math.floor(floorY);

                // Get floor and ceiling textures
                const floorTexture = this.textureLoader.loadedTextures[this.map.getFloorTexture(cellX, cellY)];
                const ceilingTexture = this.textureLoader.loadedTextures[this.map.getCeilingTexture(cellX, cellY)];

                // Calculate texture coordinates
                const tx = Math.floor((floorX - cellX) * 64) & 63;
                const ty = Math.floor((floorY - cellY) * 64) & 63;

                // Calculate pixel indices with adjusted center
                const floorIndex = ((y * ctx.canvas.width) + x) * 4;
                const ceilY = Math.floor(2 * adjustedCenter - y + (centerY * this.ceilingOffset));
                const ceilIndex = ((ceilY * ctx.canvas.width) + x) * 4;

                // Apply floor texture
                if (floorTexture) {
                    const floorPixel = this.textureLoader.getPixel(floorTexture, tx/64, ty/64);
                    const brightness = Math.max(0.2, 1.0 - (rowDistance / this.maxDistance));
                    data[floorIndex] = floorPixel.r * brightness;
                    data[floorIndex + 1] = floorPixel.g * brightness;
                    data[floorIndex + 2] = floorPixel.b * brightness;
                    data[floorIndex + 3] = 255;
                }

                // Apply ceiling texture
                if (ceilingTexture && ceilY >= 0 && ceilY < ctx.canvas.height) {
                    const ceilPixel = this.textureLoader.getPixel(ceilingTexture, tx/64, ty/64);
                    const brightness = Math.max(0.2, 1.0 - (rowDistance / this.maxDistance));
                    data[ceilIndex] = ceilPixel.r * brightness;
                    data[ceilIndex + 1] = ceilPixel.g * brightness;
                    data[ceilIndex + 2] = ceilPixel.b * brightness;
                    data[ceilIndex + 3] = 255;
                }
            }
        }

        // Render walls
        const stripWidth = Math.ceil(ctx.canvas.width / this.rayCount);
        
        this.rays.forEach((ray, i) => {
            const distance = ray.distance;
            const wallHeight = Math.ceil((ctx.canvas.height / distance) * 0.5 * this.wallHeight);
            const stripHeight = Math.min(wallHeight, ctx.canvas.height);
            const stripY = Math.floor(adjustedCenter - (stripHeight / 2));

            // Get wall texture
            const hitX = this.player.x + Math.cos(ray.angle) * ray.distance;
            const hitY = this.player.y + Math.sin(ray.angle) * ray.distance;
            const texturePath = this.map.getWallTexture(Math.floor(hitX), Math.floor(hitY));

            // Draw textured wall strip
            if (texturePath && this.textureLoader.loadedTextures[texturePath]) {
                const texture = this.textureLoader.loadedTextures[texturePath];
                const wallX = ray.side === 0 ? 
                    hitY - Math.floor(hitY) : 
                    hitX - Math.floor(hitX);
                
                // Apply shading factors
                const shade = ray.side === 1 ? 0.7 : 1;
                const brightness = Math.max(0, 1 - (distance / this.maxDistance));
                
                // Draw strip directly to image data
                for (let y = 0; y <= stripHeight; y++) {
                    const textureY = y / stripHeight;
                    const pixel = this.textureLoader.getPixel(texture, wallX, textureY);
                    
                    // Fill entire strip width
                    for (let x = 0; x < stripWidth; x++) {
                        const screenX = i * stripWidth + x;
                        const screenY = stripY + y;
                        
                        // Ensure we don't draw outside the canvas
                        if (screenY >= 0 && screenY < ctx.canvas.height) {
                            const dataIndex = (screenY * ctx.canvas.width + screenX) * 4;
                            
                            // Set pixel colors with shading
                            data[dataIndex] = pixel.r * brightness * shade;
                            data[dataIndex + 1] = pixel.g * brightness * shade;
                            data[dataIndex + 2] = pixel.b * brightness * shade;
                            data[dataIndex + 3] = 255;
                        }
                    }
                }
            } else {
                // Fallback solid color
                const brightness = Math.max(0, 1 - (distance / this.maxDistance));
                const shade = ray.side === 1 ? 0.7 : 1;
                const color = Math.floor(brightness * 255 * shade);
                
                // Fill entire strip width
                for (let y = 0; y < stripHeight; y++) {
                    for (let x = 0; x < stripWidth; x++) {
                        const screenX = i * stripWidth + x;
                        const screenY = stripY + y;
                        const dataIndex = (screenY * ctx.canvas.width + screenX) * 4;
                        
                        data[dataIndex] = color;     // R
                        data[dataIndex + 1] = color; // G
                        data[dataIndex + 2] = color; // B
                        data[dataIndex + 3] = 255;   // A
                    }
                }
            }
        });

        // Put the image data back to canvas
        ctx.putImageData(imageData, 0, 0);

        // Draw debug overlay if needed
        if (visualDebug) {
            // Draw ray lines
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';  // Red with transparency
            ctx.lineWidth = 1;
            ctx.beginPath();
            const startX = this.player.x * 8;  // Scale to match minimap
            const startY = this.player.y * 8;
            const endX = startX + Math.cos(this.rays[Math.floor(this.rayCount/2)]?.angle || 0) * (this.rays[Math.floor(this.rayCount/2)]?.distance || 0) * 8;
            const endY = startY + Math.sin(this.rays[Math.floor(this.rayCount/2)]?.angle || 0) * (this.rays[Math.floor(this.rayCount/2)]?.distance || 0) * 8;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Draw strip connections
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';  // Green with transparency
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(this.rayCount/2 * stripWidth, this.rays[Math.floor(this.rayCount/2)]?.distance * 8);
            ctx.lineTo(this.rayCount/2 * stripWidth, this.rays[Math.floor(this.rayCount/2)]?.distance * 8 + stripWidth);
            ctx.stroke();

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