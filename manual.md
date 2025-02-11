# Doom-style Maze RPG Manual

## Overview
This is a retro-style first-person maze RPG built using JavaScript and HTML5 Canvas. The game features raycasting technology similar to classic games like Wolfenstein 3D and the original Doom.

## Controls
- `W` - Move forward
- `S` - Move backward
- `A` - Strafe left
- `D` - Strafe right
- `←` - Turn left
- `→` - Turn right

## Technical Architecture

### Core Components

#### 1. Game Engine (game.js)
The main game loop coordinator that:
- Manages the game state
- Updates player position
- Handles rendering cycles
- Controls game timing
- Processes input

#### 2. Raycast Engine (raycastEngine.js)
The rendering engine that:
- Casts rays from the player's position
- Calculates wall distances
- Handles perspective correction
- Renders the 3D view
- Manages texture mapping

#### 3. Map System (map.js)
Handles the game world structure:
- Defines the maze layout using a 2D array
- Manages wall collisions
- Provides map data to the raycast engine
- Controls map boundaries

#### 4. Player System (player.js)
Manages player attributes:
- Position (x, y)
- Direction (angle)
- Movement speed
- Rotation speed
- Collision detection

#### 5. Inventory System (inventory.js)
Handles item management:
- Item storage
- Equipment management
- Item interactions

#### 6. Sprite Generator (spriteGenerator.js)
Creates and manages game sprites:
- Generates textures
- Handles sprite animations
- Manages sprite rendering

## Technical Details

### Raycasting Algorithm
The game uses a raycasting technique to create a 3D perspective:
1. For each vertical screen slice:
   - Cast a ray from player position
   - Calculate distance to nearest wall
   - Apply perspective correction
   - Determine wall height
   - Apply texture mapping

### Collision Detection
Collision detection is handled through:
- Grid-based collision checking
- Player boundary testing
- Wall collision response

### Performance Optimizations
The game implements several optimizations:
- Distance-based rendering
- View frustum culling
- Efficient texture mapping
- Frame timing control

## Game World

### Map Structure
The game world is defined in map.js using a large 2D array where:
- `0` represents empty space/corridors
- `1` represents walls
- Additional numbers could represent different wall types or special tiles

The map is designed to be large-scale (50x50 or larger) to create an immersive dungeon-crawling experience. This larger size:
- Provides space for complex maze layouts
- Allows for meaningful exploration
- Creates opportunities for varied room designs
- Supports proper distance-based rendering effects
- Gives the raycasting engine room to show off perspective effects

The large map size is also why the game implements optimization techniques like:
- View frustum culling (only rendering what's in front of the player)
- Distance-based rendering (far walls are rendered with less detail)
- Efficient collision detection using grid-based checks

When designing new maps, it's recommended to:
- Keep a border of walls around the entire map
- Create corridors at least 2-3 units wide for comfortable navigation
- Use larger open areas occasionally to break up the maze-like structure
- Consider the player's starting position carefully

### Rendering Pipeline
1. Clear canvas
2. Cast rays and render walls
3. Draw sprites and entities
4. Apply lighting effects
5. Render UI elements

## Development

### Adding New Features
To extend the game:
1. Create new component files
2. Add script references in index.html
3. Initialize components in game.js
4. Implement feature logic
5. Add necessary assets

### Debug Mode
The game includes basic debugging features:
- FPS counter
- Position display
- Ray visualization (when enabled)

## Performance Considerations
- Runs best in modern browsers
- Optimized for 60 FPS
- Responsive to different screen sizes
- Efficient memory management

## Future Enhancements
Potential areas for expansion:
- Enhanced lighting system
- More complex map structures
- Additional game mechanics
- Improved texture handling
- Mobile device support

## Troubleshooting
Common issues and solutions:
- Black screen: Check browser console for errors
- Low FPS: Reduce resolution or simplify textures
- Input lag: Verify event listener setup
- Rendering artifacts: Clear canvas properly

## Credits
Built using:
- HTML5 Canvas
- Vanilla JavaScript
- Custom raycasting engine
- Original sprite generation system 