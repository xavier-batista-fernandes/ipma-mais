import path from 'path';
import fs from 'fs';
import { stringify } from 'csv-stringify';
import { OUTPUTS_DIR } from '../constants/paths.ts';

export { writeDailyRecord };

function writeDailyRecord(municipality, entry) {
    console.log('💿 Saving daily evapotranspiration measurements...');

    const relativePath = `evapotranspiration/${municipality.district}/${municipality.municipality}.csv`;
    const outputPath = path.join(OUTPUTS_DIR, relativePath);
    const outputDir = path.dirname(outputPath);
    const headers = 'date,minimum,maximum,range,mean,std\n';

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(outputPath)) {
        fs.writeFileSync(outputPath, headers);
    }

    stringify([entry], (error, output) => {
        if (error) throw error;

        fs.appendFileSync(outputPath, output);
    });
}
