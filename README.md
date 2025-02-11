# Doom-style Maze RPG

A retro-inspired first-person maze game built with JavaScript and HTML5 Canvas, featuring procedurally generated mazes and raycasting technology similar to classic games like Wolfenstein 3D and Doom.

## Features

- Procedurally generated mazes
- Classic raycasting engine for 3D rendering
- Multiple texture sets (ancient brick, castle stone, crypt wall, etc.)
- Portal system for maze-to-maze progression
- Debug minimap for development and testing
- Collision detection and smooth movement

## Controls

- `W` - Move forward
- `S` - Move backward
- `A` - Strafe left
- `D` - Strafe right
- `←` - Turn left
- `→` - Turn right
- `E` - Activate portal (when near end point)

## Development Features

- Click on minimap to teleport (development mode)
- Visual debugging with minimap overlay
- FPS counter and position display
- Portal proximity detection
- Customizable maze generation parameters

## Technical Details

### Core Components

- `game.js` - Main game loop and state management
- `map.js` - Procedural maze generation and collision detection
- `raycastEngine.js` - 3D rendering and raycasting calculations
- `player.js` - Player movement and interaction
- `spriteGenerator.js` - Texture and sprite management
- `inventory.js` - Item management system

### Texture System

The game includes multiple texture sets for walls:
- Ancient brick
- Castle stone
- Crypt wall
- Dungeon brick
- Metal
- Mossy stone
- Rough stone
- Sci-fi
- Tiles
- Weathered stone

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Use WASD/Arrow keys to navigate
4. Find the red portal tile and press E to progress

## Development

To run in development mode:
1. Open in a web browser with JavaScript console enabled
2. Use the minimap in top-left corner for debugging
3. Click on minimap to teleport player
4. Watch console for debug information

## Performance

The game is optimized for modern browsers with:
- Efficient raycasting calculations
- Texture caching
- Distance-based rendering
- View frustum culling

## Browser Support

Tested and supported in:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

See LICENSE.txt

## Credits

- Raycasting engine inspired by classic FPS games
- Textures procedurally generated
- Built with vanilla JavaScript and HTML5 Canvas
- Written by Daniel Foreman
www.tiktok.com/@ckenthusiast