import { Vec3 } from 'cannon-es';
import { Vector3 } from 'three';

import Character, { CharacterOptions } from './Character';
import {
    CollideEvent,
    FLOAT_EPS,
    UP_AXIS_THREE,
    UP_AXIS_CANNON,
    DEBUG_FLAGS,
    COLORS,
} from '../globals';

// JS keycode reference: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
const forwardsKeys = new Set(['KeyW', 'ArrowUp']);
const backwardsKeys = new Set(['KeyS', 'ArrowDown']);
const leftKeys = new Set(['KeyA', 'ArrowLeft']);
const rightKeys = new Set(['KeyD', 'ArrowRight']);

const fireKeys = new Set(['Enter', 'NumpadEnter']);
const jumpKeys = new Set(['Space']);

/**
 * A user-controlled Character. Code adapted from the cannon-es pointer lock
 * controls example.
 * @see {@link https://github.com/pmndrs/cannon-es/blob/master/examples/js/PointerLockControlsCannon.js}
 */
class Player extends Character {
    static readonly defaultOptions: CharacterOptions = {
        ...Character.defaultOptions,
        name: 'player',
        healthBarColor: COLORS.PLAYER_HEALTH_BAR,
    };

    private contactNormal = new Vec3();
    private moveForwards = false;
    private moveBackwards = false;
    private moveLeft = false;
    private moveRight = false;

    private forwards: Vector3;
    private backwards: Vector3;
    private left: Vector3;
    private right: Vector3;

    maxJumps = 2;
    controlsDisabled = false;
    jumpsLeft = 0;
    jumpVelocity = 5;
    moveVelocity = 12;
    inputDirection = new Vector3();

    constructor(options: Partial<CharacterOptions>) {
        super({ ...Player.defaultOptions, ...options });

        this.forwards = this.front.clone();
        this.backwards = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, Math.PI);
        this.left = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, Math.PI / 2);
        this.right = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, -Math.PI / 2);

        this.connectEventListeners();
    }

    // Re-enable jumping after collision with some object underneath
    private onCollide = (e: CollideEvent): void => {
        const { contact } = e;

        this.contactNormal.setZero();
        if (contact.bi.id === this.body.id) {
            contact.ni.negate(this.contactNormal);
        } else {
            this.contactNormal.copy(contact.ni);
        }

        // If collision normal faces somewhat upwards...
        if (this.contactNormal.dot(UP_AXIS_CANNON) > 0.5) {
            this.jumpsLeft = this.maxJumps;
        }
    };

    // Must be a closure so that "this" is handled properly
    private onKeyDown = (event: KeyboardEvent): void => {
        if (event.repeat) return;
        const { code } = event;

        this.moveForwards = this.moveForwards || forwardsKeys.has(code);
        this.moveBackwards = this.moveBackwards || backwardsKeys.has(code);
        this.moveLeft = this.moveLeft || leftKeys.has(code);
        this.moveRight = this.moveRight || rightKeys.has(code);

        if (fireKeys.has(code)) {
            this.fireProjectile();
        }
        if (
            (DEBUG_FLAGS.FLIGHT_MODE || this.jumpsLeft > 0) &&
            jumpKeys.has(code)
        ) {
            this.body.velocity.y += this.jumpVelocity;
            --this.jumpsLeft;
        }
    };

    private onKeyUp = (event: KeyboardEvent): void => {
        const { code } = event;

        this.moveForwards = this.moveForwards && !forwardsKeys.has(code);
        this.moveBackwards = this.moveBackwards && !backwardsKeys.has(code);
        this.moveLeft = this.moveLeft && !leftKeys.has(code);
        this.moveRight = this.moveRight && !rightKeys.has(code);
    };

    connectEventListeners(): void {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.body.addEventListener('collide', this.onCollide);
    }

    disconnectEventListeners(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        this.body.removeEventListener('collide', this.onCollide);
    }

    /**
     * Set the direction that the player moves when going forwards. Other
     * controls directions are set accordingly. The given direction vector
     * should be normalized.
     */
    setForwardsDirection(direction: Vector3) {
        this.forwards = direction.clone();
        this.backwards = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, Math.PI);
        this.left = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, Math.PI / 2);
        this.right = this.forwards
            .clone()
            .applyAxisAngle(UP_AXIS_THREE, -Math.PI / 2);
    }

    update(dt: number): void {
        if (this.controlsDisabled) {
            super.update(dt);
            return;
        }

        this.inputDirection.set(0, 0, 0);
        if (this.moveForwards) {
            this.inputDirection.add(this.forwards);
        }
        if (this.moveBackwards) {
            this.inputDirection.add(this.backwards);
        }
        if (this.moveLeft) {
            this.inputDirection.add(this.left);
        }
        if (this.moveRight) {
            this.inputDirection.add(this.right);
        }

        // Make player turn towards input direction
        this.inputDirection.normalize();
        if (this.inputDirection.length() > FLOAT_EPS) {
            this.turnToFace(this.inputDirection);
            // Remove all character spin
            this.body.angularVelocity.setZero();
        }

        this.inputDirection.multiplyScalar(this.moveVelocity);
        if (DEBUG_FLAGS.ICE_SKATER_MODE) {
            this.body.velocity.x += this.inputDirection.x / 20;
            this.body.velocity.z += this.inputDirection.z / 20;
        } else {
            this.body.velocity.x = this.inputDirection.x;
            this.body.velocity.z = this.inputDirection.z;
        }

        super.update(dt);
    }

    dispose() {
        this.disconnectEventListeners();
        super.dispose();
    }
}

export default Player;
