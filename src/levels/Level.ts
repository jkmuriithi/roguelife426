import { BODY_TYPES, Body, Vec3 } from 'cannon-es';
import { Scene, Object3D, Object3DEventMap, Vector3, Box3, Ray } from 'three';

import {
    CAMERA,
    INIT_CAMERA_POSITION,
    WORLD,
    PROJECTILE_LIMIT,
    CollideEvent,
    UP_AXIS_CANNON,
    RENDER_ORDER_LAST,
    RENDER_ORDER_FIRST,
    DEBUG_FLAGS,
    UP_AXIS_THREE,
} from '../globals';
import {
    dfsFind,
    dfsTraverse,
    materialsOf,
    DynamicOpacityConfig,
} from '../helpers';

import PhysicsObject from '../PhysicsObject';
import Wall from '../rooms/Wall';

import type Character from '../characters/Character';
import type Enemy from '../characters/Enemy';
import Player from '../characters/Player';

type LevelChild = Object3D<Object3DEventMap> & {
    update?: (dt: number) => void;
    dispose?: () => void;
    reset?: () => void;
    body?: Body;
};

class Level extends Scene {
    // Change the type of the superclass Object3D.children property
    declare children: LevelChild[];

    private directionalDynamicObjects: PhysicsObject[] = [];
    private intersectionDynamicObjects: PhysicsObject[] = [];
    private prevTransparent: Set<PhysicsObject> = new Set();
    private bodyToEnemy: Map<number, Enemy> = new Map();
    private createdProjectiles: PhysicsObject[] = [];
    private activeProjectiles: Set<PhysicsObject> = new Set();
    private lastContactTime: number = 0;
    private contactImmunitySecs: number = 0.5;
    private enemyKnockback = 10;
    private playerKnockback = 5;

    initCameraPosition = INIT_CAMERA_POSITION;
    state: 'incomplete' | 'complete' | 'playerDead' | 'touchedPortal' =
        'incomplete';
    player?: Player;
    enemies: Enemy[] = [];
    killedEnemies: Enemy[] = [];
    portal?: PhysicsObject;

    constructor() {
        super();
        this.layers.enableAll();
    }

    /**
     * Subclasses should override this method to add objects to the level,
     * and then call "await super.load()".
     */
    async load() {
        // Adjust camera and player
        CAMERA.position.copy(this.initCameraPosition);
        if (this.player) {
            CAMERA.lookAt(this.player.position);
            const dir = this.player.position
                .clone()
                .sub(CAMERA.position)
                .setComponent(1, 0)
                .normalize();
            this.player.setForwardsDirection(dir);
        }

        // Add physics objects to sim
        dfsTraverse(this, (child: Object3D | PhysicsObject | Enemy) => {
            if (child instanceof PhysicsObject) {
                WORLD.addBody(child.body);
            }
        });

        this.directionalDynamicObjects = dfsFind(this, (c) =>
            Boolean(
                c instanceof PhysicsObject &&
                    c.options.opacityConfig &&
                    c.options.opacityConfig.directional
            )
        ) as PhysicsObject[];
        this.intersectionDynamicObjects = dfsFind(this, (c) =>
            Boolean(
                c instanceof PhysicsObject &&
                    c.options.opacityConfig &&
                    c.options.opacityConfig.characterIntersection
            )
        ) as PhysicsObject[];

        // Process characters and portals
        for (const enemy of this.enemies) {
            this.bodyToEnemy.set(enemy.body.id, enemy);
        }

        // Setup event handlers for enemy and portal collisions
        if (this.player) {
            this.portal?.body.addEventListener('collide', (e: CollideEvent) => {
                if (!this.player) return;
                if (e.body.id === this.player.body.id) {
                    if (this.enemies.length === 0) this.state = 'complete';
                    else this.state = 'touchedPortal';
                }
            });

            this.player.body.addEventListener('collide', (e: CollideEvent) => {
                if (!this.player) return;

                const enemy = this.bodyToEnemy.get(e.body.id);
                if (enemy) {
                    if (
                        WORLD.time - this.lastContactTime >
                        this.contactImmunitySecs
                    ) {
                        this.lastContactTime = WORLD.time;
                        if (!DEBUG_FLAGS.GODMODE) {
                            this.player.takeDamage(enemy.contactDamage);
                        }
                    }

                    const dir = this.player.body.position
                        .clone()
                        .vadd(UP_AXIS_CANNON)
                        .vsub(enemy.body.position);
                    dir.normalize();

                    enemy.body.applyImpulse(
                        dir.clone().scale(-this.enemyKnockback)
                    );
                    this.player.body.applyImpulse(
                        dir.clone().scale(this.playerKnockback)
                    );
                }
            });
        }
    }

    dispose() {
        dfsTraverse(this, (child) => {
            const c = child as LevelChild;
            if (c.dispose) c.dispose();
        });
    }

    reset() {
        // reset projectiles
        this.activeProjectiles.clear();
        while (this.createdProjectiles.length > 0) {
            const proj = this.createdProjectiles.pop() as PhysicsObject;
            this.remove(proj);
            proj.dispose();
        }

        // restore enemies
        while (this.killedEnemies.length > 0) {
            const enemy = this.killedEnemies.pop() as Enemy;
            this.enemies.push(enemy);
            this.add(enemy);
            WORLD.addBody(enemy.body);
        }

        // reset all objects
        dfsTraverse(this, (child: Object3D | PhysicsObject | Character) => {
            if (child instanceof PhysicsObject) {
                child.reset();
            }
        });
    }

    update(dt: number): void {
        if (this.state === 'playerDead') return;

        for (const child of this.children) {
            if (child.update) child.update(dt);
        }

        if (this.player) {
            if (this.player.health <= 0) {
                this.state = 'playerDead';
                return;
            }
            const killedEnemies = [];

            for (const enemy of this.enemies) {
                if (enemy.health <= 0) {
                    this.remove(enemy);
                    WORLD.removeBody(enemy.body);
                    killedEnemies.push(enemy);
                } else {
                    enemy.setPlayerPosition(this.player.position);
                }
            }
            for (const enemy of killedEnemies) {
                const i = this.enemies.indexOf(enemy);
                this.enemies.splice(i, 1);
                this.killedEnemies.push(enemy);
            }
        }

        if (!DEBUG_FLAGS.ORBIT_CONTROLS_ENABLED) {
            this.moveCameraWithPlayer();
        }

        // Handle more expensvive calculations asynchronously
        this.handleMaterialTransparency();
        this.handleProjectiles();
    }

    private moveCameraWithPlayer() {
        if (!this.player) return;

        const cameraDisplacement = new Vector3().subVectors(
            this.player.position,
            this.player.initPosition
        );
        // cameraDisplacement.y = 0;

        CAMERA.position.addVectors(this.initCameraPosition, cameraDisplacement);
        CAMERA.lookAt(this.player.position);
    }

    /** Make objects between the camera and the player transparent */
    private async handleMaterialTransparency() {
        if (!this.player && this.enemies.length == 0) return;

        const currTransparent = new Set<PhysicsObject>();

        // Method 1: Checking normal direction (if the camera position can move)
        const thresh = Math.cos(70 * (Math.PI / 180));
        const cameraDir = this.player!.position.clone()
            .setComponent(1, 0)
            .sub(CAMERA.position);
        for (const obj of this.directionalDynamicObjects) {
            const { normal, lowOpacity } = obj.options
                .opacityConfig as DynamicOpacityConfig;
            if (cameraDir.dot(normal) > thresh) {
                currTransparent.add(obj);
                materialsOf(obj).forEach((material) => {
                    material.opacity = lowOpacity;
                });
            }
        }

        // Method 2: Checking intersection with characters
        const dynamicObjects = new Map<Box3, PhysicsObject>();
        this.intersectionDynamicObjects.forEach((obj) =>
            dynamicObjects.set(
                new Box3().setFromObject(obj),
                obj as PhysicsObject
            )
        );

        const characters = [this.player, ...this.enemies] as Character[];
        for (const char of characters) {
            const cameraDir = char.position.clone().sub(CAMERA.position);
            const charDist = cameraDir.lengthSq();
            cameraDir.normalize();

            const ray = new Ray(CAMERA.position, cameraDir);
            for (const [box, obj] of dynamicObjects) {
                if (currTransparent.has(obj)) continue;

                const inter = ray.intersectBox(box, new Vector3());
                if (inter && inter.sub(CAMERA.position).lengthSq() < charDist) {
                    currTransparent.add(obj);

                    const lowOpacity = obj.options.opacityConfig!.lowOpacity;
                    materialsOf(obj).forEach((material) => {
                        material.opacity = lowOpacity;
                    });
                }
            }
        }

        for (const obj of currTransparent) {
            if (obj instanceof Wall && obj.renderOrder === RENDER_ORDER_FIRST) {
                obj.renderOrder = RENDER_ORDER_LAST;
            }
        }

        for (const obj of this.prevTransparent) {
            if (!currTransparent.has(obj)) {
                const highOpacity = obj.options.opacityConfig!.highOpacity;
                materialsOf(obj).forEach((material) => {
                    material.opacity = highOpacity;
                });

                if (
                    obj instanceof Wall &&
                    obj.renderOrder === RENDER_ORDER_LAST
                ) {
                    obj.renderOrder = RENDER_ORDER_FIRST;
                }
            }
        }

        this.prevTransparent = currTransparent;
    }

    private async handleProjectiles() {
        const characters: Character[] = [...this.enemies];
        if (this.player) characters.push(this.player);

        for (const sender of characters) {
            if (!sender.firedProjectile) continue;
            sender.firedProjectile = false; // reset flag

            const { projectileConfig: config } = sender.options;
            // direction relative to sender (location to spawn projectile)
            const dir = sender.front
                .clone()
                .applyQuaternion(sender.quaternion)
                .normalize();

            const distance =
                config.distanceFromSender || sender.options.size[0] * 1.2;
            // rotate projectile to face away from sender
            const configObj = config.object
                .clone()
                .rotateOnAxis(
                    UP_AXIS_THREE,
                    Math.atan2(dir.x, dir.z) + Math.PI / 2
                );
            const proj = new PhysicsObject(configObj, {
                ...config.options,
                position: sender.position
                    .clone()
                    .add(dir.clone().setLength(distance))
                    .toArray(),
                direction: new Vector3(-1, 0, 0).toArray(),
            });

            this.add(proj);
            WORLD.addBody(proj.body);
            this.activeProjectiles.add(proj);
            this.createdProjectiles.push(proj);

            proj.body.addEventListener('collide', (e: CollideEvent) => {
                if (!this.player) return;
                if (!this.activeProjectiles.has(proj)) return;
                if (e.body.id === sender.body.id) return;

                if (e.body.type === BODY_TYPES.STATIC) {
                    this.activeProjectiles.delete(proj);
                } else if (
                    e.body.id === this.player.body.id &&
                    this.bodyToEnemy.has(sender.body.id)
                ) {
                    if (!DEBUG_FLAGS.GODMODE) {
                        this.player.takeDamage(config.damage);
                    }
                    this.activeProjectiles.delete(proj);
                } else if (sender.body.id === this.player.body.id) {
                    const enemy = this.bodyToEnemy.get(e.body.id);
                    if (enemy) {
                        enemy.takeDamage(config.damage);
                        this.activeProjectiles.delete(proj);
                    }
                }
            });

            const impulse = new Vec3().copy(
                dir.multiplyScalar(config.speed) as unknown as Vec3
            );
            proj.body.applyImpulse(impulse);
        }

        // Remove projectiles over limit
        this.createdProjectiles.reverse();
        while (this.createdProjectiles.length > PROJECTILE_LIMIT) {
            const proj = this.createdProjectiles.pop() as PhysicsObject;
            this.remove(proj);
            proj.dispose();
        }
        this.createdProjectiles.reverse();
    }
}

export default Level;
