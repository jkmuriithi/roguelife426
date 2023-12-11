/**
 * @file Defines global game variables and types.
 *
 * Circular imports can interfere with Vite's build process, so it's best to put
 * any state shared between modules in this file. **NOTE**: For the same reason,
 * try to avoid importing from any game source file into this file. Use "import
 * type" if you need to reference a type.
 */
import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import {
    Vec3,
    World,
    Material as CannonMaterial,
    ContactEquation,
} from 'cannon-es';

import type { ProjectileInfo } from './projectiles/Projectile';

// Game
export let PROJECTILE_QUEUE: ProjectileInfo[] = [];
export const STARTING_LEVEL = 0;
export const WALL_THICKNESS = 0.1;
export const FLOAT_EPS = 1e-8;

// Colors
export const COLORS = {
    WHITE: 0xffffff,
    BLACK: 0x000000,
    GRAY: 0x080808,
    RED: 0xff0000,
    PLAYER: 0xe8beac,
    BARBIE: 0xffc0cb,
};

// Debug feature flags
export const HOTKEYS_ENABLED = true;
export const ORBIT_CONTROLS_ENABLED = true;
export const ICE_SKATER_MODE = false;
export const PRINT_MODELS_ON_LOAD = true;

// ThreeJS
export const UP_AXIS = new Vector3(0, 1, 0);
export const CAMERA = new PerspectiveCamera();
export const INIT_CAMERA_POSITION = new Vector3(-10, 10, 10);
export const RENDERER = new WebGLRenderer({ antialias: true });
export const SHADOW_MAP_SIZE = 512;

// Cannon-ES
export const UP_AXIS_CANNON = new Vec3().copy(UP_AXIS as unknown as Vec3);
export const WORLD = new World({ gravity: new Vec3(0, -9.81, 0) });

export const WALL_PHYSICS_MATERIAL = new CannonMaterial();
export const CHARACTER_PHYSICS_MATERIAL = new CannonMaterial();

export type CollideEvent = {
    /** Body that was collided with. */
    body: Body;
    contact: ContactEquation;
};
