const RUN_MODES = ['live', 'dry-run', 'review-only'];

export function resolveRunMode(argv = process.argv.slice(2), env = process.env) {
    const modeArg = argv.find((value) => value.startsWith('--mode='));
    const cliMode = modeArg ? modeArg.split('=')[1] : null;
    const rawMode = cliMode || env.LEAD_SOURCER_MODE || 'live';
    const aliasMap = {
        dry: 'dry-run',
        dryrun: 'dry-run',
        review: 'review-only',
        reviewonly: 'review-only',
    };
    const mode = aliasMap[String(rawMode).trim().toLowerCase()] || String(rawMode).trim().toLowerCase();

    if (!RUN_MODES.includes(mode)) {
        throw new Error(`Invalid run mode: ${mode}. Expected one of: ${RUN_MODES.join(', ')}`);
    }

    return mode;
}

export function runModeFlags(mode) {
    return {
        shouldRelay: mode === 'live',
        shouldPersistSeen: mode !== 'dry-run',
        shouldLogReview: mode === 'review-only' || mode === 'dry-run' || mode === 'live',
    };
}