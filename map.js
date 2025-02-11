class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.entities = [];
        this.cellSize = 1;
        // Add properties to track start and end positions
        this.startPos = { x: 2, y: 2 };  // Center of starting room
        this.endPos = null;
    }

    generate() {
        // Initialize grid with walls
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0; // 0 = wall
            }
        }

        // Create a clear starting room for the player
        this.createStartingRoom();
        
        // Create maze starting from the edge of the starting room
        this.carvePassage(3, 3);
        
        // Place end point before populating entities
        this.placeEndPoint();
        
        // Add entities after maze generation
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
} 