/**
 * @file Defines global game variables and types.
 *
 * Circular imports can interfere with Vite's build process, so it's best to put
 * any state shared between modules in this file. **NOTE**: For the same reason,
 * try to avoid importing from any game source file into this file. Use "import
 * type" if you need to reference a type.
 */
import {
    Body,
    Vec3,
    World,
    Material as CannonMaterial,
    ContactEquation,
} from 'cannon-es';
import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/Addons.js';

// Game
export const PROJECTILE_LIMIT = 20;
export const UP_AXIS = [0, 1, 0] as const;
export const STARTING_LEVEL = 0;
export const WALL_THICKNESS = 0.4;
export const FLOAT_EPS = 1e-6;

export const COLORS = {
    WHITE: 0xffffff,
    BLUEISH_WHITE: 0xeb3fff,
    BLACK: 0x000000,
    GRAY: 0x999999,
    RED: 0xff0000,
    PLAYER: 0xe8beac,
    BARBIE: 0xffc0cb,
    GOLD: 0xffd700,
    HEALTH_BAR: 'green',
    PLAYER_HEALTH_BAR: 'blue',
};

export const DEBUG_FLAGS = {
    HOTKEYS_ENABLED: true,
    ORBIT_CONTROLS_ENABLED: false,
    ICE_SKATER_MODE: false, // Frictionless movement and high acceleration
    PRINT_ASSETS_ON_LOAD: false,
    DRAW_CHARACTER_DIRECTION_LINE: false,
    SHOW_GRIDS: false,
    HIDE_INTRO: false,
    GODMODE: false, // Invincibility
    FLIGHT_MODE: false, // Infinite double jumps
};

// ThreeJS
export const UP_AXIS_THREE = new Vector3(...UP_AXIS);
export const SHADOW_MAP_SIZE = 512;
export const RENDER_ORDER_FIRST = -100;
export const RENDER_ORDER_LAST = 100;

export const CAMERA = new PerspectiveCamera();
export const INIT_CAMERA_POSITION = new Vector3(-10, 10, 10);
export const RENDERER = new WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
});
export const RENDERER_2D = new CSS2DRenderer();

// Cannon-ES
export const UP_AXIS_CANNON = new Vec3(...UP_AXIS);

export const WORLD = new World({ gravity: new Vec3(0, -9.81, 0) });
export const WALL_PHYSICS_MATERIAL = new CannonMaterial();
export const CHARACTER_PHYSICS_MATERIAL = new CannonMaterial();

export type CollideEvent = {
    /** Body that was collided with. */
    body: Body;
    contact: ContactEquation;
};
