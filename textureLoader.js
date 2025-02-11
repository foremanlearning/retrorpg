class TextureLoader {
    constructor() {
        this.loadedTextures = {};
    }

    async loadTexture(path) {
        path = path.replace(/^\//, '').replace(/\\/g, '/');
        
        if (this.loadedTextures[path]) {
            return this.loadedTextures[path];
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const texture = {
                    width: img.width,
                    height: img.height,
                    data: imageData.data
                };

                this.loadedTextures[path] = texture;
                resolve(texture);
            };

            img.onerror = () => {
                reject(new Error(`Failed to load texture: ${path}`));
            };

            img.src = path;
        });
    }

    getPixel(texture, x, y) {
        if (!texture || !texture.data) {
            return { r: 128, g: 128, b: 128, a: 255 };
        }

        // Get pixel coordinates
        x = Math.floor(x * texture.width) % texture.width;
        y = Math.floor(y * texture.height) % texture.height;
        
        // Calculate data index
        const index = (y * texture.width + x) * 4;

        // Return color values
        return {
            r: texture.data[index],
            g: texture.data[index + 1],
            b: texture.data[index + 2],
            a: texture.data[index + 3]
        };
    }
} 