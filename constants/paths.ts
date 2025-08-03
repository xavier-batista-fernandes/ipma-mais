import path from 'path';

export const PROJECT_ROOT = process.cwd();

export const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
export const EVAPOTRANSPIRATION_DIR = path.join(PROJECT_ROOT, 'outputs/evapotranspiration');

export const INPUTS_DIR = path.join(PROJECT_ROOT, 'inputs');
export const MUNICIPALITIES_PATH = path.join(PROJECT_ROOT, 'inputs/municipalities.json');

export const IPMA_BASE_URL = 'https://api.ipma.pt/open-data';
export const IPMA_EVAPOTRANSPIRATION_BASE_URL = path.join(
    IPMA_BASE_URL,
    '/observation/climate/evapotranspiration/'
);
export const IPMA_TEMPERATURE_MAX_BASE_URL = path.join(
    IPMA_BASE_URL,
    '/observation/climate/temperature-max/'
);
export const IPMA_TEMPERATURE_MIN_BASE_URL = path.join(
    IPMA_BASE_URL,
    '/observation/climate/temperature-min/'
);
