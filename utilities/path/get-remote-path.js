import path from 'path';
import {
    IPMA_EVAPOTRANSPIRATION_BASE_URL,
    IPMA_TEMPERATURE_MAX_BASE_URL,
    IPMA_TEMPERATURE_MIN_BASE_URL,
} from '../../constants/paths.ts';

export function getRemotePath(type, dico, municipality, district) {
    if (!type) {
        console.error('❌ Type is required to get the remote path.');
        process.exit(1);
    }

    console.log('🔗 Resolving remote path...');

    switch (type) {
        case 'evapotranspiration':
            return path.join(
                IPMA_EVAPOTRANSPIRATION_BASE_URL,
                `${district}/et0-${dico}-${municipality}.csv`
            );

        case 'temperature-max':
            return path.join(
                IPMA_TEMPERATURE_MAX_BASE_URL,
                `${district}/mtxmx-${dico}-${municipality}.csv`
            );

        case 'temperature-min':
            return path.join(
                IPMA_TEMPERATURE_MIN_BASE_URL,
                `${district}/mtnmn-${dico}-${municipality}.csv`
            );

        default:
            console.error(`❌ Unsupported type: ${type}`);
            process.exit(1);
    }
}
