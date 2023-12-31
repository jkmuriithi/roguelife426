import { FLOAT_EPS, DEBUG_FLAGS } from '../globals';
import Enemy, { EnemyOptions } from './Enemy';

class MeleeEnemy extends Enemy {
    static readonly defaultOptions: EnemyOptions = {
        ...Enemy.defaultOptions,
        name: 'melee-enemy',
    };

    constructor(options: Partial<EnemyOptions>) {
        super({ ...MeleeEnemy.defaultOptions, ...options });
    }

    update(dt: number): void {
        if (!this.playerPos) {
            super.update(dt);
            return;
        }

        const movementDirection = this.playerPos.clone().sub(this.position);
        // Make enemy turn toward player
        movementDirection.y = 0;

        if (movementDirection.length() > 2) {
            movementDirection.normalize();
            if (movementDirection.length() > FLOAT_EPS) {
                this.turnToFace(movementDirection);
                // Remove all character spin
                this.body.angularVelocity.setZero();
            }

            movementDirection.multiplyScalar(this.moveVelocity);
            if (DEBUG_FLAGS.ICE_SKATER_MODE) {
                this.body.velocity.x += movementDirection.x / 20;
                this.body.velocity.z += movementDirection.z / 20;
            } else {
                this.body.velocity.x = movementDirection.x;
                this.body.velocity.z = movementDirection.z;
            }
        }
        super.update(dt);
    }
}

export default MeleeEnemy;
