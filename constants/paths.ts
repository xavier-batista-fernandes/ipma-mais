import path from 'path';

export const PROJECT_ROOT = process.cwd();

export const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
export const MODELS_DIR = path.join(PROJECT_ROOT, 'models');

export const IPMA_BASE_URL = 'https://api.ipma.pt/open-data';
export const IPMA_EVAPOTRANSPIRATION_BASE_URL = path.join(
    IPMA_BASE_URL,
    '/observation/climate/evapotranspiration/'
);
