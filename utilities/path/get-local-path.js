import path from 'path';
import fs from 'fs';
import { OUTPUTS_DIR } from '../../constants/paths.ts';

export function getLocalPath(type, municipality, district) {
    if (!type) {
        console.error('❌ Type is required to get the local path.');
        process.exit(1);
    }

    console.log('🔗 Resolving local path...');

    const typeDir = path.join(OUTPUTS_DIR, type, district);
    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }

    const localPath = path.join(typeDir, `${municipality}.csv`);
    if (!fs.existsSync(localPath)) {
        fs.writeFileSync(localPath, '');
        console.log(`🌱 Created new file at ${localPath}`);
    }

    return localPath;
}
