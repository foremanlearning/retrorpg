class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Game state
        this.map = new Map(32, 32);
        
        // Initialize map before creating player
        this.map.generate();
        
        // Start player in center of starting room
        this.player = new Player(2, 2, Math.PI / 2);
        this.player.game = this;
        
        this.spriteManager = new SpriteGenerator();
        this.inventory = new Inventory();
        this.raycastEngine = new RaycastEngine(this.map, this.width);
        this.raycastEngine.player = this.player;
        
        // Game loop
        this.lastTime = 0;
        this.portalActive = false;
        this.showPortalPrompt = false;
        
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
        
        this.init();
    }

    init() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

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

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render sky and floor
        this.renderEnvironment();
        
        // Render walls and sprites
        this.raycastEngine.render(this.ctx);
        
        // Draw portal prompt if player is near
        if (this.showPortalPrompt) {
            this.renderPortalPrompt();
        }
        
        // Add debug visualization
        this.renderDebug();
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
        // Remove the alert and add a transition effect instead
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
            
            if (fadeFrames >= 30) {  // After 30 frames (~0.5 seconds)
                clearInterval(transition);
                // Generate new maze and reset player
                this.map.generate();
                this.player.x = this.map.startPos.x;
                this.player.y = this.map.startPos.y;
                this.portalActive = false;
            }
        }, 16);  // Run every 16ms (~60fps)
    }

    renderDebug() {
        // Draw minimap
        const cellSize = 8;
        const mapWidth = this.map.width * cellSize;
        const mapHeight = this.map.height * cellSize;
        
        // Draw background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, mapWidth, mapHeight);
        
        // Draw map cells
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const cell = this.map.grid[y][x];
                // Different colors for different cell types
                switch(cell) {
                    case 0: // Wall
                        this.ctx.fillStyle = '#444';
                        break;
                    case 1: // Passage
                        this.ctx.fillStyle = '#888';
                        break;
                    case 2: // Start point
                        this.ctx.fillStyle = '#0f0';
                        break;
                    case 3: // End point
                        this.ctx.fillStyle = '#f00';
                        break;
                }
                this.ctx.fillRect(
                    x * cellSize, 
                    y * cellSize, 
                    cellSize - 1, 
                    cellSize - 1
                );
            }
        }
        
        // Draw player
        this.ctx.fillStyle = '#00f';  // Changed to blue to distinguish from end point
        this.ctx.beginPath();
        this.ctx.arc(
            this.player.x * cellSize,
            this.player.y * cellSize,
            cellSize / 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw player direction
        this.ctx.strokeStyle = '#ff0';
        this.ctx.beginPath();
        this.ctx.moveTo(
            this.player.x * cellSize,
            this.player.y * cellSize
        );
        this.ctx.lineTo(
            (this.player.x + Math.cos(this.player.angle)) * cellSize,
            (this.player.y + Math.sin(this.player.angle)) * cellSize
        );
        this.ctx.stroke();
        
        // Add portal effect in debug view if active
        if (this.showPortalPrompt) {
            const portalX = this.map.endPos.x * cellSize;
            const portalY = this.map.endPos.y * cellSize;
            
            // Draw portal glow effect
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
} 