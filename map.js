class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.entities = [];
        this.cellSize = 1;
        this.wallTextures = [];  // Store texture references for each wall
        this.floorTextures = [];  // Store floor textures for passages
        this.ceilingTextures = []; // Store ceiling textures for passages
        // Add properties to track start and end positions
        this.startPos = { x: 2, y: 2 };  // Center of starting room
        this.endPos = null;
        
        // Store current texture set
        this.currentTextureSet = null;
    }

    generate(textureSet = null) {
        // Store texture set
        this.currentTextureSet = textureSet;
        
        console.log('Generating map with texture set:', textureSet?.name);
        
        // Initialize arrays
        this.wallTextures = [];
        this.floorTextures = [];
        this.ceilingTextures = [];
        this.grid = [];
        
        // First, create the basic grid and wall textures
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            this.wallTextures[y] = [];
            this.floorTextures[y] = [];
            this.ceilingTextures[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0;  // Start with all walls
                
                // Initialize wall textures
                if (textureSet && textureSet.paths && textureSet.paths.length > 0) {
                    const randomIndex = Math.floor(Math.random() * textureSet.paths.length);
                    this.wallTextures[y][x] = textureSet.paths[randomIndex];
                } else {
                    this.wallTextures[y][x] = null;
                }
                
                // Initialize floor and ceiling textures to null
                this.floorTextures[y][x] = null;
                this.ceilingTextures[y][x] = null;
            }
        }

        // Create the maze structure
        this.createStartingRoom();
        this.carvePassage(3, 3);
        this.placeEndPoint();
        
        // Now assign floor and ceiling textures to passages
        this.assignFloorAndCeilingTextures();
        
        // Add entities after generation
        this.populateEntities();
    }

    createStartingRoom() {
        // Create a 3x3 clear room at the start
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 3; x++) {
                this.grid[y][x] = 1; // Clear space
            }
        }
        // Mark the center as start point (2)
        this.grid[this.startPos.y][this.startPos.x] = 2;
    }

    placeEndPoint() {
        // Find the furthest accessible point from start
        let maxDistance = 0;
        let furthestPoint = null;
        
        // Check each passage cell
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {  // If it's a passage
                    // Calculate Manhattan distance from start
                    const distance = Math.abs(x - this.startPos.x) + 
                                   Math.abs(y - this.startPos.y);
                    
                    // Update if this is the furthest point
                    if (distance > maxDistance && this.canCreateEndRoom(x, y)) {
                        maxDistance = distance;
                        furthestPoint = { x, y };
                    }
                }
            }
        }

        // Create end room and mark end point
        if (furthestPoint) {
            this.createEndRoom(furthestPoint.x, furthestPoint.y);
            this.endPos = furthestPoint;
            this.grid[furthestPoint.y][furthestPoint.x] = 3;
        }
    }

    canCreateEndRoom(x, y) {
        // Check if we can create a 3x3 room here
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                if (!this.isInBounds(newX, newY)) {
                    return false;
                }
            }
        }
        return true;
    }

    createEndRoom(x, y) {
        // Create a 3x3 clear room at the end
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                this.grid[y + dy][x + dx] = 1;
            }
        }
    }

    carvePassage(x, y) {
        const directions = [
            [0, -2], // North
            [2, 0],  // East
            [0, 2],  // South
            [-2, 0]  // West
        ];
        
        // Mark current cell as passage
        this.grid[y][x] = 1;
        
        // Randomize directions
        directions.sort(() => Math.random() - 0.5);
        
        // Try each direction
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            // Check if the new position is within bounds and unvisited
            if (this.isInBounds(newX, newY) && this.grid[newY][newX] === 0) {
                // Carve passage by marking cells between current and new position
                this.grid[y + dy/2][x + dx/2] = 1;
                this.grid[newY][newX] = 1;
                
                // Continue from new position
                this.carvePassage(newX, newY);
            }
        }
    }

    populateEntities() {
        // Add enemies
        for (let i = 0; i < 5; i++) {
            this.addRandomEntity('enemy');
        }
        
        // Add treasures
        for (let i = 0; i < 3; i++) {
            this.addRandomEntity('treasure');
        }
        
        // Add traps
        for (let i = 0; i < 4; i++) {
            this.addRandomEntity('trap');
        }
    }

    addRandomEntity(type) {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.width);
            y = Math.floor(Math.random() * this.height);
        } while (this.isWall(x, y) || this.getEntity(x, y));

        this.entities.push({
            type,
            x,
            y
        });
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Improved wall collision detection
    isWall(x, y) {
        // Check bounds
        if (!this.isInBounds(x, y)) return true;
        
        // Get cell coordinates
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        
        // Check if cell is a wall (only 0 is wall now)
        return this.grid[cellY][cellX] === 0;
    }

    // Add wall collision check with buffer
    checkCollision(x, y, radius = 0.15) {
        // Check more points around the player for better collision detection
        const points = [
            [x - radius, y - radius], // Top-left
            [x + radius, y - radius], // Top-right
            [x - radius, y + radius], // Bottom-left
            [x + radius, y + radius], // Bottom-right
            [x, y - radius],          // Top
            [x + radius, y],          // Right
            [x, y + radius],          // Bottom
            [x - radius, y]           // Left
        ];

        // Add a small buffer to prevent getting too close to walls
        const buffer = 0.1;
        return points.some(([px, py]) => {
            const bufferedX = px;
            const bufferedY = py;
            return this.isWall(bufferedX, bufferedY);
        });
    }

    getEntity(x, y) {
        return this.entities.find(e => e.x === x && e.y === y);
    }

    // Add helper method to get cell type
    getCellType(x, y) {
        if (!this.isInBounds(x, y)) return 0;
        return this.grid[Math.floor(y)][Math.floor(x)];
    }

    // Remove texture set switching since we're only using one set
    setTextureSet(newTextureSet) {
        console.warn('Texture set switching disabled - requires loading new textures');
    }

    assignFloorAndCeilingTextures() {
        if (!this.currentTextureSet) return;

        // Create sections of floor/ceiling pairs
        const sectionSize = 3; // Size of coherent texture sections
        
        for (let y = 0; y < this.height; y += sectionSize) {
            for (let x = 0; x < this.width; x += sectionSize) {
                // Only assign textures if there's at least one passage in this section
                let hasPassage = false;
                for (let dy = 0; dy < sectionSize && y + dy < this.height; dy++) {
                    for (let dx = 0; dx < sectionSize && x + dx < this.width; dx++) {
                        if (this.grid[y + dy][x + dx] !== 0) { // If it's not a wall
                            hasPassage = true;
                            break;
                        }
                    }
                    if (hasPassage) break;
                }

                if (hasPassage) {
                    // Select random floor and ceiling textures for this section
                    let floorTexture = null;
                    let ceilingTexture = null;

                    if (this.currentTextureSet.floors?.length > 0) {
                        floorTexture = this.currentTextureSet.floors[
                            Math.floor(Math.random() * this.currentTextureSet.floors.length)
                        ];
                    }

                    if (this.currentTextureSet.ceilings?.length > 0) {
                        ceilingTexture = this.currentTextureSet.ceilings[
                            Math.floor(Math.random() * this.currentTextureSet.ceilings.length)
                        ];
                    }

                    // Apply textures to all passages in this section
                    for (let dy = 0; dy < sectionSize && y + dy < this.height; dy++) {
                        for (let dx = 0; dx < sectionSize && x + dx < this.width; dx++) {
                            if (this.grid[y + dy][x + dx] !== 0) { // If it's not a wall
                                this.floorTextures[y + dy][x + dx] = floorTexture;
                                this.ceilingTextures[y + dy][x + dx] = ceilingTexture;
                            }
                        }
                    }
                }
            }
        }
    }

    getWallTexture(x, y) {
        if (this.isInBounds(x, y)) {
            const texture = this.wallTextures[Math.floor(y)][Math.floor(x)];
            if (!texture) {
                console.warn(`No texture found at position (${x}, ${y})`);
            }
            return texture;
        }
        console.warn(`Out of bounds texture request at (${x}, ${y})`);
        return null;
    }

    getFloorTexture(x, y) {
        if (!this.isInBounds(x, y)) return null;
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        // Only return floor texture if this is a passage (not a wall)
        return this.grid[cellY][cellX] !== 0 ? this.floorTextures[cellY][cellX] : null;
    }

    getCeilingTexture(x, y) {
        if (!this.isInBounds(x, y)) return null;
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        // Only return ceiling texture if this is a passage (not a wall)
        return this.grid[cellY][cellX] !== 0 ? this.ceilingTextures[cellY][cellX] : null;
    }
} 