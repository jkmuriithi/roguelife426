import { Color, Mesh, Vector3 } from 'three';

import Level from './Level';
import { COLORS, WALL_THICKNESS } from '../globals';
import Wall from '../rooms/Wall';
import TestLevelOneLights from '../lights/TestLevelOneLights';
import Room from '../rooms/Room';
import Player from '../characters/Player';
import PhysicsObject, { createModelFromGLTF } from '../objects';

// Use flying saucer since plane model is two halves for some reason
import MODEL from '@models/flyingsaucer.glb?url';

class TestLevelOne extends Level {
    initCameraPosition = new Vector3(-10, 10, 10);

    constructor() {
        super();

        // Set background to a nice color
        this.background = new Color(COLORS.BLACK);

        // Add meshes to scene
        this.player = new Player({
            size: [1, 2, 1],
            position: [10, 6, -5],
            color: COLORS.PLAYER,
        });
        const room = new Room({
            size: [30, 10, 20],
            position: [10, 0, -5],
            color: COLORS.WHITE,
        });

        // Add platform in the middle of the room
        const { size, position, opacityConfig, color } = room.options;
        const platform = new Wall({
            name: 'platform',
            size: [size[0] / 4, WALL_THICKNESS, size[2] / 4],
            position: [position[0], position[1] + size[1] / 4, position[2]],
            direction: [0, -1, 0],
            color,
            opacityConfig: {
                ...opacityConfig,
                detection: 'playerIntersection',
            },
        });

        this.add(this.player, room, platform, new TestLevelOneLights());
    }

    async load() {
        // Load models from files
        const gltfModel = await createModelFromGLTF(MODEL);
        const mesh = gltfModel.children[0] as Mesh;
        this.add(
            new PhysicsObject(mesh, {
                position: [10, 8, -5],
                scale: 0.01,
            })
        );

        await super.load();
    }
}

export default TestLevelOne;
