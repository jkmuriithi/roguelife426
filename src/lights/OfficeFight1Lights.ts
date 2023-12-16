import { Group, HemisphereLight, SpotLight } from 'three';

import { COLORS, SHADOW_MAP_SIZE } from '../globals';

class OfficeFight1Lights extends Group {
    shadowMapSize = SHADOW_MAP_SIZE;

    constructor() {
        // Invoke parent Group() constructor
        super();

        const spotPositions = [
            [30.5, 8.5],
            [30.5, -26.5],
            [-4.5, 8.5],
            [-4.5, -26.5],
        ];

        for (const pos of spotPositions) {
            const spot = new SpotLight(COLORS.WHITE, 300, 0, 1.1, 0.9, 2);
            spot.position.set(pos[0], 18, pos[1]);
            spot.target.position.set(pos[0], -2, pos[1]);
            spot.castShadow = true;
            spot.shadow.mapSize.width = this.shadowMapSize;
            spot.shadow.mapSize.height = this.shadowMapSize;
            this.add(spot, spot.target);
        }

        const hemi = new HemisphereLight(COLORS.WHITE, COLORS.WHITE, 0.55);
        hemi.position.set(13, 18, -9);
        this.add(hemi);
    }
}

export default OfficeFight1Lights;