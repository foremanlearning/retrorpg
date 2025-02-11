class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.textureLoader = new TextureLoader();
        this.visualDebug = false;
        this.showMap = true;
        this.isInitialized = false;  // Add initialization flag
        
        // Start loading sequence
        this.initializeGame();
    }

    async initializeGame() {
        try {
            // Show initial loading screen
            this.showLoadingScreen('Loading settings...');

            // Load settings first
            const settings = await fetch('settings.json').then(r => r.json());
            this.width = settings.graphics.resolution.width;
            this.height = settings.graphics.resolution.height;
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            // Load texture list
            this.showLoadingScreen('Loading texture list...');
            const textureData = await fetch('textures/textures.json').then(r => r.json());
            this.textureSets = textureData.textures;
            this.textureSetNames = this.textureSets.map(set => set.name);
            
            // Select initial random texture set
            const randomIndex = Math.floor(Math.random() * this.textureSets.length);
            this.currentTextureSetIndex = randomIndex;
            this.currentTextureSet = this.textureSetNames[randomIndex];
            this.currentTextureData = this.textureSets[randomIndex];
            
            // Generate map first
            this.showLoadingScreen('Generating maze...');
            this.map = new Map(32, 32);
            this.map.generate(this.currentTextureData);  // Pass only current texture set

            // Collect textures needed for current set
            this.showLoadingScreen('Collecting texture list...');
            const neededTextures = new Set();
            
            // Add wall textures from current set
            for (let y = 0; y < this.map.height; y++) {
                for (let x = 0; x < this.map.width; x++) {
                    if (this.map.isWall(x, y)) {
                        const texture = this.map.getWallTexture(x, y);
                        if (texture) neededTextures.add(texture);
                    }
                }
            }
            
            // Add floor and ceiling textures from current set
            if (this.currentTextureData.floors) {
                this.currentTextureData.floors.forEach(path => neededTextures.add(path));
            }
            if (this.currentTextureData.ceilings) {
                this.currentTextureData.ceilings.forEach(path => neededTextures.add(path));
            }

            console.log('Loading textures:', neededTextures);

            // Load all textures synchronously
            const totalTextures = neededTextures.size;
            let loadedCount = 0;
            
            for (const texturePath of neededTextures) {
                this.showLoadingScreen(
                    `Loading texture ${loadedCount + 1}/${totalTextures}: ${texturePath}`,
                    loadedCount / totalTextures
                );
                
                try {
                    // Load texture synchronously
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            this.textureLoader.loadedTextures[texturePath] = {
                                width: img.width,
                                height: img.height,
                                data: imageData.data
                            };
                            resolve();
                        };
                        img.onerror = () => {
                            console.error(`Failed to load texture: ${texturePath}`);
                            resolve(); // Continue loading other textures
                        };
                        // Remove leading slash if present
                        const cleanPath = texturePath.replace(/^\//, '');
                        img.src = cleanPath;
                    });
                } catch (error) {
                    console.error(`Error loading texture ${texturePath}:`, error);
                }
                
                loadedCount++;
            }

            // Initialize game components
            this.showLoadingScreen('Initializing game...', 1);
            this.player = new Player(2, 2, Math.PI / 2);
            this.player.game = this;
            this.spriteManager = new SpriteGenerator();
            this.inventory = new Inventory();
            this.raycastEngine = new RaycastEngine(this.map, this.width);
            this.raycastEngine.player = this.player;
            this.raycastEngine.textureLoader = this.textureLoader;

            // Setup game state
            this.lastTime = performance.now();
            this.frameCount = 0;
            this.frameTimes = new Array(60).fill(0);
            this.frameTimeIndex = 0;
            this.portalActive = false;
            this.showPortalPrompt = false;

            // Setup event handlers
            this.setupEventHandlers();

            // Mark as initialized
            this.isInitialized = true;

            // Start game loop
            requestAnimationFrame(this.gameLoop.bind(this));

        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showLoadingScreen('Failed to load game!');
        }
    }

    showLoadingScreen(message, progress = 0) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw message
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width/2, this.canvas.height/2 - 40);

        // Draw progress bar
        const barWidth = this.canvas.width * 0.8;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height/2;

        // Bar border
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Bar fill
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }

    setupEventHandlers() {
        // Add portal activation handler
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'e' && this.showPortalPrompt) {
                this.activatePortal();
            }
        });
        
        // Add mouse teleport handler for development
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Only handle clicks within minimap area
            const cellSize = 8;
            const mapWidth = this.map.width * cellSize;
            const mapHeight = this.map.height * cellSize;
            
            if (mouseX < mapWidth && mouseY < mapHeight) {
                const gridX = Math.floor(mouseX / cellSize);
                const gridY = Math.floor(mouseY / cellSize);
                
                // Only teleport to passages (1), start (2), or end (3)
                const cellType = this.map.grid[gridY][gridX];
                if (cellType === 1 || cellType === 2 || cellType === 3) {
                    // Center player in the cell by adding 0.5 offset
                    this.player.x = gridX + 0.5;
                    this.player.y = gridY + 0.5;
                    console.log(`Teleported to ${this.player.x}, ${this.player.y} (cell type: ${cellType})`);
                }
            }
        });

        // Add visual debug toggle (Ctrl+V)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key.toLowerCase()) {
                    case 'v':
                        this.visualDebug = !this.visualDebug;
                        console.log(`Visual Debug: ${this.visualDebug ? 'ON' : 'OFF'}`);
                        break;
                    case 'm':
                        this.showMap = !this.showMap;
                        console.log(`Minimap: ${this.showMap ? 'ON' : 'OFF'}`);
                        break;
                }
            }
        });

        // Add texture set switching with [ and ] keys
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '[':
                    this.switchTextureSet(-1);
                    break;
                case ']':
                    this.switchTextureSet(1);
                    break;
            }
        });
    }

    init() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Store frame time
        this.frameTimes[this.frameTimeIndex] = deltaTime;
        this.frameTimeIndex = (this.frameTimeIndex + 1) % this.frameTimes.length;

        this.update(deltaTime);
        this.render(deltaTime);

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        this.player.update(deltaTime);
        this.raycastEngine.update(this.player);
        
        // Fix portal detection - use exact position comparison
        const playerX = Math.floor(this.player.x);
        const playerY = Math.floor(this.player.y);
        const endX = Math.floor(this.map.endPos.x);
        const endY = Math.floor(this.map.endPos.y);
        
        // Show prompt when player is in the end room (within 1 cell of portal)
        this.showPortalPrompt = (Math.abs(playerX - endX) <= 1 && 
                                Math.abs(playerY - endY) <= 1);
        
        if (this.showPortalPrompt) {
            console.log("Portal available!"); // Debug log
        }
    }

    render(deltaTime) {
        // Don't render until initialized
        if (!this.isInitialized) {
            return;
        }

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.renderEnvironment();
        this.raycastEngine.render(this.ctx, this.visualDebug);
        
        if (this.showPortalPrompt) {
            this.renderPortalPrompt();
        }
        
        this.renderDebug(deltaTime);
    }

    renderEnvironment() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height / 2);
        gradient.addColorStop(0, '#444');
        gradient.addColorStop(1, '#666');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height / 2);
        
        // Floor
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
    }

    renderPortalPrompt() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Press E to activate portal', 
            this.width / 2, 
            this.height - 50
        );
    }

    activatePortal() {
        this.portalActive = true;
        
        // Fade out effect
        const fadeOut = () => {
            const overlay = this.ctx.createRadialGradient(
                this.width/2, this.height/2, 0,
                this.width/2, this.height/2, this.width
            );
            overlay.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
            overlay.addColorStop(1, 'rgba(0, 0, 0, 1)');
            
            this.ctx.fillStyle = overlay;
            this.ctx.fillRect(0, 0, this.width, this.height);
        };
        
        // Transition to new maze
        let fadeFrames = 0;
        const transition = setInterval(() => {
            fadeFrames++;
            fadeOut();
            
            if (fadeFrames >= 30) {
                clearInterval(transition);
                // Generate new maze with current texture set
                this.map.generate();
                this.player.x = this.map.startPos.x;
                this.player.y = this.map.startPos.y;
                this.portalActive = false;
            }
        }, 16);
    }

    renderDebug(deltaTime) {
        if (this.showMap) {  // Only render map if enabled
            // Draw minimap - half size and in upper right
            const cellSize = 4;  // Reduced from 8 to 4
            const mapWidth = this.map.width * cellSize;
            const mapHeight = this.map.height * cellSize;
            
            // Position in upper right corner with small padding
            const mapX = this.width - mapWidth - 10;  // 10px padding from right
            const mapY = 10;  // 10px padding from top
            
            // Draw background
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(mapX, mapY, mapWidth, mapHeight);
            
            // Draw map cells
            for (let y = 0; y < this.map.height; y++) {
                for (let x = 0; x < this.map.width; x++) {
                    const cell = this.map.grid[y][x];
                    switch(cell) {
                        case 0: this.ctx.fillStyle = '#444'; break;
                        case 1: this.ctx.fillStyle = '#888'; break;
                        case 2: this.ctx.fillStyle = '#0f0'; break;
                        case 3: this.ctx.fillStyle = '#f00'; break;
                    }
                    this.ctx.fillRect(
                        mapX + (x * cellSize), 
                        mapY + (y * cellSize), 
                        cellSize - 1, 
                        cellSize - 1
                    );
                }
            }
            
            // Draw player - adjusted for new position and size
            this.ctx.fillStyle = '#00f';
            this.ctx.beginPath();
            this.ctx.arc(
                mapX + (this.player.x * cellSize),
                mapY + (this.player.y * cellSize),
                cellSize / 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw player direction
            this.ctx.strokeStyle = '#ff0';
            this.ctx.beginPath();
            this.ctx.moveTo(
                mapX + (this.player.x * cellSize),
                mapY + (this.player.y * cellSize)
            );
            this.ctx.lineTo(
                mapX + (this.player.x + Math.cos(this.player.angle)) * cellSize,
                mapY + (this.player.y + Math.sin(this.player.angle)) * cellSize
            );
            this.ctx.stroke();
            
            // Portal effect if active
            if (this.showPortalPrompt) {
                const portalX = mapX + (this.map.endPos.x * cellSize);
                const portalY = mapY + (this.map.endPos.y * cellSize);
                
                const gradient = this.ctx.createRadialGradient(
                    portalX, portalY, 0,
                    portalX, portalY, cellSize * 2
                );
                gradient.addColorStop(0, 'rgba(255, 0, 255, 0.5)');
                gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(portalX, portalY, cellSize * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Get debug info
        const avgDelta = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
        const fps = Math.round(1 / avgDelta);
        const msPerFrame = (avgDelta * 1000).toFixed(2);
        
        // Get current wall texture
        const middleRayIndex = Math.floor(this.raycastEngine.rayCount / 2);
        const middleRay = this.raycastEngine.rays[middleRayIndex];
        let currentWallTexture = 'none';
        
        if (middleRay) {
            const hitX = this.player.x + Math.cos(middleRay.angle) * middleRay.distance;
            const hitY = this.player.y + Math.sin(middleRay.angle) * middleRay.distance;
            const texture = this.map.getWallTexture(hitX, hitY);
            if (texture) {
                currentWallTexture = texture.split('\\').pop();
            }
        }

        // Setup text style
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';
        
        const diagnostics = [
            `FPS: ${fps}`,
            `Frame Time: ${msPerFrame}ms`,
            `Raw deltaTime: ${deltaTime}`,
            `Position: (${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)})`,
            `Angle: ${(this.player.angle * 180 / Math.PI).toFixed(1)}°`,
            `Wall Distance: ${this.raycastEngine.getWallDistance().toFixed(2)}`,
            `Current Wall Texture: ${currentWallTexture}`,
            '',
            'Available Texture Sets:',
            ...this.textureSetNames.map(name => {
                if (name === this.currentTextureSet) {
                    return `  - ${name} ◄ CURRENT`;
                }
                return `  - ${name}`;
            })
        ];

        // Position text in left side with padding
        const textX = 20;  // 20px from left edge
        let textY = 30;
        const lineHeight = 20;

        // Render text
        diagnostics.forEach(text => {
            if (text.includes('◄ CURRENT')) {
                const metrics = this.ctx.measureText(text);
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                this.ctx.fillRect(
                    textX - 5, 
                    textY - 15, 
                    metrics.width + 10, 
                    lineHeight
                );
            }
            
            this.ctx.strokeStyle = '#000';
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeText(text, textX, textY);
            this.ctx.fillText(text, textX, textY);
            textY += lineHeight;
        });
    }

    // Remove texture set switching since we're only loading one set
    switchTextureSet(direction = 1) {
        console.warn('Texture set switching disabled - requires loading new textures');
    }
} 