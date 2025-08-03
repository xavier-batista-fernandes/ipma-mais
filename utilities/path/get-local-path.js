import path from 'path';
import { OUTPUTS_DIR } from '../../constants/paths.ts';

export function getLocalPath(type, municipality, district) {
    if (!type) {
        console.error('❌ Type is required to get the local path.');
        process.exit(1);
    }

    console.log('🔗 Resolving local path...');

    switch (type) {
        case 'evapotranspiration':
            return path.join(OUTPUTS_DIR, 'evapotranspiration', district, `${municipality}.csv`);

        case 'temperature-max':
            return path.join(OUTPUTS_DIR, 'temperature-max', district, `${municipality}.csv`);

        case 'temperature-min':
            return path.join(OUTPUTS_DIR, 'temperature-min', district, `${municipality}.csv`);

        default:
            console.error(`❌ Unsupported type: ${type}`);
            process.exit(1);
    }
}
