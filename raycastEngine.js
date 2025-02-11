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

        // Add buffer for image data
        this.imageBuffer = new ArrayBuffer(screenWidth * 600 * 4);
        this.imageData = new Uint8ClampedArray(this.imageBuffer);
        
        // Precalculate some values
        this.screenWidthBytes = screenWidth * 4;
        this.textureSize = 64;
        this.textureMask = this.textureSize - 1;
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
        // Use our pre-allocated buffer
        const data = this.imageData;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Clear the buffer faster using Uint32Array
        const buf32 = new Uint32Array(this.imageBuffer);
        buf32.fill(0);
        
        // Calculate adjusted center point for floor/ceiling
        const centerY = height / 2;
        const adjustedCenter = centerY + (centerY * this.floorOffset);
        
        // Precalculate values for floor/ceiling casting
        const rayLeft = -this.fov / 2;
        const rayRight = this.fov / 2;
        const cosPlayerAngle = Math.cos(this.player.angle);
        const sinPlayerAngle = Math.sin(this.player.angle);
        
        // Render floor and ceiling with optimized loop
        const startY = Math.floor(adjustedCenter);
        const endY = height;
        
        for (let y = startY; y < endY; y++) {
            const p = y - adjustedCenter;
            const rowDistance = (height / 2) / p;
            
            // Precalculate ray directions
            const floorStepX = rowDistance * (Math.cos(this.player.angle + rayRight) - Math.cos(this.player.angle + rayLeft)) / width;
            const floorStepY = rowDistance * (Math.sin(this.player.angle + rayRight) - Math.sin(this.player.angle + rayLeft)) / width;
            
            let floorX = this.player.x + rowDistance * Math.cos(this.player.angle + rayLeft);
            let floorY = this.player.y + rowDistance * Math.sin(this.player.angle + rayLeft);

            const rowIdx = y * this.screenWidthBytes;
            const ceilY = Math.floor(2 * adjustedCenter - y + (centerY * this.ceilingOffset));
            const ceilIdx = ceilY * this.screenWidthBytes;

            for (let x = 0; x < width; x++) {
                const cellX = Math.floor(floorX);
                const cellY = Math.floor(floorY);

                // Fast texture coordinate calculation
                const tx = ((floorX - cellX) * this.textureSize) & this.textureMask;
                const ty = ((floorY - cellY) * this.textureSize) & this.textureMask;

                // Get floor and ceiling textures
                const floorTexture = this.textureLoader.loadedTextures[this.map.getFloorTexture(cellX, cellY)];
                const ceilingTexture = this.textureLoader.loadedTextures[this.map.getCeilingTexture(cellX, cellY)];

                const pixelIdx = rowIdx + (x << 2);
                const brightness = Math.max(0.2, 1.0 - (rowDistance / this.maxDistance));

                // Apply floor texture
                if (floorTexture) {
                    const pixel = this.textureLoader.getPixel(floorTexture, tx/this.textureSize, ty/this.textureSize);
                    data[pixelIdx] = pixel.r * brightness;
                    data[pixelIdx + 1] = pixel.g * brightness;
                    data[pixelIdx + 2] = pixel.b * brightness;
                    data[pixelIdx + 3] = 255;
                }

                // Apply ceiling texture
                if (ceilingTexture && ceilY >= 0 && ceilY < height) {
                    const ceilPixelIdx = ceilIdx + (x << 2);
                    const pixel = this.textureLoader.getPixel(ceilingTexture, tx/this.textureSize, ty/this.textureSize);
                    data[ceilPixelIdx] = pixel.r * brightness;
                    data[ceilPixelIdx + 1] = pixel.g * brightness;
                    data[ceilPixelIdx + 2] = pixel.b * brightness;
                    data[ceilPixelIdx + 3] = 255;
                }

                floorX += floorStepX;
                floorY += floorStepY;
            }
        }

        // Optimize wall rendering
        const stripWidth = Math.ceil(width / this.rayCount);
        
        for (let i = 0; i < this.rayCount; i++) {
            const ray = this.rays[i];
            const distance = ray.distance;
            const wallHeight = Math.ceil((height / distance) * 0.5 * this.wallHeight);
            const stripHeight = Math.min(wallHeight, height);
            const stripY = Math.floor(adjustedCenter - (stripHeight / 2));

            // Skip if wall strip is completely off screen
            if (stripY + stripHeight < 0 || stripY >= height) continue;

            // Get wall texture
            const hitX = this.player.x + Math.cos(ray.angle) * distance;
            const hitY = this.player.y + Math.sin(ray.angle) * distance;
            const texturePath = this.map.getWallTexture(Math.floor(hitX), Math.floor(hitY));
            const texture = this.textureLoader.loadedTextures[texturePath];

            if (texture) {
                const wallX = ray.side === 0 ? 
                    hitY - Math.floor(hitY) : 
                    hitX - Math.floor(hitX);
                
                const shade = ray.side === 1 ? 0.7 : 1;
                const brightness = Math.max(0, 1 - (distance / this.maxDistance));
                const brightShade = brightness * shade;
                
                // Precalculate strip bounds
                const startY = Math.max(0, stripY);
                const endY = Math.min(height, stripY + stripHeight);
                const stripStartX = i * stripWidth;
                const stripEndX = Math.min(width, stripStartX + stripWidth);

                for (let y = startY; y < endY; y++) {
                    const textureY = ((y - stripY) * this.textureSize / stripHeight) & this.textureMask;
                    const pixel = this.textureLoader.getPixel(texture, wallX, textureY/this.textureSize);
                    
                    const rowStart = y * this.screenWidthBytes;
                    for (let x = stripStartX; x < stripEndX; x++) {
                        const idx = rowStart + (x << 2);
                        data[idx] = pixel.r * brightShade;
                        data[idx + 1] = pixel.g * brightShade;
                        data[idx + 2] = pixel.b * brightShade;
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        // Create ImageData only once and reuse the buffer
        const imageData = new ImageData(data, width, height);
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