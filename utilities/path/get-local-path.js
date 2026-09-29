import path from 'path';
import fs from 'fs';
import { OUTPUTS_DIR } from '../../constants/paths.ts';

export function getLocalPath(type, municipality, district) {
    if (!type) {
        console.error('❌ Type is required to get the local path.');
        process.exit(1);
    }

    console.log('🔗 Resolving local path...');

    const localDir = path.join(OUTPUTS_DIR, type, district);
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }

    const localPath = path.join(localDir, `${municipality}.csv`);
    if (!fs.existsSync(localPath)) {
        const headers = 'date,minimum,maximum,range,mean,std';
        fs.writeFileSync(localPath, headers);
        console.log(`🌱 Created new file at ${localPath}`);
    }

    return localPath;
}
