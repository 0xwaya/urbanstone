import { runInstall } from '../lib/install-app';

describe('install trigger', () => {
    it('calls the browser install prompt and nothing else', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const share = vi.fn();

        const started = await runInstall({ prompt });

        expect(started).toBe(true);
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(share).not.toHaveBeenCalled();
    });

    it('does not open a share sheet when the browser has no install prompt', async () => {
        const started = await runInstall(null);
        expect(started).toBe(false);
    });
});
