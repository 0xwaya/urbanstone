import { captureInstallPrompt, runInstall } from '../lib/install-app';

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

    it('replays a captured install prompt to new subscribers and clears it when used', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
        const firstSubscriber = vi.fn();
        const unsubscribe = captureInstallPrompt(firstSubscriber);

        window.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(firstSubscriber).toHaveBeenLastCalledWith(event);
        unsubscribe();

        const nextSubscriber = vi.fn();
        const unsubscribeNext = captureInstallPrompt(nextSubscriber);
        expect(nextSubscriber).toHaveBeenCalledWith(event);

        await runInstall(event);

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(nextSubscriber).toHaveBeenLastCalledWith(null);
        const laterSubscriber = vi.fn();
        const unsubscribeLater = captureInstallPrompt(laterSubscriber);
        expect(laterSubscriber).not.toHaveBeenCalled();

        unsubscribeNext();
        unsubscribeLater();
    });
});
