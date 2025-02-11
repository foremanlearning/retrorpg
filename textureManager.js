class TextureManager {
    constructor() {
        this.textureCache = new Map();
        this.loadingTextures = new Map();
        this.textureGroups = [];
        this.currentTextureSet = null;
        
        // Load and parse texture groups from json
        this.initTextureGroups();
    }

    async initTextureGroups() {
        try {
            const response = await fetch('textures/textures.json');
            const data = await response.json();
            
            // Extract just the group names
            this.textureGroups = data.textures.map(group => group.name);
            
            // Select random texture set
            this.selectRandomTextureSet();
            
            console.log(`Available texture sets: ${this.textureGroups.join(', ')}`);
            console.log(`Selected texture set: ${this.currentTextureSet}`);
        } catch (error) {
            console.error('Failed to load texture groups:', error);
        }
    }

    selectRandomTextureSet() {
        if (this.textureGroups.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.textureGroups.length);
            this.currentTextureSet = this.textureGroups[randomIndex];
        }
    }

    getCurrentTextureSet() {
        return this.currentTextureSet;
    }

    async loadTexture(path) {
        // If already cached, return it
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }

        // If currently loading, wait for it
        if (this.loadingTextures.has(path)) {
            return this.loadingTextures.get(path);
        }

        // Start new load
        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.textureCache.set(path, img);
                this.loadingTextures.delete(path);
                resolve(img);
            };

            img.onerror = () => {
                this.loadingTextures.delete(path);
                reject(new Error(`Failed to load texture: ${path}`));
            };

            // Clean path and load
            const cleanPath = path.replace(/\\/g, '/');
            img.src = cleanPath;
        });

        // Store the loading promise
        this.loadingTextures.set(path, loadPromise);
        return loadPromise;
    }

    // Test function to validate paths
    async validatePaths(paths) {
        for (const path of paths) {
            try {
                console.log(`Testing path: ${path}`);
                const texture = await this.loadTexture(path);
                console.log(`Successfully loaded: ${path}`);
            } catch (error) {
                console.error(`Failed to load: ${path}`, error);
            }
        }
    }
}

// Test code (can be removed later)
const testManager = new TextureManager();
testManager.validatePaths(testPaths); 