import minimist from 'minimist';

export function getTypeFromArgs() {
    const VALID_TYPES = ['evapotranspiration', 'temperature-max', 'temperature-min'];

    const args = minimist(process.argv.slice(2), {
        alias: { t: 'type' },
    });

    const type = args.type;

    if (!type || !VALID_TYPES.includes(type)) {
        console.error('❌ Invalid or missing -t/--type argument.');

        console.error('✅ Valid options are:');
        VALID_TYPES.forEach((type) => {
            console.error(`   • ${type}`);
        });

        process.exit(1);
    }

    console.log(`🔍 You selected type: ${type}`);
    return type;
}
